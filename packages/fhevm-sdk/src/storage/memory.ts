import { IFhevmStorage, StorageError, StorageErrorCode } from './types';

/**
 * In-memory storage implementation for FHEVM SDK
 *
 * This storage backend stores data in memory using a Map. Data is lost when:
 * - The page is refreshed
 * - The browser tab is closed
 * - The component/instance is destroyed
 *
 * Use cases:
 * - Testing and development
 * - Node.js environments (where browser storage is not available)
 * - Temporary data that doesn't need persistence
 * - Isolated storage per instance (not shared across tabs/windows)
 *
 * @example
 * ```typescript
 * const storage = new MemoryStorage();
 * await storage.setItem('publicKey', '0x123...');
 * const key = await storage.getItem('publicKey');
 * ```
 */
export class MemoryStorage implements IFhevmStorage {
  private store: Map<string, string>;

  /**
   * Creates a new in-memory storage instance
   *
   * @param initialData - Optional initial data to populate the storage
   */
  constructor(initialData?: Record<string, string>) {
    this.store = new Map();
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        this.store.set(key, value);
      });
    }
  }

  /**
   * Retrieves a value from memory
   */
  async getItem(key: string): Promise<string | null> {
    if (!key || typeof key !== 'string') {
      throw new StorageError(
        StorageErrorCode.INVALID_INPUT,
        'Key must be a non-empty string'
      );
    }

    return this.store.get(key) ?? null;
  }

  /**
   * Stores a value in memory
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

    this.store.set(key, value);
  }

  /**
   * Removes a value from memory
   */
  async removeItem(key: string): Promise<void> {
    if (!key || typeof key !== 'string') {
      throw new StorageError(
        StorageErrorCode.INVALID_INPUT,
        'Key must be a non-empty string'
      );
    }

    this.store.delete(key);
  }

  /**
   * Clears all values from memory
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Gets the number of items in storage
   * (Utility method not part of IFhevmStorage interface)
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Gets all keys in storage
   * (Utility method not part of IFhevmStorage interface)
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Gets all values in storage
   * (Utility method not part of IFhevmStorage interface)
   */
  values(): string[] {
    return Array.from(this.store.values());
  }

  /**
   * Gets all entries in storage
   * (Utility method not part of IFhevmStorage interface)
   */
  entries(): Array<[string, string]> {
    return Array.from(this.store.entries());
  }

  /**
   * Exports storage data as a plain object
   * (Utility method not part of IFhevmStorage interface)
   */
  toJSON(): Record<string, string> {
    return Object.fromEntries(this.store.entries());
  }
}
