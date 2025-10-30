import { ref, computed, isRef, unref, type Ref, type ComputedRef } from "vue";
import type { FhevmInstance } from "../core/types";
import type { EncryptResult } from "../core/encryption";
import { FhevmError, FhevmErrorCode, getErrorMessage } from "../types/errors";
import type { RelayerEncryptedInput } from "@zama-fhe/relayer-sdk/web";
import type { GetAddressCallback } from "../types/callbacks";

// Re-export encryption utilities from core for convenience
export {
  type EncryptResult,
  getEncryptionMethod,
  toHex,
  buildParamsFromAbi,
  encryptValue,
  createEncryptedInput,
  isValidEncryptionValue,
} from "../core/encryption";

/**
 * Parameters for useFHEEncryption composable
 */
export interface UseFHEEncryptionParams {
  /** FHEVM instance for encryption operations */
  instance: Ref<FhevmInstance | undefined> | FhevmInstance | undefined;
  /** Callback for getting user address (framework-agnostic) */
  getAddress: Ref<GetAddressCallback | undefined> | GetAddressCallback | undefined;
  /** Contract address for encryption context */
  contractAddress: Ref<`0x${string}` | undefined> | `0x${string}` | undefined;
  /** Callback fired on successful encryption */
  onSuccess?: (result: EncryptResult) => void;
  /** Callback fired on encryption error */
  onError?: (error: Error) => void;
}

/**
 * Return type for useFHEEncryption composable
 */
export interface UseFHEEncryptionReturn {
  /** Whether encryption is possible (all dependencies ready) */
  canEncrypt: ComputedRef<boolean>;
  /** Encrypt values using a builder function */
  encryptWith: (buildFn: (builder: RelayerEncryptedInput) => void) => Promise<EncryptResult | undefined>;
  /** Encrypt multiple values in batch */
  encryptBatch: (buildFn: (builder: RelayerEncryptedInput) => void) => Promise<EncryptResult | undefined>;
  /** Current encryption state */
  isEncrypting: Ref<boolean>;
  /** Last encryption error */
  error: Ref<Error | undefined>;
  /** User-friendly error message */
  errorMessage: ComputedRef<string | undefined>;
}

/**
 * Vue composable for encrypting values for FHEVM contracts
 *
 * Provides encryption utilities with loading states and error handling.
 * Supports both single and batch encryption operations.
 *
 * @example
 * ```typescript
 * import { useFHEEncryption } from '@fhevm-sdk/vue';
 * import { ref } from 'vue';
 *
 * const instance = ref(fhevmInstance);
 * const ethersSigner = ref(signer);
 * const contractAddress = ref('0x123...');
 *
 * const { canEncrypt, encryptWith, isEncrypting } = useFHEEncryption({
 *   instance,
 *   ethersSigner,
 *   contractAddress,
 *   onSuccess: (result) => console.log('Encrypted:', result),
 *   onError: (error) => console.error('Encryption failed:', error)
 * });
 *
 * // Encrypt a single value
 * const encrypted = await encryptWith(builder => {
 *   builder.add32(42);
 * });
 * ```
 */
export const useFHEEncryption = (params: UseFHEEncryptionParams): UseFHEEncryptionReturn => {
  const { onSuccess, onError } = params;

  // Normalize inputs to refs - use isRef() and unref() from Vue for proper unwrapping
  const instanceRef = computed(() => {
    const val = params.instance;
    // Use Vue's isRef to properly check and unwrap
    return isRef(val) ? unref(val) : val;
  }) as ComputedRef<FhevmInstance | undefined>;

  const getAddressRef = computed(() => {
    const val = params.getAddress;
    return isRef(val) ? unref(val) : val;
  }) as ComputedRef<GetAddressCallback | undefined>;

  const contractAddressRef = computed(() => {
    const val = params.contractAddress;
    return isRef(val) ? unref(val) : val;
  }) as ComputedRef<`0x${string}` | undefined>;

  // State
  const isEncrypting = ref(false);
  const error = ref<Error | undefined>(undefined);

  // Computed values
  const canEncrypt = computed(
    () => Boolean(instanceRef.value && getAddressRef.value && contractAddressRef.value && !isEncrypting.value)
  );

  const errorMessage = computed(() => {
    return error.value ? getErrorMessage(error.value) : undefined;
  });

  // Encryption function
  const encryptWith = async (
    buildFn: (builder: RelayerEncryptedInput) => void
  ): Promise<EncryptResult | undefined> => {
    // Validation
    console.log('[useFHEEncryption] encryptWith called', {
      hasInstance: !!instanceRef.value,
      hasGetAddress: !!getAddressRef.value,
      hasContractAddress: !!contractAddressRef.value,
    });

    if (!instanceRef.value) {
      const err = new FhevmError(
        FhevmErrorCode.INSTANCE_NOT_READY,
        "FHEVM instance is not ready. Please wait for instance initialization."
      );
      error.value = err;
      if (onError) onError(err);
      console.error('[useFHEEncryption] Instance not ready');
      return undefined;
    }

    if (!getAddressRef.value) {
      const err = new FhevmError(
        FhevmErrorCode.MISSING_PARAMETER,
        "getAddress callback is required for encryption. Please connect your wallet."
      );
      error.value = err;
      if (onError) onError(err);
      console.error('[useFHEEncryption] getAddress callback missing');
      return undefined;
    }

    if (!contractAddressRef.value) {
      const err = new FhevmError(
        FhevmErrorCode.INVALID_ADDRESS,
        "Contract address is required for encryption."
      );
      error.value = err;
      if (onError) onError(err);
      console.error('[useFHEEncryption] Contract address missing');
      return undefined;
    }

    isEncrypting.value = true;
    error.value = undefined;

    try {
      console.log('[useFHEEncryption] Getting user address...');
      const userAddress = await getAddressRef.value();
      console.log('[useFHEEncryption] User address:', userAddress);

      console.log('[useFHEEncryption] Instance object:', instanceRef.value);
      console.log('[useFHEEncryption] Instance type:', typeof instanceRef.value);
      console.log('[useFHEEncryption] Instance has createEncryptedInput:', typeof instanceRef.value?.createEncryptedInput);
      console.log('[useFHEEncryption] Contract address:', contractAddressRef.value);

      console.log('[useFHEEncryption] Creating encrypted input...');
      const input = instanceRef.value!.createEncryptedInput(
        contractAddressRef.value!,
        userAddress
      ) as RelayerEncryptedInput;
      console.log('[useFHEEncryption] Encrypted input created:', input);

      // Call the builder function to add values
      console.log('[useFHEEncryption] Calling buildFn...');
      buildFn(input);
      console.log('[useFHEEncryption] buildFn completed');

      // Perform encryption
      console.log('[useFHEEncryption] Starting encryption...');
      const enc = await input.encrypt();
      console.log('[useFHEEncryption] Encryption result:', enc);

      isEncrypting.value = false;

      // Call success callback
      if (onSuccess) {
        try {
          onSuccess(enc);
        } catch (callbackError) {
          console.error("[useFHEEncryption] onSuccess callback error:", callbackError);
        }
      }

      return enc;
    } catch (e) {
      console.error('[useFHEEncryption] Encryption error caught:', e);
      const err = e instanceof Error ? e : new Error(String(e));
      const fhevmErr = new FhevmError(
        FhevmErrorCode.ENCRYPTION_FAILED,
        `Encryption failed: ${err.message}`,
        err
      );

      error.value = fhevmErr;
      isEncrypting.value = false;

      console.error('[useFHEEncryption] FhevmError created:', fhevmErr);

      // Call error callback
      if (onError) {
        try {
          onError(fhevmErr);
        } catch (callbackError) {
          console.error("[useFHEEncryption] onError callback error:", callbackError);
        }
      }

      return undefined;
    }
  };

  // Alias for batch encryption (same implementation for now)
  const encryptBatch = encryptWith;

  return {
    canEncrypt,
    encryptWith,
    encryptBatch,
    isEncrypting,
    error,
    errorMessage,
  };
};
