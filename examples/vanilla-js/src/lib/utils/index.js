/**
 * Central exports for vanilla JS utils
 *
 * Provides access to all utility helpers:
 * - Error handling
 * - Validation
 * - Retry strategies
 * - Debug logging
 */

// Error Handler
export {
  createErrorHandler,
  handleError,
  getErrorSuggestion,
  shouldRetry,
  isUserError,
} from './errorHandler.js'

// Validation Manager
export {
  createValidationManager,
  validateAddress,
  assertAddress,
  validateFhevmType,
  assertFhevmType,
  validateEncryptionValueForType,
  assertEncryptionValue,
  validateStorageKeyValue,
} from './validationHelper.js'

// Retry Manager
export {
  createRetryManager,
  retryTransactionReceipt,
  retryNetworkCall,
  retryEncryptionOperation,
  retryAsyncOperation,
  calculateRetryDelay,
} from './retryHelper.js'

// Debug Manager
export {
  createDebugManager,
  initializeDebugMode,
  toggleDebugMode,
  isDebugEnabled,
  logDebug,
  logInfo,
  logWarn,
  logError,
  startPerformanceTimer,
  measureOperationPerformance,
  logPerformanceMetrics,
} from './debugHelper.js'
