"use client";

import { useEffect, useState } from "react";
import type { IFhevmStorage, StorageType } from "../storage/types";
import {
  createStorage,
  createStorageWithFallback,
  IndexedDBStorage,
  LocalStorageStorage,
  MemoryStorage,
} from "../storage";

/**
 * React hook for creating and managing FHEVM storage
 *
 * This hook provides a convenient way to create storage instances for
 * storing FHEVM public keys and decryption signatures.
 *
 * @param options - Storage configuration
 * @param options.type - Storage type ('indexeddb', 'localstorage', 'memory', 'auto')
 * @param options.autoFallback - Automatically fall back to next available storage (default: true when type is 'auto')
 * @param options.dbName - IndexedDB database name (default: 'fhevm-storage')
 * @param options.storeName - IndexedDB store name (default: 'keyval')
 * @param options.prefix - localStorage key prefix (default: 'fhevm:')
 *
 * @returns Storage instance and metadata
 *
 * @example
 * ```tsx
 * // Automatically select best available storage
 * const { storage, storageType, isReady } = useStorage({ type: 'auto' });
 *
 * // Use IndexedDB explicitly
 * const { storage } = useStorage({ type: 'indexeddb' });
 *
 * // Use in-memory storage (for testing)
 * const { storage } = useStorage({ type: 'memory' });
 * ```
 */
export function useStorage(options?: {
  type?: StorageType | 'auto';
  autoFallback?: boolean;
  dbName?: string;
  storeName?: string;
  prefix?: string;
}) {
  const {
    type = 'auto',
    autoFallback = type === 'auto',
    dbName,
    storeName,
    prefix,
  } = options ?? {};

  const [storage, setStorage] = useState<IFhevmStorage | null>(null);
  const [storageType, setStorageType] = useState<StorageType | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initStorage = async () => {
      try {
        setIsReady(false);
        setError(null);

        let storageInstance: IFhevmStorage;
        let actualType: StorageType;

        if (type === 'auto' || autoFallback) {
          // Use automatic fallback
          storageInstance = await createStorageWithFallback({
            type: type === 'auto' ? 'indexeddb' : type,
            dbName,
            storeName,
            prefix,
          });

          // Detect which storage was actually used
          if (storageInstance instanceof IndexedDBStorage) {
            actualType = 'indexeddb';
          } else if (storageInstance instanceof LocalStorageStorage) {
            actualType = 'localstorage';
          } else if (storageInstance instanceof MemoryStorage) {
            actualType = 'memory';
          } else {
            actualType = 'custom';
          }
        } else {
          // Use explicit type
          storageInstance = createStorage({
            type: type as StorageType,
            dbName,
            storeName,
            prefix,
          });
          actualType = type as StorageType;
        }

        if (mounted) {
          setStorage(storageInstance);
          setStorageType(actualType);
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          // Fall back to memory storage on error
          setStorage(new MemoryStorage());
          setStorageType('memory');
          setIsReady(true);
        }
      }
    };

    initStorage();

    return () => {
      mounted = false;
    };
  }, [type, autoFallback, dbName, storeName, prefix]);

  return {
    /** Storage instance (null until initialized) */
    storage,
    /** The actual storage type being used */
    storageType,
    /** Whether storage is ready to use */
    isReady,
    /** Error that occurred during initialization (if any) */
    error,
  } as const;
}
