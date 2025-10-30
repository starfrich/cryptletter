/**
 * FHEVM SDK - Vue 3 Adapter
 *
 * This module provides Vue 3 Composition API composables for working with FHEVM.
 * All composables are designed to work seamlessly with Vue's reactivity system.
 *
 * @module @fhevm-sdk/vue
 *
 * @example
 * ```typescript
 * // Import composables
 * import { useFhevm, useFHEEncryption, useFHEDecrypt } from '@fhevm-sdk/vue';
 * import { ref } from 'vue';
 *
 * // Use in your component
 * const provider = ref(window.ethereum);
 * const chainId = ref(11155111);
 *
 * const { instance, status, error } = useFhevm({
 *   provider,
 *   chainId,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using the plugin for global FHEVM instance
 * import { createApp } from 'vue';
 * import { FhevmPlugin } from '@fhevm-sdk/vue';
 * import App from './App.vue';
 *
 * const app = createApp(App);
 * app.use(FhevmPlugin, {
 *   provider: window.ethereum,
 *   onSuccess: (instance) => console.log('FHEVM ready!')
 * });
 * app.mount('#app');
 * ```
 */

// Export composables
export {
  useFhevm,
  type UseFhevmParams,
  type UseFhevmReturn,
  type UseFhevmRetryOptions,
  type FhevmStatus,
} from "./useFhevm";

export {
  useFHEEncryption,
  type UseFHEEncryptionParams,
  type UseFHEEncryptionReturn,
  // Re-export encryption utilities
  type EncryptResult,
  getEncryptionMethod,
  toHex,
  buildParamsFromAbi,
  encryptValue,
  createEncryptedInput,
  isValidEncryptionValue,
} from "./useFHEEncryption";

export {
  useFHEDecrypt,
  type UseFHEDecryptParams,
  type UseFHEDecryptReturn,
  type UseFHEDecryptRetryOptions,
  type FHEDecryptRequest,
} from "./useFHEDecrypt";

// Export plugin
export {
  FhevmPlugin,
  FhevmInjectionKey,
  type FhevmPluginOptions,
} from "./FhevmPlugin";

// Re-export core types for convenience
export type {
  FhevmInstance,
  FhevmInstanceConfig,
  CreateFhevmInstanceParams,
} from "../core/types";

// Re-export error types
export {
  FhevmError,
  FhevmAbortError,
  FhevmErrorCode,
  getErrorMessage,
} from "../types/errors";

// Re-export storage types and Vue composables
export type { GenericStringStorage } from "../storage/GenericStringStorage";
export type { IFhevmStorage } from "../types/storage";
export { useInMemoryStorage, type UseInMemoryStorageReturn } from "./useInMemoryStorage";
