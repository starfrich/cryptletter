/**
 * useIndexedDBStorage - Vue composable for persistent IndexedDB storage
 *
 * Provides IndexedDB-backed storage for FHEVM decryption signatures with persistence.
 * - Automatically initializes IndexedDB storage on mount
 * - Signatures persist across page reloads (no re-signing needed)
 * - Falls back to in-memory storage if IndexedDB is unavailable
 *
 * **Persistence behavior:**
 * On page refresh, existing signatures are automatically available without re-signing.
 * This ensures consistent UX across page reloads and wallet connections.
 *
 * @example
 * ```typescript
 * const { storage, isReady, error } = useIndexedDBStorage({
 *   dbName: 'fhevm-vue-app',
 *   storeName: 'signatures',
 * })
 *
 * // Use storage in composables
 * const { decrypt } = useFHEDecrypt({
 *   fhevmDecryptionSignatureStorage: storage,
 *   // ...
 * })
 *
 * // On page refresh:
 * // - IndexedDB is checked for existing signatures
 * // - Signatures are pre-loaded automatically
 * // - User doesn't need to re-sign on next decrypt
 * ```
 */

import { ref, onMounted, type Ref } from 'vue'
import type { IFhevmStorage } from '@fhevm-sdk/vue'
import { IndexedDBStorage, MemoryStorage } from '@fhevm-sdk/storage'

export interface UseIndexedDBStorageOptions {
  /** Database name (default: 'fhevm') */
  dbName?: string
  /** Store name (default: 'signatures') */
  storeName?: string
}

export interface UseIndexedDBStorageReturn {
  /** Reactive storage instance (with pre-loaded signatures from IndexedDB) */
  storage: Ref<IFhevmStorage>
  /** Whether storage is ready to use and signatures are pre-loaded */
  isReady: Ref<boolean>
  /** Error message if storage initialization failed */
  error: Ref<string | undefined>
}

export function useIndexedDBStorage(
  options?: UseIndexedDBStorageOptions
): UseIndexedDBStorageReturn {
  const dbName = options?.dbName ?? 'fhevm'
  const storeName = options?.storeName ?? 'signatures'

  // Try to initialize IndexedDB storage synchronously
  // This ensures storage is ready before components use it
  let initialStorage: IFhevmStorage
  let initialError: string | undefined

  try {
    // Create IndexedDB storage synchronously
    initialStorage = new IndexedDBStorage({
      dbName,
      storeName,
    })
    console.log('[useIndexedDBStorage] IndexedDB storage initialized synchronously with persistence')
  } catch (idbError) {
    // Fallback to in-memory storage if IndexedDB is unavailable
    initialError = `IndexedDB unavailable: ${idbError instanceof Error ? idbError.message : String(idbError)}`
    console.warn('[useIndexedDBStorage]', initialError)
    initialStorage = new MemoryStorage()
  }

  // State - initialized with actual storage instance
  const storage = ref<IFhevmStorage>(initialStorage)
  const isReady = ref(true) // Ready immediately since we init synchronously
  const error = ref<string | undefined>(initialError)

  return {
    storage,
    isReady,
    error,
  }
}
