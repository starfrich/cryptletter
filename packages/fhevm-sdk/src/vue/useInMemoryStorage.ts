/**
 * useInMemoryStorage - Vue composable for in-memory storage
 *
 * Provides a simple in-memory storage instance that can be used
 * for storing decryption signatures without persistence.
 */

import { ref, readonly, markRaw, type Ref } from 'vue'
import { GenericStringInMemoryStorage, type GenericStringStorage } from '../storage/GenericStringStorage'

export interface UseInMemoryStorageReturn {
  /** Storage instance */
  storage: Ref<GenericStringStorage>
}

/**
 * Create an in-memory storage instance for Vue
 *
 * Unlike React version which uses Context, Vue version simply
 * creates and returns a storage instance. Each call creates
 * a new isolated storage instance.
 *
 * @example
 * ```typescript
 * const { storage } = useInMemoryStorage()
 *
 * // Pass to useFHEDecrypt
 * const { decrypt } = useFHEDecrypt({
 *   // ... other params
 *   fhevmDecryptionSignatureStorage: storage.value,
 * })
 * ```
 */
export function useInMemoryStorage(): UseInMemoryStorageReturn {
  // Use markRaw to prevent Vue from wrapping the storage instance in a Proxy
  // This is necessary because the storage class uses private members which
  // don't work correctly when wrapped in a Vue Proxy
  const storage = ref<GenericStringStorage>(markRaw(new GenericStringInMemoryStorage()))

  return {
    storage: readonly(storage) as Ref<GenericStringStorage>,
  }
}
