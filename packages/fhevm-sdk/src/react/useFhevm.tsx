import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FhevmInstance } from "../core/types";
import { createFhevmInstance, FhevmError, FhevmAbortError } from "../core/instance";
import { FhevmErrorCode, getErrorMessage } from "../types/errors";
import { ethers } from "ethers";

function _assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    const m = message ? `Assertion failed: ${message}` : `Assertion failed.`;
    throw new Error(m);
  }
}

/**
 * FHEVM instance status
 *
 * - `idle`: No instance creation in progress, waiting for provider
 * - `loading`: Creating FHEVM instance
 * - `ready`: Instance successfully created and ready to use
 * - `error`: Instance creation failed
 */
export type FhevmStatus = "idle" | "loading" | "ready" | "error";

// For backward compatibility
export type FhevmGoState = FhevmStatus;

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
 * Parameters for useFhevm hook
 */
export interface UseFhevmParams {
  /** Ethereum provider (EIP-1193) or RPC URL */
  provider: string | ethers.Eip1193Provider | undefined;
  /** Chain ID to connect to */
  chainId: number | undefined;
  /** Enable/disable instance creation (default: true) */
  enabled?: boolean;
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
 * Return type for useFhevm hook
 */
export interface UseFhevmReturn {
  /** FHEVM instance (undefined if not ready) */
  instance: FhevmInstance | undefined;
  /** Manual refresh function to recreate instance */
  refresh: () => void;
  /** Error object if creation failed */
  error: Error | undefined;
  /** Current status of instance creation */
  status: FhevmStatus;
  /** User-friendly error message */
  errorMessage: string | undefined;
  /** Current retry attempt number (0 if not retrying) */
  retryCount: number;
}

/**
 * Hook to create and manage FHEVM instance
 *
 * @example
 * ```typescript
 * const { instance, status, error, errorMessage } = useFhevm({
 *   provider: window.ethereum,
 *   chainId: 11155111,
 *   retry: { maxRetries: 3, retryDelay: 2000 },
 *   onSuccess: (instance) => console.log('FHEVM ready!'),
 *   onError: (error) => console.error('FHEVM failed:', error)
 * });
 * ```
 */
export function useFhevm(parameters: UseFhevmParams): UseFhevmReturn {
  const {
    provider,
    chainId,
    initialMockChains,
    enabled = true,
    retry = false,
    onSuccess,
    onError,
  } = parameters;

  // Retry configuration with defaults - memoized to prevent unnecessary re-renders
  const retryConfig = useMemo(() => {
    if (retry === false) return null;
    return {
      maxRetries: retry?.maxRetries ?? 0,
      retryDelay: retry?.retryDelay ?? 1000,
      retryBackoff: retry?.retryBackoff ?? 2,
      retryOnErrorCodes: retry?.retryOnErrorCodes ?? [
        FhevmErrorCode.NETWORK_ERROR,
        FhevmErrorCode.SDK_LOAD_FAILED,
      ],
    };
  }, [
    typeof retry === 'object' ? retry?.maxRetries : retry,
    typeof retry === 'object' ? retry?.retryDelay : retry,
    typeof retry === 'object' ? retry?.retryBackoff : retry,
    typeof retry === 'object' ? JSON.stringify(retry?.retryOnErrorCodes) : retry,
  ]);

  const [instance, _setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [status, _setStatus] = useState<FhevmStatus>("idle");
  const [error, _setError] = useState<Error | undefined>(undefined);
  const [errorMessage, _setErrorMessage] = useState<string | undefined>(undefined);
  const [retryCount, _setRetryCount] = useState<number>(0);
  const [_isRunning, _setIsRunning] = useState<boolean>(enabled);
  const [_providerChanged, _setProviderChanged] = useState<number>(0);

  const _abortControllerRef = useRef<AbortController | null>(null);
  const _providerRef = useRef<string | ethers.Eip1193Provider | undefined>(provider);
  const _chainIdRef = useRef<number | undefined>(chainId);
  const _mockChainsRef = useRef<Record<number, string> | undefined>(initialMockChains as any);
  const _retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(() => {
    // Cancel any ongoing instance creation
    if (_abortControllerRef.current) {
      _providerRef.current = undefined;
      _chainIdRef.current = undefined;

      _abortControllerRef.current.abort();
      _abortControllerRef.current = null;
    }

    // Cancel any pending retry
    if (_retryTimeoutRef.current) {
      clearTimeout(_retryTimeoutRef.current);
      _retryTimeoutRef.current = null;
    }

    // Update refs
    _providerRef.current = provider;
    _chainIdRef.current = chainId;

    // Reset state
    _setInstance(undefined);
    _setError(undefined);
    _setErrorMessage(undefined);
    _setStatus("idle");
    _setRetryCount(0);

    // Trigger re-creation if provider is available
    if (provider !== undefined) {
      _setProviderChanged(prev => prev + 1);
    }
  }, [provider, chainId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    _setIsRunning(enabled);
  }, [enabled]);

  useEffect(() => {
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
      const thisSignal = _abortControllerRef.current!.signal;
      const thisProvider = _providerRef.current;
      const thisRpcUrlsByChainId = _mockChainsRef.current as any;

      try {
        const i = await createFhevmInstance({
          signal: thisSignal,
          provider: thisProvider as any,
          mockChains: thisRpcUrlsByChainId as any,
          onStatusChange: s => console.log(`[useFhevm] createFhevmInstance status changed: ${s}`),
        });

        if (thisSignal.aborted) return;
        _assert(thisProvider === _providerRef.current, "thisProvider === _providerRef.current");

        _setInstance(i);
        _setError(undefined);
        _setErrorMessage(undefined);
        _setStatus("ready");
        _setRetryCount(0);

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

        if (thisSignal.aborted) return;
        _assert(thisProvider === _providerRef.current, "thisProvider === _providerRef.current");

        // Check if we should retry
        if (shouldRetry(err, attemptNumber)) {
          const nextAttempt = attemptNumber + 1;
          const delay = retryConfig!.retryDelay * Math.pow(retryConfig!.retryBackoff, attemptNumber);

          console.log(`[useFhevm] Retry attempt ${nextAttempt}/${retryConfig!.maxRetries} after ${delay}ms`);
          _setRetryCount(nextAttempt);
          _setStatus("loading"); // Keep loading status during retry

          _retryTimeoutRef.current = setTimeout(() => {
            if (!thisSignal.aborted && thisProvider === _providerRef.current) {
              attemptCreate(nextAttempt);
            }
          }, delay);
          return;
        }

        // Final error - no more retries
        _setInstance(undefined);
        _setError(err);
        _setErrorMessage(getErrorMessage(err));
        _setStatus("error");
        _setRetryCount(0);

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

    // Main effect logic
    if (_isRunning === false) {
      if (_abortControllerRef.current) {
        _abortControllerRef.current.abort();
        _abortControllerRef.current = null;
      }
      if (_retryTimeoutRef.current) {
        clearTimeout(_retryTimeoutRef.current);
        _retryTimeoutRef.current = null;
      }
      _setInstance(undefined);
      _setError(undefined);
      _setErrorMessage(undefined);
      _setStatus("idle");
      _setRetryCount(0);
      return;
    }

    if (_isRunning === true) {
      if (_providerRef.current === undefined) {
        _setInstance(undefined);
        _setError(undefined);
        _setErrorMessage(undefined);
        _setStatus("idle");
        _setRetryCount(0);
        return;
      }

      if (!_abortControllerRef.current) {
        _abortControllerRef.current = new AbortController();
      }

      _assert(!_abortControllerRef.current.signal.aborted, "!controllerRef.current.signal.aborted");

      _setStatus("loading");
      _setError(undefined);
      _setErrorMessage(undefined);
      _setRetryCount(0);

      attemptCreate(0);
    }

    // Cleanup
    return () => {
      if (_retryTimeoutRef.current) {
        clearTimeout(_retryTimeoutRef.current);
        _retryTimeoutRef.current = null;
      }
    };
  }, [_isRunning, _providerChanged, retryConfig, onSuccess, onError]);

  return {
    instance,
    refresh,
    error,
    status,
    errorMessage,
    retryCount,
  };
}

