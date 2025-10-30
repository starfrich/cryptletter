/**
 * Input Validation Utilities
 *
 * This module provides utilities for validating FHEVM SDK inputs with
 * helpful error messages.
 *
 * @module utils/validation
 */

import {
  FhevmError,
  FhevmErrorCode,
  isStorageError,
  StorageError,
  StorageErrorCode,
} from "../types/errors";
import type { FhevmEncryptedType } from "../core/encryption";

// ============================================================================
// Ethereum Address Validation
// ============================================================================

/**
 * Regex for validating Ethereum addresses
 */
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Regex for validating checksummed addresses (EIP-55)
 */
const ETH_ADDRESS_CHECKSUM_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Validate an Ethereum address
 *
 * @param address - Address to validate
 * @param throwOnInvalid - Whether to throw an error if invalid
 * @returns true if valid, false otherwise
 * @throws {FhevmError} If throwOnInvalid is true and address is invalid
 *
 * @example
 * ```typescript
 * if (!isValidAddress(address)) {
 *   throw new Error("Invalid address");
 * }
 *
 * // Or throw automatically
 * assertValidAddress(address);
 * ```
 */
export function isValidAddress(
  address: unknown,
  throwOnInvalid = false
): address is `0x${string}` {
  const valid =
    typeof address === "string" && ETH_ADDRESS_REGEX.test(address);

  if (!valid && throwOnInvalid) {
    throw createFhevmError(
      FhevmErrorCode.INVALID_ADDRESS,
      `Invalid Ethereum address: ${address}. Address must be 42 characters (including 0x prefix) and contain only hexadecimal characters.`
    );
  }

  return valid;
}

/**
 * Assert that an address is valid
 *
 * @param address - Address to validate
 * @param paramName - Parameter name for error message
 * @throws {FhevmError} If address is invalid
 */
export function assertValidAddress(
  address: unknown,
  paramName = "address"
): asserts address is `0x${string}` {
  if (!isValidAddress(address)) {
    throw createFhevmError(
      FhevmErrorCode.INVALID_ADDRESS,
      `Invalid Ethereum ${paramName}: ${address}. Address must be 42 characters (including 0x prefix) and contain only hexadecimal characters.`,
      { paramName, value: address }
    );
  }
}

/**
 * Validate multiple addresses
 *
 * @param addresses - Addresses to validate
 * @param throwOnInvalid - Whether to throw on first invalid address
 * @returns Array of validation results
 */
export function validateAddresses(
  addresses: unknown[],
  throwOnInvalid = false
): boolean[] {
  return addresses.map((addr) => {
    try {
      return isValidAddress(addr, throwOnInvalid);
    } catch (error) {
      if (throwOnInvalid) throw error;
      return false;
    }
  });
}

// ============================================================================
// FHEVM Type Validation
// ============================================================================

/**
 * Valid FHEVM types
 */
const VALID_FHEVM_TYPES: FhevmEncryptedType[] = [
  "ebool",
  "euint8",
  "euint16",
  "euint32",
  "euint64",
  "euint128",
  "euint256",
  "eaddress",
];

/**
 * Type ranges for validation
 */
const TYPE_RANGES: Record<FhevmEncryptedType, { min: bigint; max: bigint }> = {
  ebool: { min: 0n, max: 1n },
  euint8: { min: 0n, max: 255n },
  euint16: { min: 0n, max: 65535n },
  euint32: { min: 0n, max: 4294967295n },
  euint64: { min: 0n, max: 18446744073709551615n },
  euint128: {
    min: 0n,
    max: 340282366920938463463374607431768211455n,
  },
  euint256: {
    min: 0n,
    max: 115792089237316195423570985008687907853269984665640564039457584007913129639935n,
  },
  eaddress: { min: 0n, max: 1n }, // Not used for eaddress
};

/**
 * Validate FHEVM type
 *
 * @param type - Type to validate
 * @param throwOnInvalid - Whether to throw on invalid type
 * @returns true if valid, false otherwise
 */
export function isValidFhevmType(
  type: unknown,
  throwOnInvalid = false
): type is FhevmEncryptedType {
  const valid =
    typeof type === "string" &&
    VALID_FHEVM_TYPES.includes(type as FhevmEncryptedType);

  if (!valid && throwOnInvalid) {
    throw createFhevmError(
      FhevmErrorCode.INVALID_FHEVM_TYPE,
      `Invalid FHEVM type: ${type}. Valid types are: ${VALID_FHEVM_TYPES.join(", ")}`
    );
  }

  return valid;
}

/**
 * Assert FHEVM type is valid
 *
 * @param type - Type to validate
 * @throws {FhevmError} If type is invalid
 */
export function assertValidFhevmType(
  type: unknown
): asserts type is FhevmEncryptedType {
  if (!isValidFhevmType(type)) {
    throw createFhevmError(
      FhevmErrorCode.INVALID_FHEVM_TYPE,
      `Invalid FHEVM type: ${type}. Valid types are: ${VALID_FHEVM_TYPES.join(", ")}`
    );
  }
}

/**
 * Get valid FHEVM types list
 *
 * @returns Array of valid FHEVM types
 */
export function getValidFhevmTypes(): readonly FhevmEncryptedType[] {
  return [...VALID_FHEVM_TYPES];
}

// ============================================================================
// Value Validation
// ============================================================================

/**
 * Validate a value for encryption with a specific FHEVM type
 *
 * @param value - Value to validate
 * @param type - FHEVM type
 * @param throwOnInvalid - Whether to throw on invalid value
 * @returns true if valid, false otherwise
 */
export function validateEncryptionValue(
  value: unknown,
  type: FhevmEncryptedType,
  throwOnInvalid = false
): boolean {
  try {
    if (type === "ebool") {
      const valid = typeof value === "boolean" || value === 0 || value === 1;
      if (!valid && throwOnInvalid) {
        throw new Error(
          `Boolean value must be true, false, 0, or 1, got ${value}`
        );
      }
      return valid;
    }

    if (type === "eaddress") {
      const valid = isValidAddress(value);
      if (!valid && throwOnInvalid) {
        throw new Error(`Address value must be a valid Ethereum address`);
      }
      return valid;
    }

    // For all other types (euint*), convert to BigInt and check range
    let bigIntValue: bigint;
    try {
      bigIntValue = BigInt(value as any);
    } catch {
      if (throwOnInvalid) {
        throw new Error(`Value cannot be converted to BigInt: ${value}`);
      }
      return false;
    }

    const range = TYPE_RANGES[type];
    const valid = bigIntValue >= range.min && bigIntValue <= range.max;

    if (!valid && throwOnInvalid) {
      throw new Error(
        `Value ${value} is out of range for ${type}. Valid range: ${range.min} to ${range.max}`
      );
    }

    return valid;
  } catch (error) {
    if (throwOnInvalid) {
      throw createFhevmError(
        FhevmErrorCode.INVALID_ENCRYPTION_VALUE,
        error instanceof Error ? error.message : `Invalid value for type ${type}`
      );
    }
    return false;
  }
}

/**
 * Assert value is valid for encryption
 *
 * @param value - Value to validate
 * @param type - FHEVM type
 * @throws {FhevmError} If value is invalid
 */
export function assertValidEncryptionValue(
  value: unknown,
  type: FhevmEncryptedType
): void {
  validateEncryptionValue(value, type, true);
}

// ============================================================================
// Chain/Network Validation
// ============================================================================

/**
 * Validate chain ID
 *
 * @param chainId - Chain ID to validate
 * @param throwOnInvalid - Whether to throw on invalid chain ID
 * @returns true if valid, false otherwise
 */
export function isValidChainId(
  chainId: unknown,
  throwOnInvalid = false
): chainId is number {
  const valid =
    typeof chainId === "number" && chainId > 0 && Number.isInteger(chainId);

  if (!valid && throwOnInvalid) {
    throw createFhevmError(
      FhevmErrorCode.INVALID_INPUT,
      `Invalid chain ID: ${chainId}. Chain ID must be a positive integer.`
    );
  }

  return valid;
}

/**
 * Common chain IDs
 */
export const COMMON_CHAIN_IDS = {
  HARDHAT: 31337,
  SEPOLIA: 11155111,
  ETHEREUM: 1,
  POLYGON: 137,
  POLYGON_MUMBAI: 80001,
} as const;

/**
 * Check if chain ID is Ethereum-compatible
 *
 * @param chainId - Chain ID to check
 * @returns true if it's an Ethereum-compatible chain
 */
export function isEthereumCompatibleChain(chainId: number): boolean {
  // Ethereum mainnet and testnet chains typically have chainId < 100000
  return chainId > 0 && chainId < 100000;
}

// ============================================================================
// Hex String Validation
// ============================================================================

/**
 * Validate hex string (with or without 0x prefix)
 *
 * @param value - Value to validate
 * @param throwOnInvalid - Whether to throw on invalid hex
 * @returns true if valid, false otherwise
 */
export function isValidHex(
  value: unknown,
  throwOnInvalid = false
): value is string {
  if (typeof value !== "string") {
    if (throwOnInvalid) {
      throw createFhevmError(
        FhevmErrorCode.INVALID_INPUT,
        "Hex value must be a string"
      );
    }
    return false;
  }

  const hexRegex = /^(0x)?[a-fA-F0-9]*$/;
  const valid = hexRegex.test(value);

  if (!valid && throwOnInvalid) {
    throw createFhevmError(
      FhevmErrorCode.INVALID_INPUT,
      `Invalid hex string: ${value}. Must contain only hexadecimal characters (0-9, a-f, A-F) and optionally start with 0x.`
    );
  }

  return valid;
}

/**
 * Normalize hex string to include 0x prefix
 *
 * @param value - Hex string to normalize
 * @returns Hex string with 0x prefix
 * @throws {FhevmError} If value is not a valid hex string
 */
export function normalizeHex(value: unknown): `0x${string}` {
  if (!isValidHex(value, true)) {
    throw createFhevmError(
      FhevmErrorCode.INVALID_INPUT,
      `Invalid hex string: ${value}`
    );
  }

  const hexString = value as string;
  return (hexString.startsWith("0x") ? hexString : `0x${hexString}`) as `0x${string}`;
}

// ============================================================================
// Parameter Validation
// ============================================================================

/**
 * Validate that a parameter is defined
 *
 * @param value - Value to check
 * @param paramName - Parameter name for error message
 * @throws {FhevmError} If value is undefined or null
 */
export function assertDefined<T>(
  value: T | undefined | null,
  paramName: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw createFhevmError(
      FhevmErrorCode.MISSING_PARAMETER,
      `Required parameter is missing: ${paramName}`
    );
  }
}

/**
 * Validate that all required parameters are defined
 *
 * @param params - Object with parameters
 * @param requiredKeys - Keys that must be defined
 * @throws {FhevmError} If any required parameter is missing
 */
export function assertRequiredParams<T extends Record<string, any>>(
  params: T,
  requiredKeys: (keyof T)[]
): void {
  for (const key of requiredKeys) {
    if (params[key] === undefined || params[key] === null) {
      throw createFhevmError(
        FhevmErrorCode.MISSING_PARAMETER,
        `Required parameter is missing: ${String(key)}`
      );
    }
  }
}

/**
 * Validate that a value is not empty
 *
 * @param value - Value to check
 * @param description - Description for error message
 * @throws {FhevmError} If value is empty
 */
export function assertNotEmpty(value: string, description: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createFhevmError(
      FhevmErrorCode.INVALID_INPUT,
      `${description} cannot be empty`
    );
  }
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validate an array is not empty
 *
 * @param array - Array to validate
 * @param description - Description for error message
 * @throws {FhevmError} If array is empty
 */
export function assertNotEmptyArray<T>(
  array: T[],
  description: string
): void {
  if (!Array.isArray(array) || array.length === 0) {
    throw createFhevmError(
      FhevmErrorCode.INVALID_INPUT,
      `${description} cannot be empty`
    );
  }
}

/**
 * Validate that all items in an array satisfy a predicate
 *
 * @param array - Array to validate
 * @param predicate - Validation function
 * @param description - Description for error message
 * @throws {FhevmError} If any item fails validation
 */
export function assertAllValid<T>(
  array: T[],
  predicate: (item: T, index: number) => boolean,
  description: string
): void {
  for (let i = 0; i < array.length; i++) {
    if (!predicate(array[i], i)) {
      throw createFhevmError(
        FhevmErrorCode.INVALID_INPUT,
        `${description} failed validation at index ${i}`
      );
    }
  }
}

// ============================================================================
// Storage Validation
// ============================================================================

/**
 * Validate that storage error is not quota exceeded
 *
 * @param error - Error to check
 * @returns true if not quota exceeded
 */
export function isNotQuotaExceeded(error: unknown): boolean {
  if (isStorageError(error)) {
    return error.code !== StorageErrorCode.QUOTA_EXCEEDED;
  }
  return true;
}

/**
 * Validate storage key
 *
 * @param key - Storage key to validate
 * @param throwOnInvalid - Whether to throw on invalid key
 * @returns true if valid, false otherwise
 */
export function isValidStorageKey(
  key: unknown,
  throwOnInvalid = false
): key is string {
  const valid =
    typeof key === "string" && key.length > 0 && key.length <= 1000;

  if (!valid && throwOnInvalid) {
    throw new StorageError(
      StorageErrorCode.INVALID_INPUT,
      "Storage key must be a non-empty string (max 1000 characters)"
    );
  }

  return valid;
}

/**
 * Validate storage value (should be serializable)
 *
 * @param value - Value to validate
 * @param throwOnInvalid - Whether to throw on invalid value
 * @returns true if valid, false otherwise
 */
export function isValidStorageValue(
  value: unknown,
  throwOnInvalid = false
): boolean {
  try {
    // Try to stringify the value
    JSON.stringify(value);
    return true;
  } catch (error) {
    if (throwOnInvalid) {
      throw new StorageError(
        StorageErrorCode.INVALID_INPUT,
        "Storage value must be JSON serializable"
      );
    }
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create FHEVM error with helpful context
 *
 * @param code - Error code
 * @param message - Error message
 * @param context - Optional context
 * @returns FhevmError
 */
function createFhevmError(
  code: FhevmErrorCode,
  message: string,
  context?: any
): FhevmError {
  return new FhevmError(code, message, context);
}
