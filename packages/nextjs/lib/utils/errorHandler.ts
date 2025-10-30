/**
 * Error Handler Wrapper for Next.js
 *
 * Centralizes error handling with user-friendly recovery suggestions.
 * Wraps SDK error utilities with Next.js-specific logic.
 */

import {
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
  isRetryable,
  isUserActionError,
  type ErrorRecoverySuggestion,
} from "@fhevm-sdk/utils";

/**
 * Handle an error and return a user-friendly message with recovery suggestions
 *
 * @param error - The error to handle
 * @returns User-friendly error message with recovery suggestions
 *
 * @example
 * ```tsx
 * catch (e) {
 *   const message = handleError(e);
 *   setErrorMessage(message);
 * }
 * ```
 */
export function handleError(error: unknown): string {
  try {
    const suggestion = getErrorRecoverySuggestion(error);
    return formatErrorSuggestion(suggestion);
  } catch {
    // Fallback if error handling fails
    return "An unexpected error occurred. Please try again.";
  }
}

/**
 * Get error recovery suggestion for an error
 *
 * @param error - The error to analyze
 * @returns Error recovery suggestion with title and message
 */
export function getErrorSuggestion(error: unknown): ErrorRecoverySuggestion {
  return getErrorRecoverySuggestion(error);
}

/**
 * Check if an error should be retried
 *
 * @param error - The error to check
 * @returns true if error is retryable, false otherwise
 */
export function shouldRetry(error: unknown): boolean {
  return isRetryable(error);
}

/**
 * Check if error was caused by user action (e.g., wallet rejection)
 *
 * @param error - The error to check
 * @returns true if error is user-action related, false otherwise
 */
export function isUserError(error: unknown): boolean {
  return isUserActionError(error);
}

/**
 * Initialize global error handling (optional)
 *
 * Can be called at app initialization to set up global error handlers
 */
export function initializeErrorHandling(): void {
  // Set up global unhandled error listeners if needed
  if (typeof window !== "undefined") {
    // Global error handler
    window.addEventListener("error", (event) => {
      console.error("Unhandled error:", event.error);
    });

    // Unhandled promise rejection
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason);
    });
  }
}
