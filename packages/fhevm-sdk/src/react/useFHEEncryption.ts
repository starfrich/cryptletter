"use client";

import { useCallback, useMemo, useState } from "react";
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
 * Parameters for useFHEEncryption hook
 */
export interface UseFHEEncryptionParams {
  /** FHEVM instance for encryption operations */
  instance: FhevmInstance | undefined;
  /** Callback for getting user address (framework-agnostic) */
  getAddress: GetAddressCallback | undefined;
  /** Contract address for encryption context */
  contractAddress: `0x${string}` | undefined;
  /** Callback fired on successful encryption */
  onSuccess?: (result: EncryptResult) => void;
  /** Callback fired on encryption error */
  onError?: (error: Error) => void;
}

/**
 * Return type for useFHEEncryption hook
 */
export interface UseFHEEncryptionReturn {
  /** Whether encryption is possible (all dependencies ready) */
  canEncrypt: boolean;
  /** Encrypt values using a builder function */
  encryptWith: (buildFn: (builder: RelayerEncryptedInput) => void) => Promise<EncryptResult | undefined>;
  /** Encrypt multiple values in batch */
  encryptBatch: (buildFn: (builder: RelayerEncryptedInput) => void) => Promise<EncryptResult | undefined>;
  /** Current encryption state */
  isEncrypting: boolean;
  /** Last encryption error */
  error: Error | undefined;
  /** User-friendly error message */
  errorMessage: string | undefined;
}

/**
 * Hook for encrypting values for FHEVM contracts
 *
 * Provides encryption utilities with loading states and error handling.
 * Supports both single and batch encryption operations.
 *
 * @example
 * ```typescript
 * const { getAddress } = useWalletCallbacks({ ethersSigner });
 * const { canEncrypt, encryptWith, isEncrypting } = useFHEEncryption({
 *   instance,
 *   getAddress,
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
  const { instance, getAddress, contractAddress, onSuccess, onError } = params;

  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const canEncrypt = useMemo(
    () => Boolean(instance && getAddress && contractAddress && !isEncrypting),
    [instance, getAddress, contractAddress, isEncrypting],
  );

  const encryptWith = useCallback(
    async (buildFn: (builder: RelayerEncryptedInput) => void): Promise<EncryptResult | undefined> => {
      // Validation
      if (!instance) {
        const err = new FhevmError(
          FhevmErrorCode.INSTANCE_NOT_READY,
          "FHEVM instance is not ready. Please wait for instance initialization."
        );
        setError(err);
        setErrorMessage(getErrorMessage(err));
        if (onError) onError(err);
        return undefined;
      }

      if (!getAddress) {
        const err = new FhevmError(
          FhevmErrorCode.MISSING_PARAMETER,
          "getAddress callback is required for encryption. Please connect your wallet."
        );
        setError(err);
        setErrorMessage(getErrorMessage(err));
        if (onError) onError(err);
        return undefined;
      }

      if (!contractAddress) {
        const err = new FhevmError(
          FhevmErrorCode.INVALID_ADDRESS,
          "Contract address is required for encryption."
        );
        setError(err);
        setErrorMessage(getErrorMessage(err));
        if (onError) onError(err);
        return undefined;
      }

      setIsEncrypting(true);
      setError(undefined);
      setErrorMessage(undefined);

      try {
        const userAddress = await getAddress();
        const input = instance.createEncryptedInput(contractAddress, userAddress) as RelayerEncryptedInput;

        // Call the builder function to add values
        buildFn(input);

        // Perform encryption
        const enc = await input.encrypt();

        setIsEncrypting(false);

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
        const err = e instanceof Error ? e : new Error(String(e));
        const fhevmErr = new FhevmError(
          FhevmErrorCode.ENCRYPTION_FAILED,
          `Encryption failed: ${err.message}`,
          err
        );

        setError(fhevmErr);
        setErrorMessage(getErrorMessage(fhevmErr));
        setIsEncrypting(false);

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
    },
    [instance, getAddress, contractAddress, onSuccess, onError],
  );

  // Alias for batch encryption (same implementation for now)
  const encryptBatch = encryptWith;

  return {
    canEncrypt,
    encryptWith,
    encryptBatch,
    isEncrypting,
    error,
    errorMessage,
  } as const;
};