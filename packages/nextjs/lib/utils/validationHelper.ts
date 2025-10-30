/**
 * Validation Helper Wrapper for Next.js
 *
 * Input validation for FHEVM operations.
 * Wraps SDK validation utilities with Next.js-specific logic.
 */

import {
  isValidAddress,
  assertValidAddress,
  isValidFhevmType,
  assertValidFhevmType,
  validateEncryptionValue,
  assertValidEncryptionValue,
  isValidStorageKey,
  isValidStorageValue,
} from "@fhevm-sdk/utils";
import type { FhevmEncryptedType } from "@fhevm-sdk/core";

/**
 * Validate an Ethereum address
 *
 * @param address - Address to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```tsx
 * if (!validateAddress(contractAddr)) {
 *   throw new Error("Invalid contract address");
 * }
 * ```
 */
export function validateAddress(address: unknown): boolean {
  return isValidAddress(address);
}

/**
 * Assert that an address is valid, throw if not
 *
 * @param address - Address to validate
 * @param paramName - Optional parameter name for error message
 * @throws Error if address is invalid
 */
export function assertAddress(address: unknown, paramName?: string): void {
  assertValidAddress(address, paramName);
}

/**
 * Validate a FHEVM type
 *
 * @param type - Type to validate (e.g., "euint32", "euint64")
 * @returns true if valid, false otherwise
 */
export function validateFhevmType(type: unknown): boolean {
  return isValidFhevmType(type);
}

/**
 * Assert that a FHEVM type is valid, throw if not
 *
 * @param type - Type to validate
 * @throws Error if type is invalid
 */
export function assertFhevmType(type: unknown): void {
  assertValidFhevmType(type);
}

/**
 * Validate an encryption value for a given FHEVM type
 *
 * @param value - Value to validate
 * @param type - FHEVM type (e.g., "euint32")
 * @returns true if valid, false otherwise
 *
 * @example
 * ```tsx
 * if (!validateEncryptionValueForType(100, "euint32")) {
 *   throw new Error("Value out of range for euint32");
 * }
 * ```
 */
export function validateEncryptionValueForType(
  value: unknown,
  type: FhevmEncryptedType
): boolean {
  return validateEncryptionValue(value, type);
}

/**
 * Assert encryption value is valid for type, throw if not
 *
 * @param value - Value to validate
 * @param type - FHEVM type
 * @throws Error if validation fails
 */
export function assertEncryptionValue(
  value: unknown,
  type: FhevmEncryptedType
): void {
  assertValidEncryptionValue(value, type);
}

/**
 * Validate a storage key
 *
 * @param key - Storage key to validate
 * @returns true if valid, false otherwise
 */
export function validateStorageKeyFormat(key: unknown): boolean {
  return isValidStorageKey(key);
}

/**
 * Validate a storage value
 *
 * @param value - Storage value to validate
 * @returns true if valid, false otherwise
 */
export function validateStorageValueFormat(value: unknown): boolean {
  return isValidStorageValue(value);
}

/**
 * Validate both storage key and value
 *
 * @param key - Storage key to validate
 * @param value - Storage value to validate
 * @returns true if both are valid, false otherwise
 */
export function validateStorageKeyValue(
  key: unknown,
  value: unknown
): boolean {
  return isValidStorageKey(key) && isValidStorageValue(value);
}
