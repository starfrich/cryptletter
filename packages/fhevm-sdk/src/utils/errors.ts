/**
 * Error Handling Utilities
 *
 * This module provides utilities for handling FHEVM SDK errors with
 * user-friendly messages and recovery suggestions.
 *
 * @module utils/errors
 */

import {
  FhevmError,
  FhevmErrorCode,
  FhevmAbortError,
  StorageError,
  StorageErrorCode,
  getErrorMessage as baseGetErrorMessage,
} from "../types/errors";

// ============================================================================
// Error Recovery Suggestions
// ============================================================================

/**
 * Recovery suggestion for an error
 */
export interface ErrorRecoverySuggestion {
  /** Short description of the error */
  title: string;
  /** User-friendly error message */
  message: string;
  /** Suggested actions to fix the error */
  actions: string[];
  /** Whether the error is retryable */
  retryable: boolean;
}

/**
 * Map of error codes to recovery suggestions
 */
const ERROR_RECOVERY_MAP: Record<
  FhevmErrorCode,
  ErrorRecoverySuggestion
> = {
  [FhevmErrorCode.PROVIDER_NOT_FOUND]: {
    title: "No Ethereum Provider Found",
    message:
      "The application could not find an Ethereum provider (like MetaMask).",
    actions: [
      "1. Install MetaMask or another Web3 wallet browser extension",
      "2. Reload the page",
      "3. Connect your wallet using the 'Connect Wallet' button",
    ],
    retryable: false,
  },

  [FhevmErrorCode.NETWORK_ERROR]: {
    title: "Network Connection Error",
    message: "Failed to connect to the blockchain network.",
    actions: [
      "1. Check your internet connection",
      "2. Ensure you have a stable connection",
      "3. Try again in a few moments",
      "4. Check if the network is experiencing issues",
    ],
    retryable: true,
  },

  [FhevmErrorCode.UNSUPPORTED_CHAIN]: {
    title: "Unsupported Blockchain Network",
    message: "The current blockchain network is not supported by this application.",
    actions: [
      "1. Open your wallet provider settings",
      "2. Switch to a supported network (Sepolia, Ethereum mainnet, etc.)",
      "3. Reload the page",
    ],
    retryable: false,
  },

  [FhevmErrorCode.CHAIN_MISMATCH]: {
    title: "Blockchain Network Mismatch",
    message: "Your wallet is connected to a different network than expected.",
    actions: [
      "1. Check the network your wallet is connected to",
      "2. Switch to the correct network",
      "3. Reload the page and try again",
    ],
    retryable: false,
  },

  [FhevmErrorCode.SDK_LOAD_FAILED]: {
    title: "Failed to Load FHEVM SDK",
    message: "The FHEVM SDK library could not be loaded.",
    actions: [
      "1. Check your internet connection",
      "2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)",
      "3. Clear your browser cache and try again",
      "4. Try in a different browser",
    ],
    retryable: true,
  },

  [FhevmErrorCode.SDK_INIT_FAILED]: {
    title: "Failed to Initialize FHEVM SDK",
    message: "The FHEVM SDK could not be initialized.",
    actions: [
      "1. Ensure your provider is properly configured",
      "2. Check that you're on a supported network",
      "3. Reload the page and try again",
    ],
    retryable: true,
  },

  [FhevmErrorCode.INSTANCE_CREATION_FAILED]: {
    title: "Failed to Create FHEVM Instance",
    message: "Could not create an FHEVM instance for encryption/decryption.",
    actions: [
      "1. Ensure you have a valid Ethereum provider connected",
      "2. Check that you're on a supported network",
      "3. Try reconnecting your wallet",
      "4. Contact support if the issue persists",
    ],
    retryable: true,
  },

  [FhevmErrorCode.INSTANCE_NOT_READY]: {
    title: "FHEVM Instance Not Ready",
    message: "The FHEVM instance is still initializing or has failed.",
    actions: [
      "1. Wait a moment and try again",
      "2. If the instance fails to initialize, reload the page",
      "3. Check that your provider is properly connected",
    ],
    retryable: true,
  },

  [FhevmErrorCode.ENCRYPTION_FAILED]: {
    title: "Encryption Failed",
    message: "Failed to encrypt the provided value.",
    actions: [
      "1. Verify the value is valid for the specified FHEVM type",
      "2. Check that the contract address is correct",
      "3. Ensure your FHEVM instance is properly initialized",
      "4. Try again or contact support",
    ],
    retryable: true,
  },

  [FhevmErrorCode.INVALID_FHEVM_TYPE]: {
    title: "Invalid FHEVM Type",
    message: "The specified FHEVM type is not recognized or supported.",
    actions: [
      "1. Check the FHEVM type (ebool, euint8, euint16, euint32, euint64, euint128, euint256, eaddress)",
      "2. Ensure the type matches your contract's requirements",
      "3. Update your code with the correct type",
    ],
    retryable: false,
  },

  [FhevmErrorCode.INVALID_ENCRYPTION_VALUE]: {
    title: "Invalid Value for Encryption",
    message: "The value cannot be encrypted with the specified FHEVM type.",
    actions: [
      "1. For euint8: use values 0-255",
      "2. For euint16: use values 0-65535",
      "3. For euint32: use values 0-4294967295",
      "4. For boolean: use true/false",
      "5. For eaddress: use a valid 0x-prefixed Ethereum address",
    ],
    retryable: false,
  },

  [FhevmErrorCode.DECRYPTION_FAILED]: {
    title: "Decryption Failed",
    message: "Failed to decrypt the encrypted value.",
    actions: [
      "1. Ensure you have a valid decryption signature",
      "2. Check that the encrypted handle is correct",
      "3. Verify the contract address matches your signature",
      "4. If the signature expired, request a new one",
      "5. Try again or contact support",
    ],
    retryable: true,
  },

  [FhevmErrorCode.INVALID_HANDLE]: {
    title: "Invalid Encrypted Handle",
    message: "The encrypted handle format is invalid.",
    actions: [
      "1. Ensure the handle is a valid hex string (starting with 0x)",
      "2. Verify the handle was properly obtained from encryption",
      "3. Check that the handle hasn't been corrupted",
      "4. Try the operation again",
    ],
    retryable: false,
  },

  [FhevmErrorCode.SIGNATURE_FAILED]: {
    title: "Decryption Signature Failed",
    message: "Failed to create or load the decryption signature.",
    actions: [
      "1. Try signing again using your wallet",
      "2. Ensure your wallet is properly connected",
      "3. Check your wallet for any prompts or errors",
      "4. Try in a private browsing window",
    ],
    retryable: true,
  },

  [FhevmErrorCode.SIGNATURE_EXPIRED]: {
    title: "Decryption Signature Expired",
    message: "The decryption signature has expired and is no longer valid.",
    actions: [
      "1. Request a new decryption signature",
      "2. Sign the new signature request with your wallet",
      "3. Try decryption again with the new signature",
    ],
    retryable: false,
  },

  [FhevmErrorCode.SIGNATURE_REJECTED]: {
    title: "Signature Request Rejected",
    message: "You rejected the signature request in your wallet.",
    actions: [
      "1. Approve the signature request to proceed with decryption",
      "2. Note: You may need to sign multiple times for different contract addresses",
      "3. If you continue to reject, contact support",
    ],
    retryable: true,
  },

  [FhevmErrorCode.STORAGE_ERROR]: {
    title: "Storage Operation Failed",
    message: "An error occurred while accessing browser storage.",
    actions: [
      "1. Check that your browser's storage is not disabled",
      "2. Ensure you have enough disk space",
      "3. Try clearing some browser data (Settings > Clear Browsing Data)",
      "4. Disable private browsing mode if enabled",
      "5. Try in a different browser",
    ],
    retryable: true,
  },

  [FhevmErrorCode.STORAGE_QUOTA_EXCEEDED]: {
    title: "Storage Quota Exceeded",
    message: "Browser storage quota has been exceeded.",
    actions: [
      "1. Clear some browser cache and storage (Settings > Clear Browsing Data)",
      "2. Delete old data from other websites if possible",
      "3. Try the operation again",
      "4. Contact support if the problem persists",
    ],
    retryable: true,
  },

  [FhevmErrorCode.STORAGE_NOT_AVAILABLE]: {
    title: "Storage Not Available",
    message: "Browser storage is not available (possibly in private browsing mode).",
    actions: [
      "1. Disable private/incognito browsing mode",
      "2. Use a regular browsing window",
      "3. Reload the page and try again",
    ],
    retryable: false,
  },

  [FhevmErrorCode.INVALID_INPUT]: {
    title: "Invalid Input",
    message: "Invalid input was provided to an SDK function.",
    actions: [
      "1. Check the function documentation for required parameters",
      "2. Verify all input values are correctly formatted",
      "3. Ensure required parameters are not missing",
      "4. Try again with valid input",
    ],
    retryable: false,
  },

  [FhevmErrorCode.INVALID_ADDRESS]: {
    title: "Invalid Ethereum Address",
    message: "The provided Ethereum address is not valid.",
    actions: [
      "1. Ensure the address is 42 characters long (including 0x prefix)",
      "2. Verify the address only contains hexadecimal characters (0-9, a-f, A-F)",
      "3. Check that the address starts with 0x",
      "4. Copy the address from your wallet to avoid typos",
    ],
    retryable: false,
  },

  [FhevmErrorCode.MISSING_PARAMETER]: {
    title: "Missing Required Parameter",
    message: "A required parameter is missing from the function call.",
    actions: [
      "1. Check the function signature and documentation",
      "2. Provide all required parameters",
      "3. See examples in the documentation for correct usage",
      "4. Try again with all parameters provided",
    ],
    retryable: false,
  },

  [FhevmErrorCode.OPERATION_ABORTED]: {
    title: "Operation Was Cancelled",
    message: "The operation was aborted or cancelled.",
    actions: [
      "1. This usually happens when you navigate away during an operation",
      "2. Return to the page and try again",
      "3. Ensure you wait for operations to complete before navigating",
    ],
    retryable: true,
  },

  [FhevmErrorCode.OPERATION_TIMEOUT]: {
    title: "Operation Timed Out",
    message: "The operation took too long and was cancelled.",
    actions: [
      "1. Check your internet connection",
      "2. Try again when the network is less congested",
      "3. Try the operation again",
      "4. Contact support if timeouts persist",
    ],
    retryable: true,
  },

  [FhevmErrorCode.UNKNOWN_ERROR]: {
    title: "Unknown Error",
    message: "An unexpected error occurred.",
    actions: [
      "1. Try refreshing the page",
      "2. Clear your browser cache",
      "3. Try in a different browser",
      "4. Contact support with details about what you were doing",
    ],
    retryable: true,
  },
};

/**
 * Get recovery suggestion for an error
 *
 * Provides a structured recovery suggestion with title, message, and actions.
 *
 * @param error - The error to get suggestions for
 * @returns Recovery suggestion with actions
 *
 * @example
 * ```typescript
 * try {
 *   await encryptValue(instance, address, user, value, type);
 * } catch (error) {
 *   const suggestion = getErrorRecoverySuggestion(error);
 *   console.error(suggestion.title);
 *   suggestion.actions.forEach(action => console.log(action));
 * }
 * ```
 */
export function getErrorRecoverySuggestion(
  error: unknown
): ErrorRecoverySuggestion {
  if (error instanceof FhevmError) {
    return (
      ERROR_RECOVERY_MAP[error.code] || {
        title: "Error Occurred",
        message: error.message || "An error occurred",
        actions: ["Check the error message and try again"],
        retryable: true,
      }
    );
  }

  if (error instanceof FhevmAbortError) {
    return {
      title: "Operation Cancelled",
      message: error.message,
      actions: [
        "1. The operation was cancelled",
        "2. Try the operation again",
      ],
      retryable: true,
    };
  }

  if (error instanceof StorageError) {
    return {
      title: "Storage Error",
      message: error.message || "A storage error occurred",
      actions: [
        "1. Check your browser storage settings",
        "2. Try clearing some browser data",
        "3. Try again or contact support",
      ],
      retryable: error.code !== StorageErrorCode.NOT_AVAILABLE,
    };
  }

  return {
    title: "Unexpected Error",
    message:
      error instanceof Error
        ? error.message
        : "An unexpected error occurred",
    actions: [
      "1. Refresh the page",
      "2. Clear browser cache",
      "3. Try in a different browser",
      "4. Contact support",
    ],
    retryable: true,
  };
}

/**
 * Format error recovery suggestion for display
 *
 * Formats a recovery suggestion into a human-readable string.
 *
 * @param suggestion - Recovery suggestion
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const suggestion = getErrorRecoverySuggestion(error);
 * console.error(formatErrorSuggestion(suggestion));
 * ```
 */
export function formatErrorSuggestion(suggestion: ErrorRecoverySuggestion): string {
  const lines = [
    `❌ ${suggestion.title}`,
    `   ${suggestion.message}`,
    "",
    "What to do:",
    ...suggestion.actions.map((action) => `   ${action}`),
  ];

  if (suggestion.retryable) {
    lines.push("   💡 This error is retryable - you can try again.");
  }

  return lines.join("\n");
}

/**
 * Is an error retryable?
 *
 * Determines if an operation that failed with the given error
 * should be retried.
 *
 * @param error - The error to check
 * @returns true if the error is retryable
 *
 * @example
 * ```typescript
 * if (isRetryable(error)) {
 *   // Wait and retry
 * }
 * ```
 */
export function isRetryable(error: unknown): boolean {
  const suggestion = getErrorRecoverySuggestion(error);
  return suggestion.retryable;
}

/**
 * Is an error a user action error?
 *
 * Returns true if the error is due to user actions (like rejecting a signature)
 * rather than system errors.
 *
 * @param error - The error to check
 * @returns true if the error is a user action error
 */
export function isUserActionError(error: unknown): boolean {
  if (error instanceof FhevmError) {
    return [
      FhevmErrorCode.SIGNATURE_REJECTED,
      FhevmErrorCode.OPERATION_ABORTED,
      FhevmErrorCode.UNSUPPORTED_CHAIN,
      FhevmErrorCode.CHAIN_MISMATCH,
    ].includes(error.code);
  }

  return false;
}

/**
 * Create FhevmError with recovery suggestion
 *
 * Helper to create an FHEVM error and get recovery suggestions.
 *
 * @param code - Error code
 * @param message - Error message (optional, uses default if not provided)
 * @param context - Optional context
 * @returns The FhevmError
 *
 * @example
 * ```typescript
 * const error = createFhevmErrorWithSuggestion(
 *   FhevmErrorCode.ENCRYPTION_FAILED,
 *   "Value out of range"
 * );
 * const suggestion = getErrorRecoverySuggestion(error);
 * ```
 */
export function createFhevmErrorWithSuggestion(
  code: FhevmErrorCode,
  message?: string,
  context?: any
): FhevmError {
  return new FhevmError(
    code,
    message || baseGetErrorMessage(new FhevmError(code)),
    context
  );
}
