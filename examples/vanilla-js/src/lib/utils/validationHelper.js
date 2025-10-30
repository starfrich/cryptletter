/**
 * Validation Helper Wrapper for Vanilla JS
 *
 * Input validation for FHEVM operations.
 * Wraps SDK validation utilities with vanilla JS state management.
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
} from '@fhevm-sdk'

/**
 * Create a validation manager with reactive state
 *
 * @returns Object with validation functions and state
 *
 * @example
 * ```js
 * const validator = createValidationManager()
 *
 * validator.on('validationChange', (errors) => {
 *   console.log('Validation errors:', errors)
 *   // Update UI
 * })
 *
 * validator.validateAddressField('userAddress', userInput)
 * if (!validator.isValid()) {
 *   console.log(validator.getErrors())
 * }
 * ```
 */
export function createValidationManager() {
  // State
  const state = {
    validationErrors: {},
  }

  // Event listeners
  const listeners = {
    validationChange: [],
  }

  /**
   * Register event listener
   *
   * @param event - Event name
   * @param callback - Callback function
   */
  function on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = []
    }
    listeners[event].push(callback)
  }

  /**
   * Unregister event listener
   *
   * @param event - Event name
   * @param callback - Callback function
   */
  function off(event, callback) {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((cb) => cb !== callback)
    }
  }

  /**
   * Emit event to all listeners
   *
   * @param event - Event name
   * @param data - Event data
   */
  function emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach((cb) => cb(data))
    }
  }

  /**
   * Update state and emit change event
   *
   * @param updates - State updates
   */
  function updateState(updates) {
    Object.assign(state, updates)
    emit('validationChange', state.validationErrors)
  }

  /**
   * Validate an Ethereum address
   *
   * @param address - Address to validate
   * @returns true if valid, false otherwise
   */
  function validateAddress(address) {
    return isValidAddress(address)
  }

  /**
   * Validate and store error if invalid
   *
   * @param fieldName - Field name for error tracking
   * @param address - Address to validate
   * @returns true if valid, false otherwise
   */
  function validateAddressField(fieldName, address) {
    const isValid = isValidAddress(address)
    const newErrors = { ...state.validationErrors }
    if (!isValid) {
      newErrors[fieldName] = `Invalid address: ${String(address).slice(0, 20)}...`
    } else {
      delete newErrors[fieldName]
    }
    updateState({ validationErrors: newErrors })
    return isValid
  }

  /**
   * Assert that an address is valid, throw if not
   *
   * @param address - Address to validate
   * @param paramName - Optional parameter name for error message
   * @throws Error if address is invalid
   */
  function assertAddress(address, paramName) {
    assertValidAddress(address, paramName)
  }

  /**
   * Validate a FHEVM type
   *
   * @param type - Type to validate (e.g., "euint32", "euint64")
   * @returns true if valid, false otherwise
   */
  function validateFhevmType(type) {
    return isValidFhevmType(type)
  }

  /**
   * Validate and store error if invalid
   *
   * @param fieldName - Field name for error tracking
   * @param type - Type to validate
   * @returns true if valid, false otherwise
   */
  function validateFhevmTypeField(fieldName, type) {
    const isValid = isValidFhevmType(type)
    const newErrors = { ...state.validationErrors }
    if (!isValid) {
      newErrors[fieldName] = `Invalid FHEVM type: ${String(type)}`
    } else {
      delete newErrors[fieldName]
    }
    updateState({ validationErrors: newErrors })
    return isValid
  }

  /**
   * Assert that a FHEVM type is valid, throw if not
   *
   * @param type - Type to validate
   * @throws Error if type is invalid
   */
  function assertFhevmType(type) {
    assertValidFhevmType(type)
  }

  /**
   * Validate an encryption value for a given FHEVM type
   *
   * @param value - Value to validate
   * @param type - FHEVM type (e.g., "euint32")
   * @returns true if valid, false otherwise
   */
  function validateEncryptionValueForType(value, type) {
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
  function validateEncryptionValueField(fieldName, value, type) {
    const isValid = validateEncryptionValue(value, type)
    const newErrors = { ...state.validationErrors }
    if (!isValid) {
      newErrors[fieldName] = `Value out of range for ${String(type)}: ${String(value)}`
    } else {
      delete newErrors[fieldName]
    }
    updateState({ validationErrors: newErrors })
    return isValid
  }

  /**
   * Assert encryption value is valid for type, throw if not
   *
   * @param value - Value to validate
   * @param type - FHEVM type
   * @throws Error if validation fails
   */
  function assertEncryptionValue(value, type) {
    assertValidEncryptionValue(value, type)
  }

  /**
   * Validate a storage key
   *
   * @param key - Storage key to validate
   * @returns true if valid, false otherwise
   */
  function validateStorageKeyFormat(key) {
    return isValidStorageKey(key)
  }

  /**
   * Validate a storage value
   *
   * @param value - Storage value to validate
   * @returns true if valid, false otherwise
   */
  function validateStorageValueFormat(value) {
    return isValidStorageValue(value)
  }

  /**
   * Validate both storage key and value
   *
   * @param key - Storage key to validate
   * @param value - Storage value to validate
   * @returns true if both are valid, false otherwise
   */
  function validateStorageKeyValue(key, value) {
    return isValidStorageKey(key) && isValidStorageValue(value)
  }

  /**
   * Check if validation has no errors
   *
   * @returns true if no validation errors
   */
  function isValid() {
    return Object.keys(state.validationErrors).length === 0
  }

  /**
   * Get all validation errors
   *
   * @returns Object with field errors
   */
  function getErrors() {
    return { ...state.validationErrors }
  }

  /**
   * Get error for specific field
   *
   * @param fieldName - Field name
   * @returns Error message or undefined
   */
  function getFieldError(fieldName) {
    return state.validationErrors[fieldName]
  }

  /**
   * Clear all validation errors
   */
  function clearErrors() {
    updateState({ validationErrors: {} })
  }

  /**
   * Clear error for specific field
   *
   * @param fieldName - Field name to clear error for
   */
  function clearFieldError(fieldName) {
    const newErrors = { ...state.validationErrors }
    delete newErrors[fieldName]
    updateState({ validationErrors: newErrors })
  }

  /**
   * Get current validation state
   *
   * @returns Current validation state
   */
  function getState() {
    return { ...state }
  }

  return {
    state,
    getState,
    on,
    off,
    emit,
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
    isValid,
    getErrors,
    getFieldError,
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
export function validateAddress(address) {
  return isValidAddress(address)
}

/**
 * Helper function - Assert address is valid
 *
 * @param address - Address to validate
 * @param paramName - Optional parameter name
 * @throws Error if invalid
 */
export function assertAddress(address, paramName) {
  assertValidAddress(address, paramName)
}

/**
 * Helper function - Validate FHEVM type
 *
 * @param type - Type to validate
 * @returns true if valid, false otherwise
 */
export function validateFhevmType(type) {
  return isValidFhevmType(type)
}

/**
 * Helper function - Assert FHEVM type is valid
 *
 * @param type - Type to validate
 * @throws Error if invalid
 */
export function assertFhevmType(type) {
  assertValidFhevmType(type)
}

/**
 * Helper function - Validate encryption value
 *
 * @param value - Value to validate
 * @param type - FHEVM type
 * @returns true if valid, false otherwise
 */
export function validateEncryptionValueForType(value, type) {
  return validateEncryptionValue(value, type)
}

/**
 * Helper function - Assert encryption value is valid
 *
 * @param value - Value to validate
 * @param type - FHEVM type
 * @throws Error if invalid
 */
export function assertEncryptionValue(value, type) {
  assertValidEncryptionValue(value, type)
}

/**
 * Helper function - Validate storage key-value pair
 *
 * @param key - Storage key to validate
 * @param value - Storage value to validate
 * @returns true if both are valid, false otherwise
 */
export function validateStorageKeyValue(key, value) {
  return isValidStorageKey(key) && isValidStorageValue(value)
}
