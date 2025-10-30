import { openDB, type IDBPDatabase } from 'idb';
import { IFhevmStorage, StorageError, StorageErrorCode } from './types';

/**
 * IndexedDB-based storage implementation for FHEVM SDK
 *
 * This storage backend provides persistent storage in the browser using IndexedDB.
 * It's the recommended storage option for production use as it:
 * - Has much larger storage limits than localStorage (typically 50MB+)
 * - Supports async operations without blocking the main thread
 * - Is available in all modern browsers
 *
 * @example
 * ```typescript
 * const storage = new IndexedDBStorage({ dbName: 'my-fhevm-app' });
 * await storage.setItem('publicKey', '0x123...');
 * const key = await storage.getItem('publicKey');
 * ```
 */
export class IndexedDBStorage implements IFhevmStorage {
  private dbName: string;
  private storeName: string;
  private dbPromise: Promise<IDBPDatabase> | null = null;

  /**
   * Creates a new IndexedDB storage instance
   *
   * @param options - Configuration options
   * @param options.dbName - Database name (default: 'fhevm-storage')
   * @param options.storeName - Object store name (default: 'keyval')
   */
  constructor(options: { dbName?: string; storeName?: string } = {}) {
    this.dbName = options.dbName || 'fhevm-storage';
    this.storeName = options.storeName || 'keyval';
  }

  /**
   * Gets or creates the IndexedDB database connection
   */
  private async getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = this.initDB();
    }
    return this.dbPromise;
  }

  /**
   * Initializes the IndexedDB database
   */
  private async initDB(): Promise<IDBPDatabase> {
    try {
      const storeName = this.storeName;
      return await openDB(this.dbName, 1, {
        upgrade(db) {
          // Create object store if it doesn't exist
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        },
      });
    } catch (error) {
      // Check if IndexedDB is available
      if (
        error instanceof Error &&
        (error.name === 'SecurityError' || error.name === 'InvalidStateError')
      ) {
        throw new StorageError(
          StorageErrorCode.NOT_AVAILABLE,
          'IndexedDB is not available. This may happen in private browsing mode or if IndexedDB is disabled.',
          error
        );
      }
      throw new StorageError(
        StorageErrorCode.OPERATION_FAILED,
        `Failed to initialize IndexedDB: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Retrieves a value from IndexedDB
   */
  async getItem(key: string): Promise<string | null> {
    if (!key || typeof key !== 'string') {
      throw new StorageError(
        StorageErrorCode.INVALID_INPUT,
        'Key must be a non-empty string'
      );
    }

    try {
      const db = await this.getDB();
      const value = await db.get(this.storeName, key);
      return value !== undefined ? (value as string) : null;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorCode.OPERATION_FAILED,
        `Failed to get item '${key}': ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Stores a value in IndexedDB
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

    try {
      const db = await this.getDB();
      await db.put(this.storeName, value, key);
    } catch (error) {
      // Check for quota exceeded errors
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageError(
          StorageErrorCode.QUOTA_EXCEEDED,
          'Storage quota exceeded. Please free up space by clearing old data.',
          error
        );
      }
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorCode.OPERATION_FAILED,
        `Failed to set item '${key}': ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Removes a value from IndexedDB
   */
  async removeItem(key: string): Promise<void> {
    if (!key || typeof key !== 'string') {
      throw new StorageError(
        StorageErrorCode.INVALID_INPUT,
        'Key must be a non-empty string'
      );
    }

    try {
      const db = await this.getDB();
      await db.delete(this.storeName, key);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorCode.OPERATION_FAILED,
        `Failed to remove item '${key}': ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Clears all values from IndexedDB
   */
  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      await db.clear(this.storeName);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorCode.OPERATION_FAILED,
        `Failed to clear storage: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }
}
