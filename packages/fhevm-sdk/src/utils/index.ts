/**
 * FHEVM SDK Utilities
 *
 * Collection of utilities for error handling, retries, validation, and debugging.
 *
 * @module utils
 */

// Error handling & recovery
export {
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
  isRetryable,
  isUserActionError,
  createFhevmErrorWithSuggestion,
  type ErrorRecoverySuggestion,
} from "./errors";

// Retry logic
export {
  calculateBackoffDelay,
  sleep,
  retryAsync,
  retryAsyncWithTimeout,
  retryWrap,
  retryAsyncOrThrow,
  retrySync,
  retrySyncOrThrow,
  type RetryOptions,
  type RetryResult,
} from "./retry";

// Input validation
export {
  isValidAddress,
  assertValidAddress,
  validateAddresses,
  isValidFhevmType,
  assertValidFhevmType,
  getValidFhevmTypes,
  validateEncryptionValue,
  assertValidEncryptionValue,
  isValidChainId,
  isEthereumCompatibleChain,
  COMMON_CHAIN_IDS,
  isValidHex,
  normalizeHex,
  assertDefined,
  assertRequiredParams,
  assertNotEmpty,
  assertNotEmptyArray,
  assertAllValid,
  isNotQuotaExceeded,
  isValidStorageKey,
  isValidStorageValue,
} from "./validation";

// Debug & logging
export {
  enableDebugLogging,
  disableDebugLogging,
  getDebugState,
  setDebugLevel,
  debug,
  info,
  warn,
  error,
  startTimer,
  measureAsync,
  measureSync,
  getMetrics,
  getMetricsForOperation,
  getAverageDuration,
  getPerformanceSummary,
  clearMetrics,
  printPerformanceSummary,
  createDebugGroup,
  formatObject,
  assert,
  type DebugOptions,
  type PerformanceMetric,
} from "./debug";
