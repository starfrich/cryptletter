/**
 * Retry Helper Wrapper for Next.js
 *
 * Retry strategies optimized for FHEVM operations.
 * Wraps SDK retry utilities with Next.js-specific configurations.
 */

import {
  retryAsyncOrThrow,
  calculateBackoffDelay,
  type RetryOptions,
} from "@fhevm-sdk/utils";

/**
 * Retry options optimized for transaction receipt polling
 */
const TRANSACTION_RECEIPT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 30, // ~2-3 minutes with backoff
  initialDelayMs: 1000,
  backoffMultiplier: 1.3,
  maxDelayMs: 5000,
};

/**
 * Retry options optimized for network calls
 */
const NETWORK_CALL_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 3000,
};

/**
 * Retry options optimized for encryption/decryption operations
 */
const ENCRYPTION_OPERATION_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 300,
  backoffMultiplier: 1.5,
  maxDelayMs: 1000,
};

/**
 * Retry async operation with exponential backoff for transaction receipt polling
 *
 * @param fn - Async function to retry
 * @returns Promise with the result of the successful call
 * @throws Error if all retries fail
 *
 * @example
 * ```tsx
 * const receipt = await retryTransactionReceipt(async () => {
 *   return await getTransactionReceipt(txHash);
 * });
 * ```
 */
export async function retryTransactionReceipt<T>(
  fn: () => Promise<T>
): Promise<T> {
  return retryAsyncOrThrow(fn, TRANSACTION_RECEIPT_RETRY_OPTIONS);
}

/**
 * Retry async operation for generic network calls
 *
 * @param fn - Async function to retry
 * @param options - Optional custom retry options
 * @returns Promise with the result of the successful call
 * @throws Error if all retries fail
 *
 * @example
 * ```tsx
 * const data = await retryNetworkCall(async () => {
 *   return await fetch(url).then(r => r.json());
 * });
 * ```
 */
export async function retryNetworkCall<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  return retryAsyncOrThrow(fn, { ...NETWORK_CALL_RETRY_OPTIONS, ...options });
}

/**
 * Retry async operation for encryption/decryption operations
 *
 * @param fn - Async function to retry
 * @param options - Optional custom retry options
 * @returns Promise with the result of the successful call
 * @throws Error if all retries fail
 *
 * @example
 * ```tsx
 * const encrypted = await retryEncryptionOperation(async () => {
 *   return await encryptWith(instance, value, euint32Type);
 * });
 * ```
 */
export async function retryEncryptionOperation<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  return retryAsyncOrThrow(fn, { ...ENCRYPTION_OPERATION_RETRY_OPTIONS, ...options });
}

/**
 * Retry async operation with custom retry options
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
  };
  return retryAsyncOrThrow(fn, { ...defaultOptions, ...options });
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
 *
 * @example
 * ```tsx
 * const delay = calculateRetryDelay(2, 500, 2, 5000, true);
 * // Returns ~2000 (500 * 2^2) with ±20% jitter
 * ```
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
  );
}
