// Export all storage types and interfaces
export * from './types';
export * from './indexeddb';
export * from './localstorage';
export * from './memory';

// Export the old GenericStringStorage for backward compatibility
// Note: Implementation is in GenericStringStorage.ts, interface is in types.ts
export { GenericStringInMemoryStorage } from './GenericStringStorage';

import { IndexedDBStorage } from './indexeddb';
import { LocalStorageStorage } from './localstorage';
import { MemoryStorage } from './memory';
import type { IFhevmStorage, StorageOptions, StorageType } from './types';
import { StorageError, StorageErrorCode } from './types';

/**
 * Creates a storage instance based on the provided options
 *
 * This factory function provides a convenient way to create storage instances
 * with automatic fallback and validation.
 *
 * @param options - Storage configuration options
 * @returns A storage instance implementing IFhevmStorage
 *
 * @example
 * ```typescript
 * // Use IndexedDB (recommended for production)
 * const storage = createStorage({ type: 'indexeddb' });
 *
 * // Use localStorage as fallback
 * const storage = createStorage({ type: 'localstorage' });
 *
 * // Use in-memory storage (for testing)
 * const storage = createStorage({ type: 'memory' });
 *
 * // Use custom storage implementation
 * const customStorage = new MyCustomStorage();
 * const storage = createStorage({ type: 'custom', custom: customStorage });
 * ```
 */
export function createStorage(options: StorageOptions): IFhevmStorage;
export function createStorage(type: StorageType, custom?: IFhevmStorage): IFhevmStorage;
export function createStorage(
  optionsOrType: StorageOptions | StorageType,
  customStorage?: IFhevmStorage
): IFhevmStorage {
  // Handle both function signatures
  const options: StorageOptions =
    typeof optionsOrType === 'string'
      ? { type: optionsOrType, custom: customStorage }
      : optionsOrType;

  const { type, custom, dbName, storeName, prefix } = options;

  switch (type) {
    case 'indexeddb':
      return new IndexedDBStorage({ dbName, storeName });

    case 'localstorage':
      return new LocalStorageStorage({ prefix });

    case 'memory':
      return new MemoryStorage();

    case 'custom':
      if (!custom) {
        throw new StorageError(
          StorageErrorCode.INVALID_INPUT,
          'Custom storage implementation must be provided when type is "custom"'
        );
      }
      return custom;

    default:
      throw new StorageError(
        StorageErrorCode.INVALID_INPUT,
        `Invalid storage type: ${type}. Must be one of: 'indexeddb', 'localstorage', 'memory', 'custom'`
      );
  }
}

/**
 * Creates a storage instance with automatic fallback
 *
 * This function tries to create storage in the following order:
 * 1. IndexedDB (best for production)
 * 2. localStorage (fallback if IndexedDB fails)
 * 3. Memory storage (last resort)
 *
 * @param options - Optional storage configuration
 * @returns A storage instance implementing IFhevmStorage
 *
 * @example
 * ```typescript
 * // Automatically picks the best available storage
 * const storage = await createStorageWithFallback();
 * ```
 */
export async function createStorageWithFallback(
  options?: Partial<StorageOptions>
): Promise<IFhevmStorage> {
  // Try IndexedDB first
  try {
    const storage = createStorage({ type: 'indexeddb', ...options });
    // Test if it works
    await storage.setItem('__test__', 'test');
    await storage.removeItem('__test__');
    return storage;
  } catch (error) {
    console.warn('IndexedDB not available, falling back to localStorage:', error);
  }

  // Try localStorage second
  try {
    const storage = createStorage({ type: 'localstorage', ...options });
    // Test if it works
    await storage.setItem('__test__', 'test');
    await storage.removeItem('__test__');
    return storage;
  } catch (error) {
    console.warn('localStorage not available, falling back to memory storage:', error);
  }

  // Fall back to memory storage
  return createStorage({ type: 'memory', ...options });
}

/**
 * Detects the best available storage type for the current environment
 *
 * @returns The recommended storage type
 *
 * @example
 * ```typescript
 * const storageType = await detectStorageType();
 * const storage = createStorage({ type: storageType });
 * ```
 */
export async function detectStorageType(): Promise<Exclude<StorageType, 'custom'>> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'memory';
  }

  // Try IndexedDB
  try {
    const storage = new IndexedDBStorage();
    await storage.setItem('__test__', 'test');
    await storage.removeItem('__test__');
    return 'indexeddb';
  } catch {
    // IndexedDB not available
  }

  // Try localStorage
  try {
    const storage = new LocalStorageStorage();
    await storage.setItem('__test__', 'test');
    await storage.removeItem('__test__');
    return 'localstorage';
  } catch {
    // localStorage not available
  }

  // Fall back to memory
  return 'memory';
}
