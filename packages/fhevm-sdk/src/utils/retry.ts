/**
 * Retry Logic Utilities
 *
 * This module provides retry mechanisms for FHEVM operations with
 * exponential backoff and intelligent error handling.
 *
 * @module utils/retry
 */

import { FhevmError, FhevmErrorCode, FhevmAbortError } from "../types/errors";
import { isRetryable } from "./errors";

// ============================================================================
// Retry Options & Configuration
// ============================================================================

/**
 * Options for retrying operations
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;

  /** Initial delay in milliseconds before first retry (default: 100) */
  initialDelayMs?: number;

  /** Maximum delay in milliseconds between retries (default: 5000) */
  maxDelayMs?: number;

  /** Backoff multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;

  /** Add random jitter to delay? (default: true) */
  useJitter?: boolean;

  /** Optional abort signal to cancel retries */
  signal?: AbortSignal;

  /** Optional callback for retry attempts */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;

  /** Predicate to determine if error is retryable (default: isRetryable) */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean;

  /** The result if successful */
  result?: T;

  /** The error if failed */
  error?: Error;

  /** Number of attempts made */
  attempts: number;

  /** Total time spent retrying (ms) */
  totalTimeMs: number;
}

// ============================================================================
// Retry Core Functions
// ============================================================================

/**
 * Calculate delay for exponential backoff with optional jitter
 *
 * @param attempt - The retry attempt number (starting from 0)
 * @param initialDelayMs - Initial delay
 * @param maxDelayMs - Maximum delay
 * @param backoffMultiplier - Exponential backoff multiplier
 * @param useJitter - Whether to add random jitter
 * @returns Delay in milliseconds
 *
 * @example
 * ```typescript
 * const delay = calculateBackoffDelay(2, 100, 5000, 2, true);
 * // delay ≈ 400 ± 20% (with jitter)
 * ```
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  useJitter: boolean
): number {
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  if (!useJitter) {
    return cappedDelay;
  }

  // Add ±20% jitter
  const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.max(0, cappedDelay + jitter);
}

/**
 * Sleep for a given duration
 *
 * @param ms - Milliseconds to sleep
 * @param signal - Optional abort signal to cancel sleep
 * @throws {FhevmAbortError} If signal is aborted
 */
export async function sleep(
  ms: number,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(new FhevmAbortError("Sleep was cancelled"));
      });
    }
  });
}

/**
 * Retry an async operation with exponential backoff
 *
 * Automatically retries operations that fail with retryable errors.
 * Uses exponential backoff with optional jitter to avoid thundering herd.
 *
 * @param operation - Async function to retry
 * @param options - Retry options
 * @returns Retry result with success status and attempts info
 *
 * @example
 * ```typescript
 * const result = await retryAsync(
 *   async () => {
 *     return await createFhevmInstance(params);
 *   },
 *   {
 *     maxRetries: 3,
 *     initialDelayMs: 100,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms`, error.message);
 *     }
 *   }
 * );
 *
 * if (result.success) {
 *   const instance = result.result;
 * } else {
 *   console.error(`Failed after ${result.attempts} attempts`, result.error);
 * }
 * ```
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
    useJitter = true,
    signal,
    onRetry,
    isRetryable: shouldRetry = isRetryable,
  } = options;

  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check for abort signal
    if (signal?.aborted) {
      return {
        success: false,
        error: new FhevmAbortError("Operation was cancelled"),
        attempts: attempt,
        totalTimeMs: Date.now() - startTime,
      };
    }

    try {
      const result = await operation();
      return {
        success: true,
        result,
        attempts: attempt + 1,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < maxRetries && shouldRetry(error)) {
        const delayMs = calculateBackoffDelay(
          attempt,
          initialDelayMs,
          maxDelayMs,
          backoffMultiplier,
          useJitter
        );

        onRetry?.(attempt + 1, lastError, delayMs);

        try {
          await sleep(delayMs, signal);
        } catch (sleepError) {
          return {
            success: false,
            error: sleepError instanceof Error ? sleepError : lastError,
            attempts: attempt + 1,
            totalTimeMs: Date.now() - startTime,
          };
        }
      } else {
        // No more retries or not retryable
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
          totalTimeMs: Date.now() - startTime,
        };
      }
    }
  }

  return {
    success: false,
    error: lastError || new Error("Unknown error"),
    attempts: maxRetries + 1,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Retry an async operation with a maximum timeout
 *
 * Combines retry logic with a total timeout constraint.
 *
 * @param operation - Async function to retry
 * @param timeoutMs - Total timeout in milliseconds
 * @param options - Retry options
 * @returns Retry result
 *
 * @example
 * ```typescript
 * const result = await retryAsyncWithTimeout(
 *   async () => createFhevmInstance(params),
 *   10000, // 10 second timeout
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function retryAsyncWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await retryAsync(operation, {
      ...options,
      signal: controller.signal,
    });

    if (!result.success && result.totalTimeMs >= timeoutMs) {
      result.error = new FhevmError(
        FhevmErrorCode.OPERATION_TIMEOUT,
        `Operation timed out after ${timeoutMs}ms`
      );
    }

    return result;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Wrap an async function with automatic retry logic
 *
 * Creates a retryable version of an async function that automatically
 * retries on failure.
 *
 * @param operation - Async function to wrap
 * @param options - Retry options
 * @returns Wrapped function that returns a RetryResult
 *
 * @example
 * ```typescript
 * const createInstanceWithRetry = retryWrap(
 *   async (params) => createFhevmInstance(params),
 *   { maxRetries: 5, initialDelayMs: 200 }
 * );
 *
 * const result = await createInstanceWithRetry(params);
 * if (result.success) {
 *   console.log("Instance created", result.result);
 * }
 * ```
 */
export function retryWrap<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  return async (...args: T): Promise<RetryResult<R>> => {
    return retryAsync(() => operation(...args), options);
  };
}

/**
 * Retry an async operation with exponential backoff and throw on failure
 *
 * Similar to retryAsync but throws an error instead of returning a result.
 * Useful when you want exceptions instead of result objects.
 *
 * @param operation - Async function to retry
 * @param options - Retry options
 * @returns The result of the successful operation
 * @throws {Error} If all retries fail
 *
 * @example
 * ```typescript
 * try {
 *   const instance = await retryAsyncOrThrow(
 *     async () => createFhevmInstance(params),
 *     { maxRetries: 3 }
 *   );
 * } catch (error) {
 *   console.error("Failed to create instance:", error);
 * }
 * ```
 */
export async function retryAsyncOrThrow<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const result = await retryAsync(operation, options);

  if (result.success) {
    return result.result!;
  }

  throw result.error || new Error("Operation failed");
}

// ============================================================================
// Sync Retry Functions
// ============================================================================

/**
 * Retry a synchronous operation with exponential backoff
 *
 * @param operation - Sync function to retry
 * @param options - Retry options (note: signal is not supported for sync operations)
 * @returns Retry result
 *
 * @example
 * ```typescript
 * const result = retrySyncOrThrow(
 *   () => validateAddress(address),
 *   { maxRetries: 2 }
 * );
 * ```
 */
export function retrySync<T>(
  operation: () => T,
  options: Omit<RetryOptions, "signal"> = {}
): RetryResult<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
    useJitter = true,
    onRetry,
    isRetryable: shouldRetry = isRetryable,
  } = options;

  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = operation();
      return {
        success: true,
        result,
        attempts: attempt + 1,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries && shouldRetry(error)) {
        const delayMs = calculateBackoffDelay(
          attempt,
          initialDelayMs,
          maxDelayMs,
          backoffMultiplier,
          useJitter
        );

        onRetry?.(attempt + 1, lastError, delayMs);

        // Simple sleep for sync operations
        const endTime = Date.now() + delayMs;
        while (Date.now() < endTime) {
          // Busy wait for sync retry
        }
      } else {
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
          totalTimeMs: Date.now() - startTime,
        };
      }
    }
  }

  return {
    success: false,
    error: lastError || new Error("Unknown error"),
    attempts: maxRetries + 1,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Retry a sync operation and throw on failure
 *
 * @param operation - Sync function to retry
 * @param options - Retry options
 * @returns The result of the successful operation
 * @throws {Error} If all retries fail
 */
export function retrySyncOrThrow<T>(
  operation: () => T,
  options: Omit<RetryOptions, "signal"> = {}
): T {
  const result = retrySync(operation, options);

  if (result.success) {
    return result.result!;
  }

  throw result.error || new Error("Operation failed");
}
