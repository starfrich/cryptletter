/**
 * Error Handler Wrapper for Vanilla JS
 *
 * Centralizes error handling with user-friendly recovery suggestions.
 * Wraps SDK error utilities with vanilla JS state management.
 */

import {
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
  isRetryable,
  isUserActionError,
} from '@fhevm-sdk'

/**
 * Create an error handler with reactive state
 *
 * @returns Object with error handling functions and state
 *
 * @example
 * ```js
 * const errorHandler = createErrorHandler()
 *
 * errorHandler.on('error', (message) => {
 *   console.log('Error:', message)
 *   // Update UI
 * })
 *
 * try {
 *   // ... operation
 * } catch (e) {
 *   errorHandler.handleError(e)
 * }
 * ```
 */
export function createErrorHandler() {
  // State
  const state = {
    errorMessage: '',
    lastError: null,
    isVisible: false,
  }

  // Event listeners
  const listeners = {
    error: [],
    stateChange: [],
  }

  /**
   * Register event listener
   *
   * @param event - Event name ('error' or 'stateChange')
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
    emit('stateChange', state)
  }

  /**
   * Handle an error and update state
   *
   * @param error - The error to handle
   * @returns User-friendly error message with recovery suggestions
   */
  function handleError(error) {
    try {
      state.lastError = error
      const suggestion = getErrorRecoverySuggestion(error)
      const message = formatErrorSuggestion(suggestion)
      updateState({
        errorMessage: message,
        isVisible: true,
      })
      emit('error', message)
      return message
    } catch {
      // Fallback if error handling fails
      const fallbackMsg = 'An unexpected error occurred. Please try again.'
      updateState({
        errorMessage: fallbackMsg,
        isVisible: true,
      })
      emit('error', fallbackMsg)
      return fallbackMsg
    }
  }

  /**
   * Get error recovery suggestion for an error
   *
   * @param error - The error to analyze
   * @returns Error recovery suggestion with title and message
   */
  function getErrorSuggestion(error) {
    return getErrorRecoverySuggestion(error)
  }

  /**
   * Check if an error should be retried
   *
   * @param error - The error to check
   * @returns true if error is retryable, false otherwise
   */
  function shouldRetry(error) {
    return isRetryable(error)
  }

  /**
   * Check if error was caused by user action (e.g., wallet rejection)
   *
   * @param error - The error to check
   * @returns true if error is user-action related, false otherwise
   */
  function isUserError(error) {
    return isUserActionError(error)
  }

  /**
   * Clear the current error message
   */
  function clearError() {
    updateState({
      errorMessage: '',
      lastError: null,
      isVisible: false,
    })
  }

  /**
   * Initialize global error handling (optional)
   *
   * Can be called at app initialization to set up global error handlers
   */
  function initializeErrorHandling() {
    // Set up global unhandled error listeners
    if (typeof window !== 'undefined') {
      // Global error handler
      window.addEventListener('error', (event) => {
        console.error('Unhandled error:', event.error)
        handleError(event.error)
      })

      // Unhandled promise rejection
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason)
        handleError(event.reason)
      })
    }
  }

  /**
   * Get current error state
   *
   * @returns Current error state
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
    handleError,
    getErrorSuggestion,
    shouldRetry,
    isUserError,
    clearError,
    initializeErrorHandling,
  }
}

/**
 * Helper function - Handle an error and return a user-friendly message
 *
 * @param error - The error to handle
 * @returns User-friendly error message with recovery suggestions
 */
export function handleError(error) {
  try {
    const suggestion = getErrorRecoverySuggestion(error)
    return formatErrorSuggestion(suggestion)
  } catch {
    // Fallback if error handling fails
    return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Helper function - Get error recovery suggestion
 *
 * @param error - The error to analyze
 * @returns Error recovery suggestion with title and message
 */
export function getErrorSuggestion(error) {
  return getErrorRecoverySuggestion(error)
}

/**
 * Helper function - Check if an error should be retried
 *
 * @param error - The error to check
 * @returns true if error is retryable, false otherwise
 */
export function shouldRetry(error) {
  return isRetryable(error)
}

/**
 * Helper function - Check if error was caused by user action
 *
 * @param error - The error to check
 * @returns true if error is user-action related, false otherwise
 */
export function isUserError(error) {
  return isUserActionError(error)
}
