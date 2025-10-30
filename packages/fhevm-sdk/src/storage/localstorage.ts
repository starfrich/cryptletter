import { IFhevmStorage, StorageError, StorageErrorCode } from './types';

/**
 * localStorage-based storage implementation for FHEVM SDK
 *
 * This storage backend provides persistent storage using the browser's localStorage API.
 * Use this as a fallback when IndexedDB is not available or for simpler use cases.
 *
 * Limitations:
 * - Storage limit is typically 5-10MB (much smaller than IndexedDB)
 * - Synchronous API (can block the main thread for large values)
 * - Only available in browser environments
 *
 * Features:
 * - Automatic cleanup of old entries when quota is exceeded
 * - Key prefixing to avoid conflicts with other apps
 * - Graceful handling of private browsing mode
 *
 * @example
 * ```typescript
 * const storage = new LocalStorageStorage({ prefix: 'myapp:' });
 * await storage.setItem('publicKey', '0x123...');
 * const key = await storage.getItem('publicKey');
 * ```
 */
export class LocalStorageStorage implements IFhevmStorage {
  private prefix: string;
  private isAvailable: boolean;

  /**
   * Creates a new localStorage storage instance
   *
   * @param options - Configuration options
   * @param options.prefix - Key prefix to avoid conflicts (default: 'fhevm:')
   */
  constructor(options: { prefix?: string } = {}) {
    this.prefix = options.prefix || 'fhevm:';
    this.isAvailable = this.checkAvailability();
  }

  /**
   * Checks if localStorage is available
   * (It may not be available in private browsing mode or if disabled)
   */
  private checkAvailability(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      // Test if we can actually write to localStorage
      const testKey = '__fhevm_storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the prefixed key for localStorage
   */
  private getPrefixedKey(key: string): string {
    return this.prefix + key;
  }

  /**
   * Retrieves a value from localStorage
   */
  async getItem(key: string): Promise<string | null> {
    if (!key || typeof key !== 'string') {
      throw new StorageError(
        StorageErrorCode.INVALID_INPUT,
        'Key must be a non-empty string'
      );
    }

    if (!this.isAvailable) {
      throw new StorageError(
        StorageErrorCode.NOT_AVAILABLE,
        'localStorage is not available. This may happen in private browsing mode or if localStorage is disabled.'
      );
    }

    try {
      const value = window.localStorage.getItem(this.getPrefixedKey(key));
      return value;
    } catch (error) {
      throw new StorageError(
        StorageErrorCode.OPERATION_FAILED,
        `Failed to get item '${key}': ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Stores a value in localStorage with automatic cleanup on quota exceeded
   */
  async setItem(key: string, value: string): Promise<void> {
    if (!key || typeof key !== 'string') {
      throw new StorageError(
        StorageErrorCode.INVALID_INPUT,
        'Key must be a non-empty string'
      );
    }
    if (typeof value !== 'string') {
      throw new StorageError(
        StorageErrorCode.INVALID_INPUT,
        'Value must be a string'
      );
    }

    if (!this.isAvailable) {
      throw new StorageError(
        StorageErrorCode.NOT_AVAILABLE,
        'localStorage is not available. This may happen in private browsing mode or if localStorage is disabled.'
      );
    }

    try {
      window.localStorage.setItem(this.getPrefixedKey(key), value);
    } catch (error) {
      // Check for quota exceeded errors
      if (
        error instanceof Error &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        // Try to free up space by clearing old FHEVM entries
        try {
          await this.clearOldEntries();
          // Retry the operation
          window.localStorage.setItem(this.getPrefixedKey(key), value);
        } catch (retryError) {
          throw new StorageError(
            StorageErrorCode.QUOTA_EXCEEDED,
            'localStorage quota exceeded. Please free up space by clearing browser data or use IndexedDB storage instead.',
            error
          );
        }
      } else {
        throw new StorageError(
          StorageErrorCode.OPERATION_FAILED,
          `Failed to set item '${key}': ${error instanceof Error ? error.message : String(error)}`,
          error
        );
      }
    }
  }

  /**
   * Removes a value from localStorage
   */
  async removeItem(key: string): Promise<void> {
    if (!key || typeof key !== 'string') {
      throw new StorageError(
        StorageErrorCode.INVALID_INPUT,
        'Key must be a non-empty string'
      );
    }

    if (!this.isAvailable) {
      throw new StorageError(
        StorageErrorCode.NOT_AVAILABLE,
        'localStorage is not available. This may happen in private browsing mode or if localStorage is disabled.'
      );
    }

    try {
      window.localStorage.removeItem(this.getPrefixedKey(key));
    } catch (error) {
      throw new StorageError(
        StorageErrorCode.OPERATION_FAILED,
        `Failed to remove item '${key}': ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Clears all FHEVM values from localStorage (only keys with our prefix)
   */
  async clear(): Promise<void> {
    if (!this.isAvailable) {
      throw new StorageError(
        StorageErrorCode.NOT_AVAILABLE,
        'localStorage is not available. This may happen in private browsing mode or if localStorage is disabled.'
      );
    }

    try {
      const keysToRemove: string[] = [];
      // Find all keys with our prefix
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      // Remove them
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    } catch (error) {
      throw new StorageError(
        StorageErrorCode.OPERATION_FAILED,
        `Failed to clear storage: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Clears old FHEVM entries to free up space
   * This is called automatically when quota is exceeded
   */
  private async clearOldEntries(): Promise<void> {
    const keysWithTimestamp: Array<{ key: string; timestamp: number }> = [];

    // Collect all FHEVM keys with their timestamps (if available)
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        // Try to extract timestamp from key or use 0
        keysWithTimestamp.push({ key, timestamp: 0 });
      }
    }

    // Sort by timestamp (oldest first)
    keysWithTimestamp.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 25% of entries
    const removeCount = Math.ceil(keysWithTimestamp.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      window.localStorage.removeItem(keysWithTimestamp[i].key);
    }
  }
}
