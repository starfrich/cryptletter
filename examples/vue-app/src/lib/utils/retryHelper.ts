/**
 * Retry Helper Wrapper for Vue
 *
 * Retry strategies optimized for FHEVM operations.
 * Wraps SDK retry utilities with Vue-specific configurations.
 */

import { ref } from 'vue'
import {
  retryAsyncOrThrow,
  calculateBackoffDelay,
  type RetryOptions,
} from '@fhevm-sdk/utils'

/**
 * Retry options optimized for transaction receipt polling
 */
const TRANSACTION_RECEIPT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 30, // ~2-3 minutes with backoff
  initialDelayMs: 1000,
  backoffMultiplier: 1.3,
  maxDelayMs: 5000,
}

/**
 * Retry options optimized for network calls
 */
const NETWORK_CALL_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 3000,
}

/**
 * Retry options optimized for encryption/decryption operations
 */
const ENCRYPTION_OPERATION_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 300,
  backoffMultiplier: 1.5,
  maxDelayMs: 1000,
}

/**
 * Vue composable for managing retry operations
 *
 * @returns Object with retry functions and reactive retry state
 *
 * @example
 * ```ts
 * const { retryTransactionReceipt, isRetrying, retryAttempt } = useRetry()
 *
 * try {
 *   const receipt = await retryTransactionReceipt(async () => {
 *     return await getTransactionReceipt(txHash)
 *   })
 * } catch (e) {
 *   console.error('Max retries exceeded:', e)
 * }
 * ```
 */
export function useRetry() {
  const isRetrying = ref(false)
  const retryAttempt = ref(0)
  const retryMessage = ref('')

  /**
   * Retry async operation with exponential backoff for transaction receipt polling
   *
   * @param fn - Async function to retry
   * @returns Promise with the result of the successful call
   * @throws Error if all retries fail
   */
  async function retryTransactionReceipt<T>(
    fn: () => Promise<T>
  ): Promise<T> {
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
  async function retryNetworkCall<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T> {
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
  async function retryEncryptionOperation<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T> {
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
  async function retryAsyncOperation<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const defaultOptions: RetryOptions = {
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
    attempt: number,
    initialDelayMs: number = 500,
    backoffMultiplier: number = 2,
    maxDelayMs: number = 5000,
    useJitter: boolean = true
  ): number {
    return calculateBackoffDelay(
      attempt,
      initialDelayMs,
      maxDelayMs,
      backoffMultiplier,
      useJitter
    )
  }

  /**
   * Retry with progress tracking (Vue-reactive)
   *
   * @param label - Label for the operation
   * @param fn - Async function to retry
   * @param options - Custom retry options
   * @returns Promise with the result of the successful call
   *
   * @example
   * ```ts
   * const result = await retryWithProgress(
   *   'fetch-data',
   *   async () => await fetch(url),
   *   { maxRetries: 5 }
   * )
   * // Monitor progress with: isRetrying, retryAttempt, retryMessage
   * ```
   */
  async function retryWithProgress<T>(
    label: string,
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    isRetrying.value = true
    retryAttempt.value = 0
    const mergedOptions: RetryOptions = {
      maxRetries: 3,
      initialDelayMs: 500,
      backoffMultiplier: 2,
      ...options,
    }

    try {
      for (let attempt = 0; attempt <= (mergedOptions.maxRetries ?? 3); attempt++) {
        retryAttempt.value = attempt
        retryMessage.value = `${label} - Attempt ${attempt + 1}/${(mergedOptions.maxRetries ?? 3) + 1}`

        try {
          const result = await fn()
          retryMessage.value = `${label} - Success`
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

          retryMessage.value = `${label} - Retrying in ${Math.round(delay / 1000)}s...`
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }

      throw new Error(`${label} - All retries exhausted`)
    } finally {
      isRetrying.value = false
    }
  }

  return {
    isRetrying,
    retryAttempt,
    retryMessage,
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
export async function retryTransactionReceipt<T>(
  fn: () => Promise<T>
): Promise<T> {
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
export async function retryNetworkCall<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
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
export async function retryEncryptionOperation<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
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
export async function retryAsyncOperation<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const defaultOptions: RetryOptions = {
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
  attempt: number,
  initialDelayMs: number = 500,
  backoffMultiplier: number = 2,
  maxDelayMs: number = 5000,
  useJitter: boolean = true
): number {
  return calculateBackoffDelay(
    attempt,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    useJitter
  )
}
