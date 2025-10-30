/**
 * Validation Helper Wrapper for Vue
 *
 * Input validation for FHEVM operations.
 * Wraps SDK validation utilities with Vue-specific logic.
 */

import { ref } from 'vue'
import {
  isValidAddress,
  assertValidAddress,
  isValidFhevmType,
  assertValidFhevmType,
  validateEncryptionValue,
  assertValidEncryptionValue,
  isValidStorageKey,
  isValidStorageValue,
} from '@fhevm-sdk/utils'
import type { FhevmEncryptedType } from '@fhevm-sdk/core'

/**
 * Vue composable for validation state management
 *
 * @returns Object with validation functions and reactive validation state
 *
 * @example
 * ```ts
 * const { validationErrors, validate, isValid } = useValidation()
 *
 * validate('address', userInput)
 * if (!isValid.value) {
 *   console.error(validationErrors.value)
 * }
 * ```
 */
export function useValidation() {
  const validationErrors = ref<Record<string, string>>({})

  /**
   * Validate an Ethereum address
   *
   * @param address - Address to validate
   * @returns true if valid, false otherwise
   */
  function validateAddress(address: unknown): boolean {
    return isValidAddress(address)
  }

  /**
   * Validate and store error if invalid
   *
   * @param fieldName - Field name for error tracking
   * @param address - Address to validate
   * @returns true if valid, false otherwise
   */
  function validateAddressField(fieldName: string, address: unknown): boolean {
    const isValid = isValidAddress(address)
    if (!isValid) {
      validationErrors.value[fieldName] = `Invalid address: ${String(address).slice(0, 20)}...`
    } else {
      delete validationErrors.value[fieldName]
    }
    return isValid
  }

  /**
   * Assert that an address is valid, throw if not
   *
   * @param address - Address to validate
   * @param paramName - Optional parameter name for error message
   * @throws Error if address is invalid
   */
  function assertAddress(address: unknown, paramName?: string): void {
    assertValidAddress(address, paramName)
  }

  /**
   * Validate a FHEVM type
   *
   * @param type - Type to validate (e.g., "euint32", "euint64")
   * @returns true if valid, false otherwise
   */
  function validateFhevmType(type: unknown): boolean {
    return isValidFhevmType(type)
  }

  /**
   * Validate and store error if invalid
   *
   * @param fieldName - Field name for error tracking
   * @param type - Type to validate
   * @returns true if valid, false otherwise
   */
  function validateFhevmTypeField(fieldName: string, type: unknown): boolean {
    const isValid = isValidFhevmType(type)
    if (!isValid) {
      validationErrors.value[fieldName] = `Invalid FHEVM type: ${String(type)}`
    } else {
      delete validationErrors.value[fieldName]
    }
    return isValid
  }

  /**
   * Assert that a FHEVM type is valid, throw if not
   *
   * @param type - Type to validate
   * @throws Error if type is invalid
   */
  function assertFhevmType(type: unknown): void {
    assertValidFhevmType(type)
  }

  /**
   * Validate an encryption value for a given FHEVM type
   *
   * @param value - Value to validate
   * @param type - FHEVM type (e.g., "euint32")
   * @returns true if valid, false otherwise
   */
  function validateEncryptionValueForType(
    value: unknown,
    type: FhevmEncryptedType
  ): boolean {
    return validateEncryptionValue(value, type)
  }

  /**
   * Validate and store error if invalid
   *
   * @param fieldName - Field name for error tracking
   * @param value - Value to validate
   * @param type - FHEVM type
   * @returns true if valid, false otherwise
   */
  function validateEncryptionValueField(
    fieldName: string,
    value: unknown,
    type: FhevmEncryptedType
  ): boolean {
    const isValid = validateEncryptionValue(value, type)
    if (!isValid) {
      validationErrors.value[fieldName] = `Value out of range for ${String(type)}: ${String(value)}`
    } else {
      delete validationErrors.value[fieldName]
    }
    return isValid
  }

  /**
   * Assert encryption value is valid for type, throw if not
   *
   * @param value - Value to validate
   * @param type - FHEVM type
   * @throws Error if validation fails
   */
  function assertEncryptionValue(
    value: unknown,
    type: FhevmEncryptedType
  ): void {
    assertValidEncryptionValue(value, type)
  }

  /**
   * Validate a storage key
   *
   * @param key - Storage key to validate
   * @returns true if valid, false otherwise
   */
  function validateStorageKeyFormat(key: unknown): boolean {
    return isValidStorageKey(key)
  }

  /**
   * Validate a storage value
   *
   * @param value - Storage value to validate
   * @returns true if valid, false otherwise
   */
  function validateStorageValueFormat(value: unknown): boolean {
    return isValidStorageValue(value)
  }

  /**
   * Validate both storage key and value
   *
   * @param key - Storage key to validate
   * @param value - Storage value to validate
   * @returns true if both are valid, false otherwise
   */
  function validateStorageKeyValue(key: unknown, value: unknown): boolean {
    return isValidStorageKey(key) && isValidStorageValue(value)
  }

  /**
   * Get all validation errors
   *
   * @returns true if no validation errors
   */
  const isValid = {
    get value(): boolean {
      return Object.keys(validationErrors.value).length === 0
    },
  }

  /**
   * Clear all validation errors
   */
  function clearErrors(): void {
    validationErrors.value = {}
  }

  /**
   * Clear error for specific field
   *
   * @param fieldName - Field name to clear error for
   */
  function clearFieldError(fieldName: string): void {
    delete validationErrors.value[fieldName]
  }

  return {
    validationErrors,
    isValid,
    validateAddress,
    validateAddressField,
    assertAddress,
    validateFhevmType,
    validateFhevmTypeField,
    assertFhevmType,
    validateEncryptionValueForType,
    validateEncryptionValueField,
    assertEncryptionValue,
    validateStorageKeyFormat,
    validateStorageValueFormat,
    validateStorageKeyValue,
    clearErrors,
    clearFieldError,
  }
}

/**
 * Helper function - Validate an address
 *
 * @param address - Address to validate
 * @returns true if valid, false otherwise
 */
export function validateAddress(address: unknown): boolean {
  return isValidAddress(address)
}

/**
 * Helper function - Assert address is valid
 *
 * @param address - Address to validate
 * @param paramName - Optional parameter name
 * @throws Error if invalid
 */
export function assertAddress(address: unknown, paramName?: string): void {
  assertValidAddress(address, paramName)
}

/**
 * Helper function - Validate FHEVM type
 *
 * @param type - Type to validate
 * @returns true if valid, false otherwise
 */
export function validateFhevmType(type: unknown): boolean {
  return isValidFhevmType(type)
}

/**
 * Helper function - Assert FHEVM type is valid
 *
 * @param type - Type to validate
 * @throws Error if invalid
 */
export function assertFhevmType(type: unknown): void {
  assertValidFhevmType(type)
}

/**
 * Helper function - Validate encryption value
 *
 * @param value - Value to validate
 * @param type - FHEVM type
 * @returns true if valid, false otherwise
 */
export function validateEncryptionValueForType(
  value: unknown,
  type: FhevmEncryptedType
): boolean {
  return validateEncryptionValue(value, type)
}

/**
 * Helper function - Assert encryption value is valid
 *
 * @param value - Value to validate
 * @param type - FHEVM type
 * @throws Error if invalid
 */
export function assertEncryptionValue(
  value: unknown,
  type: FhevmEncryptedType
): void {
  assertValidEncryptionValue(value, type)
}

/**
 * Helper function - Validate storage key-value pair
 *
 * @param key - Storage key to validate
 * @param value - Storage value to validate
 * @returns true if both are valid, false otherwise
 */
export function validateStorageKeyValue(key: unknown, value: unknown): boolean {
  return isValidStorageKey(key) && isValidStorageValue(value)
}
