/**
 * Storage Types
 *
 * This module defines interfaces and types for the FHEVM SDK storage layer.
 * The storage layer provides async key-value storage for FHEVM public keys,
 * decryption signatures, and other persistent data.
 *
 * @module types/storage
 */

// ============================================================================
// Storage Interface
// ============================================================================

/**
 * Generic async storage interface for FHEVM SDK
 *
 * This interface provides key-value storage that works across different
 * backends (IndexedDB, localStorage, memory, custom implementations).
 *
 * All operations are async to support both synchronous (localStorage, memory)
 * and asynchronous (IndexedDB) storage backends.
 *
 * @example
 * ```typescript
 * const storage: IFhevmStorage = createIndexedDBStorage();
 * await storage.setItem('key', 'value');
 * const value = await storage.getItem('key');
 * ```
 */
export interface IFhevmStorage {
  /**
   * Retrieves a value from storage
   * @param key - The key to retrieve
   * @returns The value if found, null otherwise
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Stores a value in storage
   * @param key - The key to store under
   * @param value - The value to store
   * @throws {StorageError} If storage quota is exceeded or operation fails
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * Removes a value from storage
   * @param key - The key to remove
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clears all values from storage
   */
  clear(): Promise<void>;
}

// ============================================================================
// Legacy Storage Interface (for backward compatibility)
// ============================================================================

/**
 * Legacy synchronous storage interface
 * @deprecated Use IFhevmStorage instead for better cross-platform support
 */
export interface GenericStringStorage {
  /**
   * Get item from storage (supports both sync and async)
   */
  getItem(key: string): string | Promise<string | null> | null;

  /**
   * Set item in storage (supports both sync and async)
   */
  setItem(key: string, value: string): void | Promise<void>;

  /**
   * Remove item from storage (supports both sync and async)
   */
  removeItem(key: string): void | Promise<void>;
}

// ============================================================================
// Storage Configuration Types
// ============================================================================

/**
 * Storage adapter types supported by the SDK
 */
export type StorageType = "indexeddb" | "localstorage" | "memory" | "custom";

/**
 * Configuration options for storage creation
 *
 * @example
 * ```typescript
 * // IndexedDB storage
 * const options: StorageOptions = {
 *   type: 'indexeddb',
 *   dbName: 'my-app-fhevm',
 *   storeName: 'keys'
 * };
 *
 * // Custom storage
 * const options: StorageOptions = {
 *   type: 'custom',
 *   custom: myCustomStorage
 * };
 * ```
 */
export interface StorageOptions {
  /**
   * Storage type to use
   */
  type: StorageType;

  /**
   * Custom storage implementation (required when type is 'custom')
   */
  custom?: IFhevmStorage;

  /**
   * Database name for IndexedDB
   * @default 'fhevm-storage'
   */
  dbName?: string;

  /**
   * Store name for IndexedDB
   * @default 'keyval'
   */
  storeName?: string;

  /**
   * Key prefix for localStorage
   * @default 'fhevm:'
   */
  prefix?: string;
}

// ============================================================================
// Storage Factory Type
// ============================================================================

/**
 * Factory function type for creating storage instances
 */
export type StorageFactory = (options?: Partial<StorageOptions>) => IFhevmStorage;
