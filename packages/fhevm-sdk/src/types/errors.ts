/**
 * Error Types
 *
 * This module defines error classes and error codes for the FHEVM SDK.
 * All SDK errors extend these base classes for consistent error handling.
 *
 * @module types/errors
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Core FHEVM error codes
 *
 * These codes help identify the type of error that occurred and suggest
 * appropriate recovery actions.
 */
export enum FhevmErrorCode {
  // Provider & Network Errors
  /** Ethereum provider not found or not available */
  PROVIDER_NOT_FOUND = "PROVIDER_NOT_FOUND",

  /** Network request failed (timeout, connection error, etc.) */
  NETWORK_ERROR = "NETWORK_ERROR",

  /** Unsupported chain ID */
  UNSUPPORTED_CHAIN = "UNSUPPORTED_CHAIN",

  /** Chain ID mismatch between provider and expected value */
  CHAIN_MISMATCH = "CHAIN_MISMATCH",

  // Instance Creation Errors
  /** Failed to load RelayerSDK script */
  SDK_LOAD_FAILED = "SDK_LOAD_FAILED",

  /** Failed to initialize RelayerSDK */
  SDK_INIT_FAILED = "SDK_INIT_FAILED",

  /** Failed to create FHEVM instance */
  INSTANCE_CREATION_FAILED = "INSTANCE_CREATION_FAILED",

  /** FHEVM instance not ready (still initializing or failed) */
  INSTANCE_NOT_READY = "INSTANCE_NOT_READY",

  // Encryption Errors
  /** Encryption operation failed */
  ENCRYPTION_FAILED = "ENCRYPTION_FAILED",

  /** Invalid FHEVM type specified */
  INVALID_FHEVM_TYPE = "INVALID_FHEVM_TYPE",

  /** Invalid value for encryption (out of range, wrong type, etc.) */
  INVALID_ENCRYPTION_VALUE = "INVALID_ENCRYPTION_VALUE",

  // Decryption Errors
  /** Decryption operation failed */
  DECRYPTION_FAILED = "DECRYPTION_FAILED",

  /** Invalid encrypted handle format */
  INVALID_HANDLE = "INVALID_HANDLE",

  /** Failed to create or load decryption signature */
  SIGNATURE_FAILED = "SIGNATURE_FAILED",

  /** Decryption signature expired */
  SIGNATURE_EXPIRED = "SIGNATURE_EXPIRED",

  /** User rejected signature request */
  SIGNATURE_REJECTED = "SIGNATURE_REJECTED",

  // Storage Errors
  /** Storage operation failed */
  STORAGE_ERROR = "STORAGE_ERROR",

  /** Storage quota exceeded */
  STORAGE_QUOTA_EXCEEDED = "STORAGE_QUOTA_EXCEEDED",

  /** Storage not available (e.g., private browsing mode) */
  STORAGE_NOT_AVAILABLE = "STORAGE_NOT_AVAILABLE",

  // Validation Errors
  /** Invalid input provided to SDK function */
  INVALID_INPUT = "INVALID_INPUT",

  /** Invalid Ethereum address */
  INVALID_ADDRESS = "INVALID_ADDRESS",

  /** Required parameter missing */
  MISSING_PARAMETER = "MISSING_PARAMETER",

  // Operational Errors
  /** Operation was aborted/cancelled */
  OPERATION_ABORTED = "OPERATION_ABORTED",

  /** Operation timed out */
  OPERATION_TIMEOUT = "OPERATION_TIMEOUT",

  /** Unknown or unexpected error */
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Storage-specific error codes
 */
export enum StorageErrorCode {
  /** Storage quota exceeded */
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",

  /** Storage is not available (e.g., private browsing mode) */
  NOT_AVAILABLE = "NOT_AVAILABLE",

  /** Invalid key or value */
  INVALID_INPUT = "INVALID_INPUT",

  /** Operation failed */
  OPERATION_FAILED = "OPERATION_FAILED",
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base FHEVM error class with error codes
 *
 * All FHEVM SDK errors extend this class for consistent error handling.
 *
 * @example
 * ```typescript
 * try {
 *   await createFhevmInstance(params);
 * } catch (error) {
 *   if (error instanceof FhevmError) {
 *     console.error(`FHEVM Error [${error.code}]:`, error.message);
 *
 *     if (error.code === FhevmErrorCode.PROVIDER_NOT_FOUND) {
 *       // Show wallet connection UI
 *     }
 *   }
 * }
 * ```
 */
export class FhevmError extends Error {
  /** Error code for programmatic error handling */
  public readonly code: FhevmErrorCode;

  /** Optional context data about the error */
  public readonly context?: any;

  /**
   * Creates a new FhevmError
   *
   * @param code - Error code from FhevmErrorCode enum
   * @param message - Human-readable error message
   * @param context - Optional context data (original error, parameters, etc.)
   */
  constructor(code: FhevmErrorCode, message?: string, context?: any) {
    super(message || code);
    this.name = "FhevmError";
    this.code = code;
    this.context = context;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, FhevmError.prototype);
  }

  /**
   * Serializes error to JSON
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
    };
  }
}

/**
 * Error thrown when FHEVM operation is aborted
 *
 * This error is thrown when an operation is cancelled via AbortSignal.
 *
 * @example
 * ```typescript
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 5000);
 *
 * try {
 *   await createFhevmInstance({
 *     provider,
 *     signal: controller.signal
 *   });
 * } catch (error) {
 *   if (error instanceof FhevmAbortError) {
 *     console.log('Instance creation was cancelled');
 *   }
 * }
 * ```
 */
export class FhevmAbortError extends Error {
  constructor(message = "FHEVM operation was cancelled") {
    super(message);
    this.name = "FhevmAbortError";

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, FhevmAbortError.prototype);
  }
}

/**
 * Storage error class with error codes
 *
 * @example
 * ```typescript
 * try {
 *   await storage.setItem('key', 'value');
 * } catch (error) {
 *   if (error instanceof StorageError) {
 *     if (error.code === StorageErrorCode.QUOTA_EXCEEDED) {
 *       // Clear old data or notify user
 *     }
 *   }
 * }
 * ```
 */
export class StorageError extends Error {
  /** Storage-specific error code */
  public readonly code: StorageErrorCode;

  /** Original error that caused this storage error */
  public readonly cause?: unknown;

  /**
   * Creates a new StorageError
   *
   * @param code - Error code from StorageErrorCode enum
   * @param message - Human-readable error message
   * @param cause - Original error that caused this storage error
   */
  constructor(code: StorageErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.cause = cause;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, StorageError.prototype);
  }

  /**
   * Serializes error to JSON
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      cause: this.cause,
    };
  }
}

// ============================================================================
// Error Helper Functions
// ============================================================================

/**
 * Checks if an error is an FHEVM error
 */
export function isFhevmError(error: unknown): error is FhevmError {
  return error instanceof FhevmError;
}

/**
 * Checks if an error is an abort error
 */
export function isFhevmAbortError(error: unknown): error is FhevmAbortError {
  return error instanceof FhevmAbortError;
}

/**
 * Checks if an error is a storage error
 */
export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}

/**
 * Creates a user-friendly error message with recovery suggestions
 *
 * @param error - The error to get a message for
 * @returns User-friendly error message with suggested actions
 */
export function getErrorMessage(error: unknown): string {
  if (isFhevmError(error)) {
    switch (error.code) {
      case FhevmErrorCode.PROVIDER_NOT_FOUND:
        return "No Ethereum provider found. Please install MetaMask or another Web3 wallet.";

      case FhevmErrorCode.UNSUPPORTED_CHAIN:
        return "This chain is not supported. Please switch to a supported network.";

      case FhevmErrorCode.SDK_LOAD_FAILED:
        return "Failed to load FHEVM SDK. Please check your internet connection and try again.";

      case FhevmErrorCode.SIGNATURE_REJECTED:
        return "Signature request was rejected. Please approve the signature to decrypt values.";

      case FhevmErrorCode.STORAGE_QUOTA_EXCEEDED:
        return "Storage quota exceeded. Please clear some browser data and try again.";

      default:
        return error.message || "An unknown FHEVM error occurred.";
    }
  }

  if (isFhevmAbortError(error)) {
    return "Operation was cancelled.";
  }

  if (isStorageError(error)) {
    return `Storage error: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred.";
}
