import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateBackoffDelay,
  sleep,
  retryAsync,
  retryAsyncWithTimeout,
  retryWrap,
  retryAsyncOrThrow,
  retrySync,
  retrySyncOrThrow,
  type RetryOptions,
} from "../../src/utils/retry";
import { FhevmError, FhevmErrorCode, FhevmAbortError } from "../../src/types/errors";

describe("Retry Utils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("calculateBackoffDelay", () => {
    it("calculates exponential backoff correctly", () => {
      const delay0 = calculateBackoffDelay(0, 100, 5000, 2, false);
      const delay1 = calculateBackoffDelay(1, 100, 5000, 2, false);
      const delay2 = calculateBackoffDelay(2, 100, 5000, 2, false);

      expect(delay0).toBe(100); // 100 * 2^0 = 100
      expect(delay1).toBe(200); // 100 * 2^1 = 200
      expect(delay2).toBe(400); // 100 * 2^2 = 400
    });

    it("caps delay at maxDelayMs", () => {
      const delay = calculateBackoffDelay(10, 100, 5000, 2, false);
      expect(delay).toBe(5000);
    });

    it("adds jitter when enabled", () => {
      const delays = Array.from({ length: 10 }, () =>
        calculateBackoffDelay(2, 100, 5000, 2, true)
      );

      // With jitter, delays should vary
      const allSame = delays.every((d) => d === delays[0]);
      expect(allSame).toBe(false);

      // All delays should be within ±20% of 400
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(320); // 400 - 20%
        expect(delay).toBeLessThanOrEqual(480); // 400 + 20%
      });
    });

    it("does not add jitter when disabled", () => {
      const delay1 = calculateBackoffDelay(2, 100, 5000, 2, false);
      const delay2 = calculateBackoffDelay(2, 100, 5000, 2, false);

      expect(delay1).toBe(delay2);
      expect(delay1).toBe(400);
    });

    it("handles zero initial delay", () => {
      const delay = calculateBackoffDelay(3, 0, 5000, 2, false);
      expect(delay).toBe(0);
    });

    it("returns non-negative delays with jitter", () => {
      const delays = Array.from({ length: 100 }, () =>
        calculateBackoffDelay(0, 10, 5000, 2, true)
      );

      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("sleep", () => {
    it("sleeps for specified duration", async () => {
      const start = Date.now();
      await sleep(10);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(8); // Allow some tolerance
    });

    it("can be aborted with signal", async () => {
      const controller = new AbortController();
      const promise = sleep(1000, controller.signal);

      setTimeout(() => controller.abort(), 10);

      await expect(promise).rejects.toThrow(FhevmAbortError);
      await expect(promise).rejects.toThrow("Sleep was cancelled");
    });

    it("completes normally without signal", async () => {
      await expect(sleep(10)).resolves.toBeUndefined();
    });
  });

  describe("retryAsync", () => {
    it("succeeds on first attempt", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await retryAsync(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("retries on retryable errors", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(
          new FhevmError(FhevmErrorCode.NETWORK_ERROR, "Network error")
        )
        .mockRejectedValueOnce(
          new FhevmError(FhevmErrorCode.NETWORK_ERROR, "Network error")
        )
        .mockResolvedValue("success");

      // Use real timers with small delays
      const result = await retryAsync(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        useJitter: false
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("stops retrying after maxRetries", async () => {
      const error = new FhevmError(FhevmErrorCode.NETWORK_ERROR, "Network error");
      const operation = vi.fn().mockRejectedValue(error);

      const result = await retryAsync(operation, {
        maxRetries: 2,
        initialDelayMs: 10,
        useJitter: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(3); // Initial + 2 retries
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("does not retry non-retryable errors", async () => {
      const error = new FhevmError(
        FhevmErrorCode.INVALID_INPUT,
        "Invalid input"
      );
      const operation = vi.fn().mockRejectedValue(error);

      const result = await retryAsync(operation, { maxRetries: 3 });

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("calls onRetry callback", async () => {
      const onRetry = vi.fn();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new FhevmError(FhevmErrorCode.NETWORK_ERROR))
        .mockResolvedValue("success");

      await retryAsync(operation, {
        maxRetries: 2,
        initialDelayMs: 10,
        useJitter: false,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        1, // attempt number
        expect.any(Error),
        expect.any(Number) // delay
      );
    });

    it("respects abort signal", async () => {
      const controller = new AbortController();
      const operation = vi
        .fn()
        .mockRejectedValue(new FhevmError(FhevmErrorCode.NETWORK_ERROR));

      const promise = retryAsync(operation, {
        maxRetries: 5,
        signal: controller.signal,
      });

      // Abort immediately
      controller.abort();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(FhevmAbortError);
      expect(result.error?.message).toBe("Operation was cancelled");
    });

    it("uses custom isRetryable predicate", async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error("Custom error"));

      const isRetryable = vi.fn().mockReturnValue(false);

      const result = await retryAsync(operation, {
        maxRetries: 3,
        isRetryable,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(isRetryable).toHaveBeenCalled();
    });

    it("tracks total time", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new FhevmError(FhevmErrorCode.NETWORK_ERROR))
        .mockResolvedValue("success");

      const result = await retryAsync(operation, {
        maxRetries: 2,
        initialDelayMs: 10,
        useJitter: false,
      });

      expect(result.totalTimeMs).toBeGreaterThan(0);
    });
  });

  describe("retryAsyncWithTimeout", () => {
    it("succeeds before timeout", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await retryAsyncWithTimeout(operation, 1000, {
        maxRetries: 2,
        initialDelayMs: 10
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
    });

    it("fails with timeout error when exceeded", async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new FhevmError(FhevmErrorCode.NETWORK_ERROR));

      // Use more reliable timing: shorter timeout and longer delays
      // This ensures timeout will always trigger before retries complete
      const result = await retryAsyncWithTimeout(operation, 100, {
        maxRetries: 10,
        initialDelayMs: 50,
        useJitter: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(FhevmError);
      // Verify we got some attempts but were cut short by timeout
      expect(result.attempts).toBeGreaterThan(0);
      expect(result.attempts).toBeLessThan(10); // Should not reach max retries
    });
  });

  describe("retryWrap", () => {
    it("wraps async function with retry logic", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new FhevmError(FhevmErrorCode.NETWORK_ERROR))
        .mockResolvedValue("success");

      const wrappedOp = retryWrap(operation, {
        maxRetries: 2,
        initialDelayMs: 10,
        useJitter: false
      });

      const result = await wrappedOp();

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
    });

    it("passes arguments to wrapped function", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      const wrappedOp = retryWrap(
        async (a: number, b: string) => operation(a, b),
        { maxRetries: 2 }
      );

      const result = await wrappedOp(42, "test");

      expect(operation).toHaveBeenCalledWith(42, "test");
    });
  });

  describe("retryAsyncOrThrow", () => {
    it("returns result on success", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await retryAsyncOrThrow(operation);

      expect(result).toBe("success");
    });

    it("throws error on failure", async () => {
      const error = new Error("Failed");
      const operation = vi.fn().mockRejectedValue(error);

      await expect(retryAsyncOrThrow(operation, {
        maxRetries: 1,
        initialDelayMs: 10,
        useJitter: false
      })).rejects.toThrow("Failed");
    });
  });

  describe("retrySync", () => {
    it("succeeds on first attempt", () => {
      const operation = vi.fn().mockReturnValue("success");

      const result = retrySync(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("retries on retryable errors", () => {
      const operation = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new FhevmError(FhevmErrorCode.NETWORK_ERROR, "Network error");
        })
        .mockReturnValue("success");

      const result = retrySync(operation, { maxRetries: 2 });

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(2);
    });

    it("stops retrying after maxRetries", () => {
      const error = new FhevmError(FhevmErrorCode.NETWORK_ERROR, "Network error");
      const operation = vi.fn().mockImplementation(() => {
        throw error;
      });

      const result = retrySync(operation, { maxRetries: 2 });

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(3);
    });

    it("does not retry non-retryable errors", () => {
      const error = new FhevmError(FhevmErrorCode.INVALID_INPUT, "Invalid input");
      const operation = vi.fn().mockImplementation(() => {
        throw error;
      });

      const result = retrySync(operation, { maxRetries: 3 });

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(1);
    });

    it("calls onRetry callback", () => {
      const onRetry = vi.fn();
      const operation = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new FhevmError(FhevmErrorCode.NETWORK_ERROR);
        })
        .mockReturnValue("success");

      retrySync(operation, {
        maxRetries: 2,
        initialDelayMs: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("retrySyncOrThrow", () => {
    it("returns result on success", () => {
      const operation = vi.fn().mockReturnValue("success");

      const result = retrySyncOrThrow(operation);

      expect(result).toBe("success");
    });

    it("throws error on failure", () => {
      const error = new Error("Failed");
      const operation = vi.fn().mockImplementation(() => {
        throw error;
      });

      expect(() => {
        retrySyncOrThrow(operation, { maxRetries: 1 });
      }).toThrow("Failed");
    });
  });
});
