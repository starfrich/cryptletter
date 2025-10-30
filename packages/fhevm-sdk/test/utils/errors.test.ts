import { describe, it, expect } from "vitest";
import {
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
  isRetryable,
  isUserActionError,
  createFhevmErrorWithSuggestion,
  type ErrorRecoverySuggestion,
} from "../../src/utils/errors";
import {
  FhevmError,
  FhevmErrorCode,
  FhevmAbortError,
  StorageError,
  StorageErrorCode,
} from "../../src/types/errors";

describe("Error Utils", () => {
  describe("getErrorRecoverySuggestion", () => {
    it("returns suggestion for PROVIDER_NOT_FOUND error", () => {
      const error = new FhevmError(
        FhevmErrorCode.PROVIDER_NOT_FOUND,
        "No provider found"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("No Ethereum Provider Found");
      expect(suggestion.message).toContain("Ethereum provider");
      expect(suggestion.actions).toHaveLength(3);
      expect(suggestion.retryable).toBe(false);
    });

    it("returns suggestion for NETWORK_ERROR", () => {
      const error = new FhevmError(
        FhevmErrorCode.NETWORK_ERROR,
        "Network failed"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Network Connection Error");
      expect(suggestion.retryable).toBe(true);
      expect(suggestion.actions.length).toBeGreaterThan(0);
    });

    it("returns suggestion for UNSUPPORTED_CHAIN", () => {
      const error = new FhevmError(
        FhevmErrorCode.UNSUPPORTED_CHAIN,
        "Chain not supported"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Unsupported Blockchain Network");
      expect(suggestion.retryable).toBe(false);
    });

    it("returns suggestion for ENCRYPTION_FAILED", () => {
      const error = new FhevmError(
        FhevmErrorCode.ENCRYPTION_FAILED,
        "Encryption failed"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Encryption Failed");
      expect(suggestion.retryable).toBe(true);
    });

    it("returns suggestion for INVALID_FHEVM_TYPE", () => {
      const error = new FhevmError(
        FhevmErrorCode.INVALID_FHEVM_TYPE,
        "Invalid type"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Invalid FHEVM Type");
      expect(suggestion.retryable).toBe(false);
      expect(suggestion.actions.some((a) => a.includes("ebool"))).toBe(true);
    });

    it("returns suggestion for INVALID_ENCRYPTION_VALUE", () => {
      const error = new FhevmError(
        FhevmErrorCode.INVALID_ENCRYPTION_VALUE,
        "Invalid value"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Invalid Value for Encryption");
      expect(suggestion.retryable).toBe(false);
      expect(suggestion.actions.some((a) => a.includes("euint8"))).toBe(true);
    });

    it("returns suggestion for DECRYPTION_FAILED", () => {
      const error = new FhevmError(
        FhevmErrorCode.DECRYPTION_FAILED,
        "Decryption failed"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Decryption Failed");
      expect(suggestion.retryable).toBe(true);
    });

    it("returns suggestion for SIGNATURE_EXPIRED", () => {
      const error = new FhevmError(
        FhevmErrorCode.SIGNATURE_EXPIRED,
        "Signature expired"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Decryption Signature Expired");
      expect(suggestion.retryable).toBe(false);
    });

    it("returns suggestion for SIGNATURE_REJECTED", () => {
      const error = new FhevmError(
        FhevmErrorCode.SIGNATURE_REJECTED,
        "Signature rejected"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Signature Request Rejected");
      expect(suggestion.retryable).toBe(true);
    });

    it("returns suggestion for STORAGE_ERROR", () => {
      const error = new FhevmError(
        FhevmErrorCode.STORAGE_ERROR,
        "Storage failed"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Storage Operation Failed");
      expect(suggestion.retryable).toBe(true);
    });

    it("returns suggestion for STORAGE_QUOTA_EXCEEDED", () => {
      const error = new FhevmError(
        FhevmErrorCode.STORAGE_QUOTA_EXCEEDED,
        "Quota exceeded"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Storage Quota Exceeded");
      expect(suggestion.retryable).toBe(true);
    });

    it("returns suggestion for INVALID_ADDRESS", () => {
      const error = new FhevmError(
        FhevmErrorCode.INVALID_ADDRESS,
        "Invalid address"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Invalid Ethereum Address");
      expect(suggestion.retryable).toBe(false);
    });

    it("returns suggestion for OPERATION_TIMEOUT", () => {
      const error = new FhevmError(
        FhevmErrorCode.OPERATION_TIMEOUT,
        "Operation timed out"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Operation Timed Out");
      expect(suggestion.retryable).toBe(true);
    });

    it("returns suggestion for FhevmAbortError", () => {
      const error = new FhevmAbortError("Operation cancelled");
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Operation Cancelled");
      expect(suggestion.retryable).toBe(true);
    });

    it("returns suggestion for StorageError", () => {
      const error = new StorageError(
        StorageErrorCode.READ_FAILED,
        "Read failed"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Storage Error");
      expect(suggestion.retryable).toBe(true);
    });

    it("returns suggestion for StorageError with NOT_AVAILABLE code", () => {
      const error = new StorageError(
        StorageErrorCode.NOT_AVAILABLE,
        "Storage not available"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Storage Error");
      expect(suggestion.retryable).toBe(false);
    });

    it("returns default suggestion for unknown error types", () => {
      const error = new Error("Unknown error");
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Unexpected Error");
      expect(suggestion.message).toBe("Unknown error");
      expect(suggestion.retryable).toBe(true);
      expect(suggestion.actions).toHaveLength(4);
    });

    it("handles non-Error objects", () => {
      const suggestion = getErrorRecoverySuggestion("string error");

      expect(suggestion.title).toBe("Unexpected Error");
      expect(suggestion.message).toBe("An unexpected error occurred");
      expect(suggestion.retryable).toBe(true);
    });

    it("returns fallback suggestion for unmapped FhevmError codes", () => {
      const error = new FhevmError(
        "UNMAPPED_CODE" as FhevmErrorCode,
        "Unmapped error"
      );
      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Error Occurred");
      expect(suggestion.message).toContain("Unmapped error");
      expect(suggestion.retryable).toBe(true);
    });
  });

  describe("formatErrorSuggestion", () => {
    it("formats error suggestion with title and message", () => {
      const suggestion: ErrorRecoverySuggestion = {
        title: "Test Error",
        message: "This is a test error",
        actions: ["Action 1", "Action 2"],
        retryable: true,
      };

      const formatted = formatErrorSuggestion(suggestion);

      expect(formatted).toContain("❌ Test Error");
      expect(formatted).toContain("This is a test error");
      expect(formatted).toContain("What to do:");
      expect(formatted).toContain("Action 1");
      expect(formatted).toContain("Action 2");
      expect(formatted).toContain("💡 This error is retryable");
    });

    it("does not show retryable message for non-retryable errors", () => {
      const suggestion: ErrorRecoverySuggestion = {
        title: "Test Error",
        message: "This is a test error",
        actions: ["Action 1"],
        retryable: false,
      };

      const formatted = formatErrorSuggestion(suggestion);

      expect(formatted).not.toContain("💡 This error is retryable");
      expect(formatted).toContain("❌ Test Error");
    });

    it("handles empty actions array", () => {
      const suggestion: ErrorRecoverySuggestion = {
        title: "Test Error",
        message: "No actions",
        actions: [],
        retryable: true,
      };

      const formatted = formatErrorSuggestion(suggestion);

      expect(formatted).toContain("❌ Test Error");
      expect(formatted).toContain("What to do:");
    });

    it("formats multiline output correctly", () => {
      const suggestion: ErrorRecoverySuggestion = {
        title: "Test Error",
        message: "Test message",
        actions: ["Action 1", "Action 2", "Action 3"],
        retryable: true,
      };

      const formatted = formatErrorSuggestion(suggestion);
      const lines = formatted.split("\n");

      expect(lines.length).toBeGreaterThan(5);
      expect(lines[0]).toContain("❌");
    });
  });

  describe("isRetryable", () => {
    it("returns true for retryable FhevmError codes", () => {
      const retryableErrors = [
        new FhevmError(FhevmErrorCode.NETWORK_ERROR),
        new FhevmError(FhevmErrorCode.ENCRYPTION_FAILED),
        new FhevmError(FhevmErrorCode.DECRYPTION_FAILED),
        new FhevmError(FhevmErrorCode.SIGNATURE_REJECTED),
        new FhevmError(FhevmErrorCode.STORAGE_ERROR),
        new FhevmError(FhevmErrorCode.OPERATION_TIMEOUT),
      ];

      retryableErrors.forEach((error) => {
        expect(isRetryable(error)).toBe(true);
      });
    });

    it("returns false for non-retryable FhevmError codes", () => {
      const nonRetryableErrors = [
        new FhevmError(FhevmErrorCode.PROVIDER_NOT_FOUND),
        new FhevmError(FhevmErrorCode.UNSUPPORTED_CHAIN),
        new FhevmError(FhevmErrorCode.INVALID_FHEVM_TYPE),
        new FhevmError(FhevmErrorCode.INVALID_ENCRYPTION_VALUE),
        new FhevmError(FhevmErrorCode.INVALID_ADDRESS),
        new FhevmError(FhevmErrorCode.SIGNATURE_EXPIRED),
      ];

      nonRetryableErrors.forEach((error) => {
        expect(isRetryable(error)).toBe(false);
      });
    });

    it("returns true for unknown errors (default behavior)", () => {
      const error = new Error("Unknown error");
      expect(isRetryable(error)).toBe(true);
    });

    it("returns true for FhevmAbortError", () => {
      const error = new FhevmAbortError("Aborted");
      expect(isRetryable(error)).toBe(true);
    });
  });

  describe("isUserActionError", () => {
    it("returns true for user action errors", () => {
      const userActionErrors = [
        new FhevmError(FhevmErrorCode.SIGNATURE_REJECTED),
        new FhevmError(FhevmErrorCode.OPERATION_ABORTED),
        new FhevmError(FhevmErrorCode.UNSUPPORTED_CHAIN),
        new FhevmError(FhevmErrorCode.CHAIN_MISMATCH),
      ];

      userActionErrors.forEach((error) => {
        expect(isUserActionError(error)).toBe(true);
      });
    });

    it("returns false for system errors", () => {
      const systemErrors = [
        new FhevmError(FhevmErrorCode.NETWORK_ERROR),
        new FhevmError(FhevmErrorCode.ENCRYPTION_FAILED),
        new FhevmError(FhevmErrorCode.SDK_LOAD_FAILED),
        new FhevmError(FhevmErrorCode.STORAGE_ERROR),
      ];

      systemErrors.forEach((error) => {
        expect(isUserActionError(error)).toBe(false);
      });
    });

    it("returns false for non-FhevmError errors", () => {
      const error = new Error("Generic error");
      expect(isUserActionError(error)).toBe(false);
    });

    it("returns false for StorageError", () => {
      const error = new StorageError(
        StorageErrorCode.READ_FAILED,
        "Read failed"
      );
      expect(isUserActionError(error)).toBe(false);
    });
  });

  describe("createFhevmErrorWithSuggestion", () => {
    it("creates FhevmError with provided message", () => {
      const error = createFhevmErrorWithSuggestion(
        FhevmErrorCode.NETWORK_ERROR,
        "Custom network error"
      );

      expect(error).toBeInstanceOf(FhevmError);
      expect(error.code).toBe(FhevmErrorCode.NETWORK_ERROR);
      expect(error.message).toBe("Custom network error");
    });

    it("creates FhevmError with default message when not provided", () => {
      const error = createFhevmErrorWithSuggestion(
        FhevmErrorCode.NETWORK_ERROR
      );

      expect(error).toBeInstanceOf(FhevmError);
      expect(error.code).toBe(FhevmErrorCode.NETWORK_ERROR);
      expect(error.message).toBeDefined();
    });

    it("includes context when provided", () => {
      const context = { detail: "test context" };
      const error = createFhevmErrorWithSuggestion(
        FhevmErrorCode.ENCRYPTION_FAILED,
        "Encryption error",
        context
      );

      expect(error).toBeInstanceOf(FhevmError);
      expect(error.context).toEqual(context);
    });

    it("can get recovery suggestion from created error", () => {
      const error = createFhevmErrorWithSuggestion(
        FhevmErrorCode.ENCRYPTION_FAILED,
        "Test encryption error"
      );

      const suggestion = getErrorRecoverySuggestion(error);

      expect(suggestion.title).toBe("Encryption Failed");
      expect(suggestion.retryable).toBe(true);
    });
  });

  describe("Integration tests", () => {
    it("full error handling flow with formatting", () => {
      const error = new FhevmError(
        FhevmErrorCode.DECRYPTION_FAILED,
        "Failed to decrypt value"
      );

      const suggestion = getErrorRecoverySuggestion(error);
      const formatted = formatErrorSuggestion(suggestion);
      const retryable = isRetryable(error);
      const userAction = isUserActionError(error);

      expect(suggestion.title).toBe("Decryption Failed");
      expect(formatted).toContain("Decryption Failed");
      expect(retryable).toBe(true);
      expect(userAction).toBe(false);
    });

    it("handles error chain: create -> recover -> format -> check", () => {
      const error = createFhevmErrorWithSuggestion(
        FhevmErrorCode.SIGNATURE_REJECTED,
        "User rejected signature"
      );

      const suggestion = getErrorRecoverySuggestion(error);
      const formatted = formatErrorSuggestion(suggestion);

      expect(isRetryable(error)).toBe(true);
      expect(isUserActionError(error)).toBe(true);
      expect(formatted).toContain("Signature Request Rejected");
      expect(suggestion.actions.some((a) => a.includes("Approve"))).toBe(true);
    });
  });
});
