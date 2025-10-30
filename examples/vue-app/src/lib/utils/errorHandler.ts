/**
 * Error Handler Wrapper for Vue
 *
 * Centralizes error handling with user-friendly recovery suggestions.
 * Wraps SDK error utilities with Vue-specific logic.
 */

import { ref } from 'vue'
import {
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
  isRetryable,
  isUserActionError,
  type ErrorRecoverySuggestion,
} from '@fhevm-sdk/utils'

/**
 * Vue composable for centralized error handling
 *
 * @returns Object with error handling functions and reactive error state
 *
 * @example
 * ```ts
 * const { errorMessage, handleError, isUserError, shouldRetry } = useErrorHandler()
 *
 * try {
 *   // ... operation
 * } catch (e) {
 *   handleError(e)
 * }
 * ```
 */
export function useErrorHandler() {
  const errorMessage = ref<string>('')
  const lastError = ref<unknown>(null)
  const isVisible = ref(false)

  /**
   * Handle an error and update reactive state
   *
   * @param error - The error to handle
   * @returns User-friendly error message with recovery suggestions
   */
  function handleError(error: unknown): string {
    try {
      lastError.value = error
      const suggestion = getErrorRecoverySuggestion(error)
      const message = formatErrorSuggestion(suggestion)
      errorMessage.value = message
      isVisible.value = true
      return message
    } catch {
      // Fallback if error handling fails
      const fallbackMsg = 'An unexpected error occurred. Please try again.'
      errorMessage.value = fallbackMsg
      isVisible.value = true
      return fallbackMsg
    }
  }

  /**
   * Get error recovery suggestion for an error
   *
   * @param error - The error to analyze
   * @returns Error recovery suggestion with title and message
   */
  function getErrorSuggestion(error: unknown): ErrorRecoverySuggestion {
    return getErrorRecoverySuggestion(error)
  }

  /**
   * Check if an error should be retried
   *
   * @param error - The error to check
   * @returns true if error is retryable, false otherwise
   */
  function shouldRetry(error: unknown): boolean {
    return isRetryable(error)
  }

  /**
   * Check if error was caused by user action (e.g., wallet rejection)
   *
   * @param error - The error to check
   * @returns true if error is user-action related, false otherwise
   */
  function isUserError(error: unknown): boolean {
    return isUserActionError(error)
  }

  /**
   * Clear the current error message
   */
  function clearError(): void {
    errorMessage.value = ''
    lastError.value = null
    isVisible.value = false
  }

  /**
   * Initialize global error handling (optional)
   *
   * Can be called at app initialization to set up global error handlers
   */
  function initializeErrorHandling(): void {
    // Set up global unhandled error listeners if needed
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

  return {
    errorMessage,
    lastError,
    isVisible,
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
export function handleError(error: unknown): string {
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
export function getErrorSuggestion(error: unknown): ErrorRecoverySuggestion {
  return getErrorRecoverySuggestion(error)
}

/**
 * Helper function - Check if an error should be retried
 *
 * @param error - The error to check
 * @returns true if error is retryable, false otherwise
 */
export function shouldRetry(error: unknown): boolean {
  return isRetryable(error)
}

/**
 * Helper function - Check if error was caused by user action
 *
 * @param error - The error to check
 * @returns true if error is user-action related, false otherwise
 */
export function isUserError(error: unknown): boolean {
  return isUserActionError(error)
}
