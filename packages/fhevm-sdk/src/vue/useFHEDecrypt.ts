import { ref, computed, watch, onUnmounted, unref, type Ref, type ComputedRef } from "vue";
import { FhevmDecryptionSignature } from "../FhevmDecryptionSignature.js";
import { GenericStringStorage } from "../storage/GenericStringStorage.js";
import type { FhevmInstance } from "../core/types";
import { FhevmError, FhevmErrorCode, getErrorMessage } from "../types/errors";
import {
  decryptBatch,
  getUniqueContractAddresses,
  type DecryptionRequest,
} from "../core/decryption";
import type { SignTypedDataCallback, GetAddressCallback } from "../types/callbacks";

// Re-export DecryptionRequest as FHEDecryptRequest for backward compatibility
export type FHEDecryptRequest = DecryptionRequest;

/**
 * Options for retry behavior in decryption
 */
export interface UseFHEDecryptRetryOptions {
  /** Maximum number of retry attempts (default: 2) */
  maxRetries?: number;
  /** Delay in milliseconds between retries (default: 1500ms) */
  retryDelay?: number;
}

/**
 * Parameters for useFHEDecrypt composable
 */
export interface UseFHEDecryptParams {
  /** FHEVM instance for decryption operations */
  instance: Ref<FhevmInstance | undefined> | FhevmInstance | undefined;
  /** Callback for signing EIP-712 typed data (framework-agnostic) */
  signTypedData: Ref<SignTypedDataCallback | undefined> | SignTypedDataCallback | undefined;
  /** Callback for getting user address (framework-agnostic) */
  getAddress: Ref<GetAddressCallback | undefined> | GetAddressCallback | undefined;
  /** Storage for caching decryption signatures */
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  /** Current chain ID */
  chainId: Ref<number | undefined> | number | undefined;
  /** Array of decryption requests (handles to decrypt) */
  requests: Ref<readonly FHEDecryptRequest[] | undefined> | readonly FHEDecryptRequest[] | undefined;
  /** Auto-decrypt when requests change (default: false) */
  autoDecrypt?: boolean;
  /** Retry options for failed decryptions */
  retry?: UseFHEDecryptRetryOptions | false;
  /** Callback fired on successful decryption */
  onSuccess?: (results: Record<string, string | bigint | boolean>) => void;
  /** Callback fired on decryption error */
  onError?: (error: Error) => void;
}

/**
 * Return type for useFHEDecrypt composable
 */
export interface UseFHEDecryptReturn {
  /** Whether decryption is possible */
  canDecrypt: ComputedRef<boolean>;
  /** Trigger decryption manually */
  decrypt: () => void;
  /** Whether decryption is in progress */
  isDecrypting: Ref<boolean>;
  /** Progress message */
  message: Ref<string>;
  /** Decryption results (handle -> decrypted value) */
  results: Ref<Record<string, string | bigint | boolean>>;
  /** Last decryption error */
  error: Ref<string | null>;
  /** User-friendly error message */
  errorMessage: ComputedRef<string | undefined>;
  /** Current retry attempt number */
  retryCount: Ref<number>;
}

/**
 * Vue composable for decrypting FHEVM handles
 *
 * Provides decryption utilities with automatic caching, retry logic,
 * and progress tracking.
 *
 * @example
 * ```typescript
 * import { useFHEDecrypt } from '@fhevm-sdk/vue';
 * import { ref } from 'vue';
 *
 * const instance = ref(fhevmInstance);
 * const signTypedData = ref(async (domain, types, message) => {
 *   return await signer.signTypedData(domain, types, message);
 * });
 * const getAddress = ref(async () => await signer.getAddress());
 * const chainId = ref(11155111);
 * const requests = ref([{ handle: '0x123...', contractAddress: '0xabc...' }]);
 *
 * const { canDecrypt, decrypt, isDecrypting, results } = useFHEDecrypt({
 *   instance,
 *   signTypedData,
 *   getAddress,
 *   fhevmDecryptionSignatureStorage,
 *   chainId,
 *   requests,
 *   autoDecrypt: true,
 *   retry: { maxRetries: 3, retryDelay: 2000 },
 *   onSuccess: (results) => console.log('Decrypted:', results),
 *   onError: (error) => console.error('Decryption failed:', error)
 * });
 * ```
 */
export const useFHEDecrypt = (params: UseFHEDecryptParams): UseFHEDecryptReturn => {
  const {
    fhevmDecryptionSignatureStorage,
    autoDecrypt = false,
    retry = { maxRetries: 2, retryDelay: 1500 },
    onSuccess,
    onError,
  } = params;

  // Normalize inputs to reactive refs, unwrapping Vue refs/computed where needed
  const instanceRef = computed(() => unref(params.instance)) as unknown as Ref<FhevmInstance | undefined>;
  const signTypedDataRef = computed(() => unref(params.signTypedData)) as unknown as Ref<SignTypedDataCallback | undefined>;
  const getAddressRef = computed(() => unref(params.getAddress)) as unknown as Ref<GetAddressCallback | undefined>;
  const chainIdRef = computed(() => unref(params.chainId)) as unknown as Ref<number | undefined>;
  const requestsRef = computed(() => unref(params.requests)) as unknown as Ref<readonly FHEDecryptRequest[] | undefined>;

  // Retry configuration
  const retryConfig = retry === false ? null : {
    maxRetries: retry?.maxRetries ?? 2,
    retryDelay: retry?.retryDelay ?? 5000,
  };

  // State
  const isDecrypting = ref(false);
  const message = ref("");
  const results = ref<Record<string, string | bigint | boolean>>({});
  const error = ref<string | null>(null);
  const retryCount = ref(0);

  // Computed error message
  const errorMessage = computed(() => {
    if (!error.value) return undefined;
    // Parse error string to extract FHEVM error if possible
    try {
      const parts = error.value.split(': ');
      if (parts.length > 1) {
        return parts.slice(1).join(': ');
      }
      return error.value;
    } catch {
      return error.value;
    }
  });

  // Internal refs for tracking state
  let lastRequestsKey = "";
  let retryTimeout: NodeJS.Timeout | null = null;

  // Compute requests key for change detection
  const requestsKey = computed(() => {
    if (!requestsRef.value || requestsRef.value.length === 0) return "";
    const sorted = [...requestsRef.value].sort((a, b) =>
      (a.handle + a.contractAddress).localeCompare(b.handle + b.contractAddress),
    );
    return JSON.stringify(sorted);
  });

  // Computed canDecrypt
  const canDecrypt = computed(() => {
    return Boolean(
      instanceRef.value &&
      signTypedDataRef.value &&
      getAddressRef.value &&
      requestsRef.value &&
      requestsRef.value.length > 0 &&
      !isDecrypting.value
    );
  });

  // Main decrypt function
  const performDecrypt = async (attemptNumber: number = 0): Promise<void> => {
    if (isDecrypting.value && attemptNumber === 0) return;
    if (!instanceRef.value || !signTypedDataRef.value || !getAddressRef.value || !requestsRef.value || requestsRef.value.length === 0) return;

    const thisChainId = chainIdRef.value;
    const thisSignTypedData = signTypedDataRef.value;
    const thisGetAddress = getAddressRef.value;
    const thisRequests = requestsRef.value;
    const thisRequestsKey = requestsKey.value;

    // Capture the current requests key on first attempt
    if (attemptNumber === 0) {
      lastRequestsKey = thisRequestsKey;
    }

    isDecrypting.value = true;
    message.value = attemptNumber > 0 ? `Retrying decryption (attempt ${attemptNumber + 1})...` : "Start decrypt";
    error.value = null;

    if (attemptNumber > 0) {
      retryCount.value = attemptNumber;
    }

    try {
      // Check if request is stale
      const isStale = () =>
        thisChainId !== chainIdRef.value ||
        thisSignTypedData !== signTypedDataRef.value ||
        thisGetAddress !== getAddressRef.value ||
        thisRequestsKey !== lastRequestsKey;

      // Use core utility to get unique addresses
      const uniqueAddresses = getUniqueContractAddresses(thisRequests);

      const sig: FhevmDecryptionSignature | null = await FhevmDecryptionSignature.loadOrSign(
        instanceRef.value,
        uniqueAddresses,
        thisSignTypedData,
        thisGetAddress,
        fhevmDecryptionSignatureStorage,
      );

      if (!sig) {
        const err = new FhevmError(
          FhevmErrorCode.SIGNATURE_FAILED,
          "Failed to create decryption signature. Please try again."
        );
        throw err;
      }

      if (isStale()) {
        message.value = "Decryption cancelled (stale request)";
        isDecrypting.value = false;
        retryCount.value = 0;
        return;
      }

      // Use core decryption utility
      const decryptionResult = await decryptBatch({
        instance: instanceRef.value,
        requests: thisRequests,
        signature: {
          publicKey: sig.publicKey,
          privateKey: sig.privateKey,
          signature: sig.signature,
          contractAddresses: sig.contractAddresses,
          userAddress: sig.userAddress,
          startTimestamp: sig.startTimestamp,
          durationDays: sig.durationDays,
        },
        onProgress: (msg) => { message.value = msg; },
      });

      if (!decryptionResult.success) {
        const err = new FhevmError(
          FhevmErrorCode.DECRYPTION_FAILED,
          `Decryption failed: ${decryptionResult.error}`
        );
        throw err;
      }

      if (isStale()) {
        message.value = "Decryption cancelled (stale request)";
        isDecrypting.value = false;
        retryCount.value = 0;
        return;
      }

      // Success!
      results.value = decryptionResult.results;
      message.value = "Decryption completed successfully";
      error.value = null;
      retryCount.value = 0;
      isDecrypting.value = false; // Set to false on success
      lastRequestsKey = requestsKey.value; // Update last request key

      // Call success callback
      if (onSuccess) {
        try {
          onSuccess(decryptionResult.results);
        } catch (callbackError) {
          console.error("[useFHEDecrypt] onSuccess callback error:", callbackError);
        }
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));

      const thisChainId2 = chainIdRef.value;
      const thisSignTypedData2 = signTypedDataRef.value;
      const thisGetAddress2 = getAddressRef.value;
      const thisRequestsKey2 = requestsKey.value;

      const isStale2 = () =>
        thisChainId2 !== chainIdRef.value ||
        thisSignTypedData2 !== signTypedDataRef.value ||
        thisGetAddress2 !== getAddressRef.value ||
        thisRequestsKey2 !== lastRequestsKey;

      if (isStale2()) {
        message.value = "Decryption cancelled (stale request)";
        isDecrypting.value = false;
        retryCount.value = 0;
        return;
      }

      // Check if we should retry
      const shouldRetry = retryConfig && attemptNumber < retryConfig.maxRetries;

      if (shouldRetry) {
        const nextAttempt = attemptNumber + 1;
        const delay = retryConfig!.retryDelay;

        console.log(`[useFHEDecrypt] Retry attempt ${nextAttempt}/${retryConfig!.maxRetries} after ${delay}ms`);
        message.value = `Decryption failed, retrying in ${delay / 1000}s...`;

        // Keep isDecrypting = true during retry delay
        retryTimeout = setTimeout(() => {
          if (!isStale2()) {
            performDecrypt(nextAttempt);
          } else {
            isDecrypting.value = false;
          }
        }, delay);
        return;
      }

      // Final error - no more retries
      const fhevmErr = err instanceof FhevmError ? err : new FhevmError(
        FhevmErrorCode.DECRYPTION_FAILED,
        `Decryption failed: ${err.message}`,
        err
      );

      const code = fhevmErr.code || "UNKNOWN_ERROR";
      const msg = fhevmErr.message;

      error.value = `${code}: ${msg}`;
      message.value = "FHEVM decryption failed";
      retryCount.value = 0;

      // Call error callback
      if (onError) {
        try {
          onError(fhevmErr);
        } catch (callbackError) {
          console.error("[useFHEDecrypt] onError callback error:", callbackError);
        }
      }

      // Set to false only if final error (no retry)
      isDecrypting.value = false;
      lastRequestsKey = requestsKey.value; // Update last request key on final error
    }
    // Note: no finally block - isDecrypting is managed explicitly in success/retry/error paths
  };

  // Auto-decrypt when requests change
  watch(
    requestsKey,
    (newKey, oldKey) => {
      if (autoDecrypt && canDecrypt.value && newKey !== oldKey && newKey !== lastRequestsKey) {
        performDecrypt(0);
      }
    }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
  });

  return {
    canDecrypt,
    decrypt: () => performDecrypt(0),
    isDecrypting,
    message,
    results,
    error,
    errorMessage,
    retryCount,
  };
};
