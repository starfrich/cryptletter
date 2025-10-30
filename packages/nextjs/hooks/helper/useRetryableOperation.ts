import { useCallback, useState } from "react";
import { notification } from "../../utils/helper/notification";
import { retryAsyncOrThrow } from "@fhevm-sdk/utils";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  useJitter?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Hook for retryable operations with UI feedback
 *
 * @example
 * const { execute, isRetrying, retryCount, reset } = useRetryableOperation();
 *
 * const handlePublish = async () => {
 *   await execute(
 *     () => cryptletter.publishNewsletter(options),
 *     {
 *       maxRetries: 3,
 *       onRetry: (attempt) => {
 *         notification.info(`Retry attempt ${attempt}...`);
 *       }
 *     }
 *   );
 * };
 */
export function useRetryableOperation<T = any>() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const execute = useCallback(async (operation: () => Promise<T>, options?: RetryOptions): Promise<T> => {
    setIsRetrying(true);
    setLastError(null);
    setRetryCount(0);

    try {
      const result = await retryAsyncOrThrow(operation, {
        ...options,
        onRetry: (attempt: number, error: Error) => {
          setRetryCount(attempt);
          options?.onRetry?.(attempt, error);
        },
      });

      setIsRetrying(false);
      return result;
    } catch (error) {
      setIsRetrying(false);
      setLastError(error instanceof Error ? error : new Error("Operation failed"));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setIsRetrying(false);
    setRetryCount(0);
    setLastError(null);
  }, []);

  return {
    execute,
    isRetrying,
    retryCount,
    lastError,
    reset,
  };
}
