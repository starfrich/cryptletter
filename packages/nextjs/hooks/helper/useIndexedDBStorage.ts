/**
 * useIndexedDBStorage Hook
 *
 * Custom React hook for using IndexedDB storage in Next.js apps.
 * This provides persistent storage for FHEVM decryption signatures,
 * so users don't need to re-sign after page refresh.
 *
 * @example
 * ```tsx
 * const { storage } = useIndexedDBStorage();
 *
 * const fheCounter = useFHECounterWagmi({
 *   instance: fhevmInstance,
 *   storage, // Use IndexedDB instead of in-memory
 * });
 * ```
 */

import { useEffect, useState } from "react";
import { createStorage, type IFhevmStorage } from "@fhevm-sdk";
import { startPerformanceTimer, logDebug, logWarn, logError } from "~/lib/utils";

export function useIndexedDBStorage(options?: {
  dbName?: string;
  storeName?: string;
}) {
  const [storage, setStorage] = useState<IFhevmStorage | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const initStorage = async () => {
      const timer = startPerformanceTimer("storage_init");
      try {
        logDebug("Initializing IndexedDB storage...");
        // Create IndexedDB storage
        const indexedDBStorage = createStorage({
          type: "indexeddb",
          dbName: options?.dbName || "fhevm-storage",
          storeName: options?.storeName || "keyval",
        });

        // Test if storage works (some browsers block IndexedDB in private mode)
        await indexedDBStorage.setItem("__test__", "test");
        await indexedDBStorage.removeItem("__test__");

        if (mounted) {
          const duration = timer();
          logDebug(`IndexedDB storage initialized in ${duration}ms`);
          setStorage(indexedDBStorage);
          setIsReady(true);
          setError(undefined);
        }
      } catch (err) {
        logError("Failed to initialize IndexedDB storage", err);

        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));

          // Fallback to localStorage
          try {
            logWarn("Falling back to localStorage...");
            const localStorageStorage = createStorage({
              type: "localstorage",
              prefix: options?.dbName ? `${options.dbName}:` : "fhevm:",
            });

            setStorage(localStorageStorage);
            setIsReady(true);
            logDebug("localStorage initialized successfully");
          } catch (fallbackErr) {
            logError("Fallback to localStorage also failed", fallbackErr);

            // Last resort: memory storage
            logWarn("Using in-memory storage as last resort");
            const memoryStorage = createStorage({ type: "memory" });
            setStorage(memoryStorage);
            setIsReady(true);
            logDebug("In-memory storage initialized");
          }
        }
      }
    };

    initStorage();

    return () => {
      mounted = false;
    };
  }, [options?.dbName, options?.storeName]);

  return {
    storage,
    isReady,
    error,
  };
}
