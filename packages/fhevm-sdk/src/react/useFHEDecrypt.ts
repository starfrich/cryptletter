"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FhevmDecryptionSignature } from "../FhevmDecryptionSignature";
import { GenericStringStorage } from "../storage/GenericStringStorage";
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
 * Parameters for useFHEDecrypt hook
 */
export interface UseFHEDecryptParams {
  /** FHEVM instance for decryption operations */
  instance: FhevmInstance | undefined;
  /** Callback for signing EIP-712 typed data (framework-agnostic) */
  signTypedData: SignTypedDataCallback | undefined;
  /** Callback for getting user address (framework-agnostic) */
  getAddress: GetAddressCallback | undefined;
  /** Storage for caching decryption signatures */
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  /** Current chain ID */
  chainId: number | undefined;
  /** Array of decryption requests (handles to decrypt) */
  requests: readonly FHEDecryptRequest[] | undefined;
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
 * Return type for useFHEDecrypt hook
 */
export interface UseFHEDecryptReturn {
  /** Whether decryption is possible */
  canDecrypt: boolean;
  /** Trigger decryption manually */
  decrypt: () => void;
  /** Whether decryption is in progress */
  isDecrypting: boolean;
  /** Progress message */
  message: string;
  /** Decryption results (handle -> decrypted value) */
  results: Record<string, string | bigint | boolean>;
  /** Last decryption error */
  error: string | null;
  /** User-friendly error message */
  errorMessage: string | undefined;
  /** Current retry attempt number */
  retryCount: number;
  /** Set custom message */
  setMessage: (msg: string) => void;
  /** Set custom error */
  setError: (err: string | null) => void;
}

/**
 * Hook for decrypting FHEVM handles
 *
 * Provides decryption utilities with automatic caching, retry logic,
 * and progress tracking.
 *
 * @example
 * ```typescript
 * // With ethers.js
 * const signTypedData = useCallback(async (domain, types, message) => {
 *   return await signer.signTypedData(domain, types, message);
 * }, [signer]);
 *
 * const getAddress = useCallback(async () => {
 *   return await signer.getAddress();
 * }, [signer]);
 *
 * const { canDecrypt, decrypt, isDecrypting, results } = useFHEDecrypt({
 *   instance,
 *   signTypedData,
 *   getAddress,
 *   fhevmDecryptionSignatureStorage,
 *   chainId,
 *   requests: [{ handle: '0x123...', contractAddress: '0xabc...' }],
 *   autoDecrypt: true,
 *   retry: { maxRetries: 3, retryDelay: 2000 },
 *   onSuccess: (results) => console.log('Decrypted:', results),
 *   onError: (error) => console.error('Decryption failed:', error)
 * });
 * ```
 */
export const useFHEDecrypt = (params: UseFHEDecryptParams): UseFHEDecryptReturn => {
  const {
    instance,
    signTypedData,
    getAddress,
    fhevmDecryptionSignatureStorage,
    chainId,
    requests,
    autoDecrypt = false,
    retry = { maxRetries: 2, retryDelay: 1500 },
    onSuccess,
    onError,
  } = params;

  // Retry configuration
  const retryConfig = retry === false ? null : {
    maxRetries: retry?.maxRetries ?? 2,
    retryDelay: retry?.retryDelay ?? 1500,
  };

  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [results, setResults] = useState<Record<string, string | bigint | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [retryCount, setRetryCount] = useState<number>(0);

  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const lastReqKeyRef = useRef<string>("");
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const requestsKey = useMemo(() => {
    if (!requests || requests.length === 0) return "";
    const sorted = [...requests].sort((a, b) =>
      (a.handle + a.contractAddress).localeCompare(b.handle + b.contractAddress),
    );
    return JSON.stringify(sorted);
  }, [requests]);

  const canDecrypt = useMemo(() => {
    return Boolean(instance && signTypedData && getAddress && requests && requests.length > 0 && !isDecrypting);
  }, [instance, signTypedData, getAddress, requests, isDecrypting]);

  const decrypt = useCallback((attemptNumber: number = 0) => {
    if (isDecryptingRef.current && attemptNumber === 0) return;
    if (!instance || !signTypedData || !getAddress || !requests || requests.length === 0) return;

    const thisChainId = chainId;
    const thisSignTypedData = signTypedData;
    const thisGetAddress = getAddress;
    const thisRequests = requests;

    // Capture the current requests key to avoid false "stale" detection on first run
    if (attemptNumber === 0) {
      lastReqKeyRef.current = requestsKey;
    }

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage(attemptNumber > 0 ? `Retrying decryption (attempt ${attemptNumber + 1})...` : "Start decrypt");
    setError(null);
    setErrorMessage(undefined);

    if (attemptNumber > 0) {
      setRetryCount(attemptNumber);
    }

    const run = async () => {
      const isStale = () =>
        thisChainId !== chainId || thisSignTypedData !== signTypedData || thisGetAddress !== getAddress || requestsKey !== lastReqKeyRef.current;

      try {
        // Use core utility to get unique addresses
        const uniqueAddresses = getUniqueContractAddresses(thisRequests);

        const sig: FhevmDecryptionSignature | null = await FhevmDecryptionSignature.loadOrSign(
          instance,
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
          setMessage("Decryption cancelled (stale request)");
          isDecryptingRef.current = false;
          setIsDecrypting(false);
          setRetryCount(0);
          return;
        }

        // Use core decryption utility
        const decryptionResult = await decryptBatch({
          instance,
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
          onProgress: (msg) => setMessage(msg),
        });

        if (!decryptionResult.success) {
          const err = new FhevmError(
            FhevmErrorCode.DECRYPTION_FAILED,
            `Decryption failed: ${decryptionResult.error}`
          );
          throw err;
        }

        if (isStale()) {
          setMessage("Decryption cancelled (stale request)");
          isDecryptingRef.current = false;
          setIsDecrypting(false);
          setRetryCount(0);
          return;
        }

        // Success!
        setResults(decryptionResult.results);
        setMessage("Decryption completed successfully");
        setError(null);
        setErrorMessage(undefined);
        setRetryCount(0);

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

        if (isStale()) {
          setMessage("Decryption cancelled (stale request)");
          isDecryptingRef.current = false;
          setIsDecrypting(false);
          setRetryCount(0);
          return;
        }

        // Check if we should retry
        const shouldRetry = retryConfig && attemptNumber < retryConfig.maxRetries;

        if (shouldRetry) {
          const nextAttempt = attemptNumber + 1;
          const delay = retryConfig!.retryDelay;

          console.log(`[useFHEDecrypt] Retry attempt ${nextAttempt}/${retryConfig!.maxRetries} after ${delay}ms`);
          setMessage(`Decryption failed, retrying in ${delay}ms...`);

          retryTimeoutRef.current = setTimeout(() => {
            if (!isStale()) {
              decrypt(nextAttempt);
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

        setError(`${code}: ${msg}`);
        setErrorMessage(getErrorMessage(fhevmErr));
        setMessage("FHEVM decryption failed");
        setRetryCount(0);

        // Call error callback
        if (onError) {
          try {
            onError(fhevmErr);
          } catch (callbackError) {
            console.error("[useFHEDecrypt] onError callback error:", callbackError);
          }
        }
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
        lastReqKeyRef.current = requestsKey;
      }
    };

    run();
  }, [instance, signTypedData, getAddress, fhevmDecryptionSignatureStorage, chainId, requests, requestsKey, retryConfig, onSuccess, onError]);

  // Auto-decrypt when requests change
  useEffect(() => {
    if (autoDecrypt && canDecrypt && requestsKey !== lastReqKeyRef.current) {
      decrypt(0);
    }
  }, [autoDecrypt, canDecrypt, requestsKey, decrypt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    canDecrypt,
    decrypt: () => decrypt(0),
    isDecrypting,
    message,
    results,
    error,
    errorMessage,
    retryCount,
    setMessage,
    setError,
  } as const;
};