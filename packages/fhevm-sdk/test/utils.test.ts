/**
 * Test utilities for error handling, retry, validation, and debug
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  // Error utilities
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
  isRetryable,
  isUserActionError,
  FhevmError,
  FhevmErrorCode,
  // Retry utilities
  calculateBackoffDelay,
  retryAsync,
  retryAsyncOrThrow,
  // Validation utilities
  isValidAddress,
  assertValidAddress,
  isValidFhevmType,
  assertValidFhevmType,
  validateEncryptionValue,
  COMMON_CHAIN_IDS,
  // Debug utilities
  enableDebugLogging,
  disableDebugLogging,
  getDebugState,
  debug,
  info,
  warn,
  error,
  startTimer,
  getMetrics,
  clearMetrics,
} from "../src";

// ============================================================================
// Error Utilities Tests
// ============================================================================

describe("Error Utilities", () => {
  it("should get error recovery suggestion", () => {
    const error = new FhevmError(
      FhevmErrorCode.ENCRYPTION_FAILED,
      "Value out of range"
    );
    const suggestion = getErrorRecoverySuggestion(error);

    expect(suggestion).toBeDefined();
    expect(suggestion.title).toBe("Encryption Failed");
    expect(suggestion.retryable).toBe(true);
    expect(suggestion.actions.length).toBeGreaterThan(0);
  });

  it("should format error suggestion", () => {
    const error = new FhevmError(FhevmErrorCode.ENCRYPTION_FAILED);
    const suggestion = getErrorRecoverySuggestion(error);
    const formatted = formatErrorSuggestion(suggestion);

    expect(formatted).toContain("Encryption Failed");
    expect(formatted).toContain("What to do");
  });

  it("should identify retryable errors", () => {
    const networkError = new FhevmError(FhevmErrorCode.NETWORK_ERROR);
    const validationError = new FhevmError(FhevmErrorCode.INVALID_ADDRESS);

    expect(isRetryable(networkError)).toBe(true);
    expect(isRetryable(validationError)).toBe(false);
  });

  it("should identify user action errors", () => {
    const userRejectError = new FhevmError(FhevmErrorCode.SIGNATURE_REJECTED);
    const systemError = new FhevmError(FhevmErrorCode.NETWORK_ERROR);

    expect(isUserActionError(userRejectError)).toBe(true);
    expect(isUserActionError(systemError)).toBe(false);
  });
});

// ============================================================================
// Retry Utilities Tests
// ============================================================================

describe("Retry Utilities", () => {
  it("should calculate exponential backoff delays", () => {
    const delay0 = calculateBackoffDelay(0, 100, 5000, 2, false);
    const delay1 = calculateBackoffDelay(1, 100, 5000, 2, false);
    const delay2 = calculateBackoffDelay(2, 100, 5000, 2, false);

    expect(delay0).toBe(100);
    expect(delay1).toBe(200);
    expect(delay2).toBe(400);
  });

  it("should cap maximum backoff delay", () => {
    const delay = calculateBackoffDelay(10, 100, 5000, 2, false);
    expect(delay).toBe(5000);
  });

  it("should retry operation on failure", async () => {
    let attempts = 0;

    const result = await retryAsync(
      async () => {
        attempts++;
        if (attempts < 2) throw new FhevmError(FhevmErrorCode.NETWORK_ERROR);
        return "success";
      },
      { maxRetries: 3 }
    );

    expect(result.success).toBe(true);
    expect(result.result).toBe("success");
    expect(result.attempts).toBe(2);
  });

  it("should throw on non-retryable error", async () => {
    const result = await retryAsync(
      async () => {
        throw new FhevmError(FhevmErrorCode.INVALID_ADDRESS);
      },
      { maxRetries: 3 }
    );

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
  });
});

// ============================================================================
// Validation Utilities Tests
// ============================================================================

describe("Validation Utilities", () => {
  it("should validate Ethereum addresses", () => {
    const validAddr = "0x742d35Cc6634C0532925a3b844Bc871e33d20E7e";
    const invalidAddr = "0x123";

    expect(isValidAddress(validAddr)).toBe(true);
    expect(isValidAddress(invalidAddr)).toBe(false);
  });

  it("should validate FHEVM types", () => {
    expect(isValidFhevmType("euint32")).toBe(true);
    expect(isValidFhevmType("ebool")).toBe(true);
    expect(isValidFhevmType("invalid_type")).toBe(false);
  });

  it("should validate encryption values for type ranges", () => {
    expect(validateEncryptionValue(42, "euint32")).toBe(true);
    expect(validateEncryptionValue(999999999999, "euint8")).toBe(false);
    expect(validateEncryptionValue(true, "ebool")).toBe(true);
  });

  it("should validate all common FHEVM types", () => {
    const commonTypes = ["euint32", "ebool", "euint8", "euint16", "euint64"];

    for (const type of commonTypes) {
      expect(isValidFhevmType(type)).toBe(true);
    }
  });

  it("should recognize common chain IDs", () => {
    expect(COMMON_CHAIN_IDS.HARDHAT).toBe(31337);
    expect(COMMON_CHAIN_IDS.SEPOLIA).toBe(11155111);
  });
});

// ============================================================================
// Debug Utilities Tests
// ============================================================================

describe("Debug Utilities", () => {
  beforeEach(() => {
    clearMetrics();
  });

  afterEach(() => {
    disableDebugLogging();
  });

  it("should enable and disable debug logging", () => {
    enableDebugLogging({ verbose: true });
    let state = getDebugState();
    expect(state.verbose).toBe(true);

    disableDebugLogging();
    state = getDebugState();
    expect(state.verbose).toBe(false);
  });

  it("should record performance metrics", () => {
    const stop = startTimer("test_operation", { context: "unit_test" });
    const metric = stop();

    expect(metric.name).toBe("test_operation");
    expect(metric.durationMs).toBeGreaterThanOrEqual(0);
    expect(metric.metadata?.context).toBe("unit_test");
  });

  it("should store and retrieve metrics", () => {
    startTimer("op1")();
    startTimer("op2")();
    startTimer("op1")();

    const metrics = getMetrics();
    expect(metrics.length).toBe(3);

    const op1Metrics = metrics.filter((m) => m.name === "op1");
    expect(op1Metrics.length).toBe(2);
  });
});
