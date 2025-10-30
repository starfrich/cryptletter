import { ref, computed, watch, onUnmounted, shallowRef, markRaw, type Ref, type ComputedRef } from "vue";
import type { FhevmInstance } from "../core/types";
import { createFhevmInstance, FhevmError, FhevmAbortError } from "../core/instance";
import { FhevmErrorCode, getErrorMessage } from "../types/errors";
import { ethers } from "ethers";

/**
 * FHEVM instance status
 *
 * - `idle`: No instance creation in progress, waiting for provider
 * - `loading`: Creating FHEVM instance
 * - `ready`: Instance successfully created and ready to use
 * - `error`: Instance creation failed
 */
export type FhevmStatus = "idle" | "loading" | "ready" | "error";

/**
 * Options for retry behavior
 */
export interface UseFhevmRetryOptions {
  /** Maximum number of retry attempts (default: 0 - no retry) */
  maxRetries?: number;
  /** Delay in milliseconds between retries (default: 1000ms) */
  retryDelay?: number;
  /** Exponential backoff multiplier (default: 2) */
  retryBackoff?: number;
  /** Only retry on specific error codes (default: all network errors) */
  retryOnErrorCodes?: FhevmErrorCode[];
}

/**
 * Parameters for useFhevm composable
 */
export interface UseFhevmParams {
  /** Ethereum provider (EIP-1193) or RPC URL */
  provider: Ref<string | ethers.Eip1193Provider | undefined> | string | ethers.Eip1193Provider | undefined;
  /** Chain ID to connect to */
  chainId: Ref<number | undefined> | number | undefined;
  /** Enable/disable instance creation (default: true) */
  enabled?: Ref<boolean> | boolean;
  /** Mock chain configurations for local testing */
  initialMockChains?: Readonly<Record<number, string>>;
  /** Retry options for failed instance creation */
  retry?: UseFhevmRetryOptions | false;
  /** Callback fired when instance is successfully created */
  onSuccess?: (instance: FhevmInstance) => void;
  /** Callback fired when instance creation fails */
  onError?: (error: Error) => void;
}

/**
 * Return type for useFhevm composable
 */
export interface UseFhevmReturn {
  /** FHEVM instance (undefined if not ready) */
  instance: Ref<FhevmInstance | undefined>;
  /** Manual refresh function to recreate instance */
  refresh: () => void;
  /** Error object if creation failed */
  error: Ref<Error | undefined>;
  /** Current status of instance creation */
  status: Ref<FhevmStatus>;
  /** User-friendly error message */
  errorMessage: ComputedRef<string | undefined>;
  /** Current retry attempt number (0 if not retrying) */
  retryCount: Ref<number>;
}

/**
 * Vue composable to create and manage FHEVM instance
 *
 * @example
 * ```typescript
 * import { useFhevm } from '@fhevm-sdk/vue';
 * import { ref } from 'vue';
 *
 * const provider = ref(window.ethereum);
 * const chainId = ref(11155111);
 *
 * const { instance, status, error, errorMessage } = useFhevm({
 *   provider,
 *   chainId,
 *   retry: { maxRetries: 3, retryDelay: 2000 },
 *   onSuccess: (instance) => console.log('FHEVM ready!'),
 *   onError: (error) => console.error('FHEVM failed:', error)
 * });
 * ```
 */
export function useFhevm(parameters: UseFhevmParams): UseFhevmReturn {
  const {
    initialMockChains,
    retry = false,
    onSuccess,
    onError,
  } = parameters;

  // Normalize inputs to refs
  const providerRef = ref(parameters.provider) as Ref<string | ethers.Eip1193Provider | undefined>;
  const chainIdRef = ref(parameters.chainId) as Ref<number | undefined>;
  const enabledRef = ref(parameters.enabled ?? true) as Ref<boolean>;

  // Retry configuration with defaults
  const retryConfig = retry === false ? null : {
    maxRetries: retry?.maxRetries ?? 0,
    retryDelay: retry?.retryDelay ?? 1000,
    retryBackoff: retry?.retryBackoff ?? 2,
    retryOnErrorCodes: retry?.retryOnErrorCodes ?? [
      FhevmErrorCode.NETWORK_ERROR,
      FhevmErrorCode.SDK_LOAD_FAILED,
    ],
  };

  // State
  // Use shallowRef for instance to avoid deep reactivity (Proxy wrapping)
  // This is crucial for MockFhevmInstance which has private members
  const instance = shallowRef<FhevmInstance | undefined>(undefined);
  const status = ref<FhevmStatus>("idle");
  const error = ref<Error | undefined>(undefined);
  const retryCount = ref<number>(0);

  // Computed error message
  const errorMessage = computed(() => {
    return error.value ? getErrorMessage(error.value) : undefined;
  });

  // Internal state
  let abortController: AbortController | null = null;
  let retryTimeout: NodeJS.Timeout | null = null;

  // Helper to check if we should retry on this error
  const shouldRetry = (err: Error, currentRetryCount: number): boolean => {
    if (!retryConfig || currentRetryCount >= retryConfig.maxRetries) {
      return false;
    }

    // If it's an FhevmError, check if the error code is retryable
    if (err instanceof FhevmError) {
      return retryConfig.retryOnErrorCodes.includes(err.code);
    }

    // Don't retry abort errors
    if (err instanceof FhevmAbortError) {
      return false;
    }

    // Retry other errors if maxRetries > 0
    return retryConfig.maxRetries > 0;
  };

  // Create instance with retry logic
  const attemptCreate = async (attemptNumber: number) => {
    const signal = abortController?.signal;
    if (!signal) return;

    const currentProvider = providerRef.value;
    const mockChains = initialMockChains;

    try {
      const i = await createFhevmInstance({
        signal,
        provider: currentProvider as any,
        mockChains: mockChains as any,
        onStatusChange: s => console.log(`[useFhevm] createFhevmInstance status changed: ${s}`),
      });

      if (signal.aborted) return;
      if (currentProvider !== providerRef.value) return;

      instance.value = i;
      error.value = undefined;
      status.value = "ready";
      retryCount.value = 0;

      // Call onSuccess callback
      if (onSuccess) {
        try {
          onSuccess(i);
        } catch (callbackError) {
          console.error("[useFhevm] onSuccess callback error:", callbackError);
        }
      }
    } catch (e) {
      const err = e as Error;

      if (signal.aborted) return;
      if (currentProvider !== providerRef.value) return;

      // Check if we should retry
      if (shouldRetry(err, attemptNumber)) {
        const nextAttempt = attemptNumber + 1;
        const delay = retryConfig!.retryDelay * Math.pow(retryConfig!.retryBackoff, attemptNumber);

        console.log(`[useFhevm] Retry attempt ${nextAttempt}/${retryConfig!.maxRetries} after ${delay}ms`);
        retryCount.value = nextAttempt;
        status.value = "loading"; // Keep loading status during retry

        retryTimeout = setTimeout(() => {
          if (!signal.aborted && currentProvider === providerRef.value) {
            attemptCreate(nextAttempt);
          }
        }, delay);
        return;
      }

      // Final error - no more retries
      instance.value = undefined;
      error.value = err;
      status.value = "error";
      retryCount.value = 0;

      // Call onError callback
      if (onError) {
        try {
          onError(err);
        } catch (callbackError) {
          console.error("[useFhevm] onError callback error:", callbackError);
        }
      }
    }
  };

  // Refresh function to manually recreate instance
  const refresh = () => {
    // Cancel any ongoing instance creation
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    // Cancel any pending retry
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }

    // Reset state
    instance.value = undefined;
    error.value = undefined;
    status.value = "idle";
    retryCount.value = 0;

    // Trigger re-creation if provider is available and enabled
    if (providerRef.value !== undefined && enabledRef.value) {
      createInstance();
    }
  };

  // Main instance creation function
  const createInstance = () => {
    if (!enabledRef.value) {
      status.value = "idle";
      instance.value = undefined;
      error.value = undefined;
      retryCount.value = 0;
      return;
    }

    if (providerRef.value === undefined) {
      status.value = "idle";
      instance.value = undefined;
      error.value = undefined;
      retryCount.value = 0;
      return;
    }

    // Create new abort controller
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    status.value = "loading";
    error.value = undefined;
    retryCount.value = 0;

    attemptCreate(0);
  };

  // Watch for provider/chainId/enabled changes
  watch(
    [providerRef, chainIdRef, enabledRef],
    () => {
      refresh();
    },
    { immediate: true }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
  });

  return {
    instance,
    refresh,
    error,
    status,
    errorMessage,
    retryCount,
  };
}
