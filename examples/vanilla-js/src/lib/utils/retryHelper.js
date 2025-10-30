/**
 * Retry Helper Wrapper for Vanilla JS
 *
 * Retry strategies optimized for FHEVM operations.
 * Wraps SDK retry utilities with vanilla JS state management.
 */

import {
  retryAsyncOrThrow,
  calculateBackoffDelay,
} from '@fhevm-sdk'

/**
 * Retry options optimized for transaction receipt polling
 */
const TRANSACTION_RECEIPT_RETRY_OPTIONS = {
  maxRetries: 30, // ~2-3 minutes with backoff
  initialDelayMs: 1000,
  backoffMultiplier: 1.3,
  maxDelayMs: 5000,
}

/**
 * Retry options optimized for network calls
 */
const NETWORK_CALL_RETRY_OPTIONS = {
  maxRetries: 5,
  initialDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 3000,
}

/**
 * Retry options optimized for encryption/decryption operations
 */
const ENCRYPTION_OPERATION_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 300,
  backoffMultiplier: 1.5,
  maxDelayMs: 1000,
}

/**
 * Create a retry manager with reactive state
 *
 * @returns Object with retry functions and state
 *
 * @example
 * ```js
 * const retry = createRetryManager()
 *
 * retry.on('retryProgress', (state) => {
 *   console.log(`Attempt ${state.attempt}/${state.maxRetries}`)
 *   // Update UI
 * })
 *
 * try {
 *   const result = await retry.retryTransactionReceipt(async () => {
 *     return await getTransactionReceipt(txHash)
 *   })
 * } catch (e) {
 *   console.error('Max retries exceeded:', e)
 * }
 * ```
 */
export function createRetryManager() {
  // State
  const state = {
    isRetrying: false,
    retryAttempt: 0,
    retryMessage: '',
  }

  // Event listeners
  const listeners = {
    retryProgress: [],
    retryComplete: [],
  }

  /**
   * Register event listener
   *
   * @param event - Event name ('retryProgress' or 'retryComplete')
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
    if (state.isRetrying) {
      emit('retryProgress', { ...state })
    }
  }

  /**
   * Retry async operation with exponential backoff for transaction receipt polling
   *
   * @param fn - Async function to retry
   * @returns Promise with the result of the successful call
   * @throws Error if all retries fail
   */
  async function retryTransactionReceipt(fn) {
    return retryAsyncOrThrow(fn, TRANSACTION_RECEIPT_RETRY_OPTIONS)
  }

  /**
   * Retry async operation for generic network calls
   *
   * @param fn - Async function to retry
   * @param options - Optional custom retry options
   * @returns Promise with the result of the successful call
   * @throws Error if all retries fail
   */
  async function retryNetworkCall(fn, options) {
    return retryAsyncOrThrow(fn, { ...NETWORK_CALL_RETRY_OPTIONS, ...options })
  }

  /**
   * Retry async operation for encryption/decryption operations
   *
   * @param fn - Async function to retry
   * @param options - Optional custom retry options
   * @returns Promise with the result of the successful call
   * @throws Error if all retries fail
   */
  async function retryEncryptionOperation(fn, options) {
    return retryAsyncOrThrow(fn, { ...ENCRYPTION_OPERATION_RETRY_OPTIONS, ...options })
  }

  /**
   * Retry async operation with custom retry options
   *
   * @param fn - Async function to retry
   * @param options - Custom retry options
   * @returns Promise with the result of the successful call
   * @throws Error if all retries fail
   */
  async function retryAsyncOperation(fn, options = {}) {
    const defaultOptions = {
      maxRetries: 3,
      initialDelayMs: 500,
      backoffMultiplier: 2,
    }
    return retryAsyncOrThrow(fn, { ...defaultOptions, ...options })
  }

  /**
   * Calculate backoff delay for retry attempt
   *
   * @param attempt - Current attempt number (0-indexed)
   * @param initialDelayMs - Initial delay in ms
   * @param backoffMultiplier - Backoff multiplier
   * @param maxDelayMs - Maximum delay cap in ms
   * @param useJitter - Whether to add random jitter
   * @returns Delay in milliseconds for this attempt
   */
  function calculateRetryDelay(
    attempt,
    initialDelayMs = 500,
    backoffMultiplier = 2,
    maxDelayMs = 5000,
    useJitter = true
  ) {
    return calculateBackoffDelay(
      attempt,
      initialDelayMs,
      maxDelayMs,
      backoffMultiplier,
      useJitter
    )
  }

  /**
   * Retry with progress tracking
   *
   * @param label - Label for the operation
   * @param fn - Async function to retry
   * @param options - Custom retry options
   * @returns Promise with the result of the successful call
   *
   * @example
   * ```js
   * const result = await retry.retryWithProgress(
   *   'fetch-data',
   *   async () => await fetch(url),
   *   { maxRetries: 5 }
   * )
   * // Monitor progress with: isRetrying, retryAttempt, retryMessage
   * ```
   */
  async function retryWithProgress(label, fn, options = {}) {
    updateState({ isRetrying: true, retryAttempt: 0, retryMessage: '' })

    const mergedOptions = {
      maxRetries: 3,
      initialDelayMs: 500,
      backoffMultiplier: 2,
      ...options,
    }

    try {
      for (let attempt = 0; attempt <= (mergedOptions.maxRetries ?? 3); attempt++) {
        updateState({
          retryAttempt: attempt,
          retryMessage: `${label} - Attempt ${attempt + 1}/${(mergedOptions.maxRetries ?? 3) + 1}`,
        })

        try {
          const result = await fn()
          updateState({
            retryMessage: `${label} - Success`,
          })
          emit('retryComplete', { success: true, attempt, label })
          return result
        } catch (error) {
          if (attempt === (mergedOptions.maxRetries ?? 3)) {
            throw error
          }

          const delay = calculateRetryDelay(
            attempt,
            mergedOptions.initialDelayMs,
            mergedOptions.backoffMultiplier,
            mergedOptions.maxDelayMs,
            true
          )

          updateState({
            retryMessage: `${label} - Retrying in ${Math.round(delay / 1000)}s...`,
          })
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }

      throw new Error(`${label} - All retries exhausted`)
    } finally {
      updateState({ isRetrying: false })
    }
  }

  /**
   * Get current retry state
   *
   * @returns Current retry state
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
    retryTransactionReceipt,
    retryNetworkCall,
    retryEncryptionOperation,
    retryAsyncOperation,
    retryWithProgress,
    calculateRetryDelay,
  }
}

/**
 * Helper function - Retry transaction receipt polling
 *
 * @param fn - Async function to retry
 * @returns Promise with the result of the successful call
 * @throws Error if all retries fail
 */
export async function retryTransactionReceipt(fn) {
  return retryAsyncOrThrow(fn, TRANSACTION_RECEIPT_RETRY_OPTIONS)
}

/**
 * Helper function - Retry generic network calls
 *
 * @param fn - Async function to retry
 * @param options - Optional custom retry options
 * @returns Promise with the result of the successful call
 * @throws Error if all retries fail
 */
export async function retryNetworkCall(fn, options) {
  return retryAsyncOrThrow(fn, { ...NETWORK_CALL_RETRY_OPTIONS, ...options })
}

/**
 * Helper function - Retry encryption operations
 *
 * @param fn - Async function to retry
 * @param options - Optional custom retry options
 * @returns Promise with the result of the successful call
 * @throws Error if all retries fail
 */
export async function retryEncryptionOperation(fn, options) {
  return retryAsyncOrThrow(fn, { ...ENCRYPTION_OPERATION_RETRY_OPTIONS, ...options })
}

/**
 * Helper function - Retry with custom options
 *
 * @param fn - Async function to retry
 * @param options - Custom retry options
 * @returns Promise with the result of the successful call
 * @throws Error if all retries fail
 */
export async function retryAsyncOperation(fn, options = {}) {
  const defaultOptions = {
    maxRetries: 3,
    initialDelayMs: 500,
    backoffMultiplier: 2,
  }
  return retryAsyncOrThrow(fn, { ...defaultOptions, ...options })
}

/**
 * Helper function - Calculate retry delay
 *
 * @param attempt - Current attempt number
 * @param initialDelayMs - Initial delay in ms
 * @param backoffMultiplier - Backoff multiplier
 * @param maxDelayMs - Maximum delay cap
 * @param useJitter - Whether to add jitter
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(
  attempt,
  initialDelayMs = 500,
  backoffMultiplier = 2,
  maxDelayMs = 5000,
  useJitter = true
) {
  return calculateBackoffDelay(
    attempt,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    useJitter
  )
}
