/**
 * FHEVM Decryption Utilities
 *
 * This module provides framework-agnostic utilities for decrypting FHEVM encrypted data.
 * It handles signature management, caching, and the full decryption flow.
 */

import type { FhevmInstance } from "./types";

/**
 * Decryption request for a single encrypted handle
 */
export interface DecryptionRequest {
  /** The encrypted handle to decrypt */
  handle: string;
  /** The contract address that owns this encrypted data */
  contractAddress: `0x${string}`;
}

/**
 * Decryption signature parameters required for userDecrypt
 */
export interface DecryptionSignature {
  /** Public key for decryption */
  publicKey: string;
  /** Private key for decryption */
  privateKey: string;
  /** EIP-712 signature authorizing decryption */
  signature: string;
  /** Contract addresses this signature is valid for */
  contractAddresses: `0x${string}`[];
  /** User's Ethereum address */
  userAddress: `0x${string}`;
  /** Unix timestamp when signature becomes valid */
  startTimestamp: number;
  /** Number of days signature remains valid */
  durationDays: number;
}

/**
 * Result of a decryption operation
 */
export interface DecryptionResult {
  /** Map of handle -> decrypted value */
  results: Record<string, string | bigint | boolean>;
  /** Success indicator */
  success: boolean;
  /** Error message if decryption failed */
  error?: string;
}

/**
 * Options for batch decryption
 */
export interface DecryptBatchOptions {
  /** FHEVM instance */
  instance: FhevmInstance;
  /** Decryption requests */
  requests: readonly DecryptionRequest[];
  /** Decryption signature */
  signature: DecryptionSignature;
  /** Optional progress callback */
  onProgress?: (message: string) => void;
}

/**
 * Decrypt multiple encrypted handles in a single batch operation
 *
 * This is the core decryption function that calls the RelayerSDK's userDecrypt method.
 * It requires a valid DecryptionSignature (obtained via EIP-712 signing).
 *
 * @param options - Decryption options
 * @returns Decryption result with values or error
 *
 * @example
 * ```typescript
 * const result = await decryptBatch({
 *   instance,
 *   requests: [
 *     { handle: "0x123...", contractAddress: "0xabc..." },
 *     { handle: "0x456...", contractAddress: "0xabc..." }
 *   ],
 *   signature: decryptionSignature,
 *   onProgress: (msg) => console.log(msg)
 * });
 *
 * if (result.success) {
 *   console.log("Decrypted values:", result.results);
 * }
 * ```
 */
export const decryptBatch = async (
  options: DecryptBatchOptions
): Promise<DecryptionResult> => {
  const { instance, requests, signature, onProgress } = options;

  try {
    onProgress?.("Starting decryption...");

    // Validate inputs
    if (requests.length === 0) {
      return {
        success: false,
        results: {},
        error: "No requests to decrypt",
      };
    }

    // Call RelayerSDK userDecrypt
    onProgress?.("Calling FHEVM userDecrypt...");

    const results = await instance.userDecrypt(
      requests.map((r) => ({
        handle: r.handle,
        contractAddress: r.contractAddress,
      })),
      signature.privateKey,
      signature.publicKey,
      signature.signature,
      signature.contractAddresses,
      signature.userAddress,
      signature.startTimestamp,
      signature.durationDays
    );

    onProgress?.("Decryption completed!");

    return {
      success: true,
      results,
    };
  } catch (error) {
    const err = error as Error;
    const errorMessage = err.message || "Decryption failed";

    onProgress?.(`Decryption failed: ${errorMessage}`);

    return {
      success: false,
      results: {},
      error: errorMessage,
    };
  }
};

/**
 * Decrypt a single encrypted handle
 *
 * Convenience wrapper for decrypting a single value.
 *
 * @param instance - FHEVM instance
 * @param handle - Encrypted handle
 * @param contractAddress - Contract address
 * @param signature - Decryption signature
 * @returns Decrypted value or undefined on error
 *
 * @example
 * ```typescript
 * const value = await decryptValue(
 *   instance,
 *   "0x123...",
 *   "0xabc...",
 *   signature
 * );
 * console.log("Decrypted:", value);
 * ```
 */
export const decryptValue = async (
  instance: FhevmInstance,
  handle: string,
  contractAddress: `0x${string}`,
  signature: DecryptionSignature
): Promise<string | bigint | boolean | undefined> => {
  const result = await decryptBatch({
    instance,
    requests: [{ handle, contractAddress }],
    signature,
  });

  if (result.success) {
    return result.results[handle];
  }

  return undefined;
};

/**
 * Check if a decryption signature is still valid
 *
 * Signatures expire after their durationDays period.
 *
 * @param signature - Decryption signature to check
 * @returns true if signature is still valid
 *
 * @example
 * ```typescript
 * if (!isSignatureValid(signature)) {
 *   console.log("Signature expired, need to re-sign");
 * }
 * ```
 */
export const isSignatureValid = (signature: DecryptionSignature): boolean => {
  const now = Math.floor(Date.now() / 1000); // Current Unix timestamp
  const expiryTimestamp =
    signature.startTimestamp + signature.durationDays * 24 * 60 * 60;
  return now < expiryTimestamp;
};

/**
 * Get unique contract addresses from decryption requests
 *
 * Helper to extract and deduplicate contract addresses.
 *
 * @param requests - Decryption requests
 * @returns Sorted array of unique contract addresses
 *
 * @example
 * ```typescript
 * const addresses = getUniqueContractAddresses(requests);
 * // Use addresses to create signature
 * ```
 */
export const getUniqueContractAddresses = (
  requests: readonly DecryptionRequest[]
): `0x${string}`[] => {
  const uniqueAddresses = Array.from(
    new Set(requests.map((r) => r.contractAddress))
  );
  return uniqueAddresses.sort();
};

/**
 * Validate decryption request
 *
 * Checks if a decryption request has valid parameters.
 *
 * @param request - Decryption request to validate
 * @returns true if valid, false otherwise
 */
export const isValidDecryptionRequest = (
  request: DecryptionRequest
): boolean => {
  // Check handle is non-empty hex string
  if (
    typeof request.handle !== "string" ||
    !request.handle.startsWith("0x") ||
    request.handle.length < 3
  ) {
    return false;
  }

  // Check contract address is valid
  if (
    typeof request.contractAddress !== "string" ||
    !request.contractAddress.startsWith("0x") ||
    request.contractAddress.length !== 42
  ) {
    return false;
  }

  return true;
};

/**
 * Filter out invalid decryption requests
 *
 * @param requests - Decryption requests
 * @returns Array of valid requests
 */
export const filterValidRequests = (
  requests: readonly DecryptionRequest[]
): DecryptionRequest[] => {
  return requests.filter(isValidDecryptionRequest);
};
