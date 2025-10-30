import { describe, it, expect } from "vitest";
import {
  FhevmError,
  FhevmErrorCode,
  FhevmAbortError,
  StorageError,
  StorageErrorCode,
  isFhevmError,
  isFhevmAbortError,
  isStorageError,
  getErrorMessage,
} from "../../src/types/errors";

describe("types/errors", () => {
  describe("FhevmError", () => {
    it("should create error with code and message", () => {
      const error = new FhevmError(
        FhevmErrorCode.PROVIDER_NOT_FOUND,
        "Provider not found"
      );

      expect(error.name).toBe("FhevmError");
      expect(error.code).toBe(FhevmErrorCode.PROVIDER_NOT_FOUND);
      expect(error.message).toBe("Provider not found");
      expect(error.context).toBeUndefined();
    });

    it("should create error with code only", () => {
      const error = new FhevmError(FhevmErrorCode.NETWORK_ERROR);

      expect(error.name).toBe("FhevmError");
      expect(error.code).toBe(FhevmErrorCode.NETWORK_ERROR);
      expect(error.message).toBe(FhevmErrorCode.NETWORK_ERROR);
    });

    it("should create error with context", () => {
      const context = { originalError: new Error("Network failed") };
      const error = new FhevmError(
        FhevmErrorCode.NETWORK_ERROR,
        "Network error",
        context
      );

      expect(error.context).toBe(context);
    });

    it("should maintain proper prototype chain", () => {
      const error = new FhevmError(FhevmErrorCode.UNKNOWN_ERROR);

      expect(error instanceof FhevmError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it("should serialize to JSON", () => {
      const error = new FhevmError(
        FhevmErrorCode.ENCRYPTION_FAILED,
        "Encryption failed",
        { value: 42 }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        name: "FhevmError",
        code: FhevmErrorCode.ENCRYPTION_FAILED,
        message: "Encryption failed",
        context: { value: 42 },
      });
    });
  });

  describe("FhevmAbortError", () => {
    it("should create abort error with default message", () => {
      const error = new FhevmAbortError();

      expect(error.name).toBe("FhevmAbortError");
      expect(error.message).toBe("FHEVM operation was cancelled");
    });

    it("should create abort error with custom message", () => {
      const error = new FhevmAbortError("Custom abort message");

      expect(error.name).toBe("FhevmAbortError");
      expect(error.message).toBe("Custom abort message");
    });

    it("should maintain proper prototype chain", () => {
      const error = new FhevmAbortError();

      expect(error instanceof FhevmAbortError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("StorageError", () => {
    it("should create storage error with code and message", () => {
      const error = new StorageError(
        StorageErrorCode.QUOTA_EXCEEDED,
        "Storage quota exceeded"
      );

      expect(error.name).toBe("StorageError");
      expect(error.code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
      expect(error.message).toBe("Storage quota exceeded");
      expect(error.cause).toBeUndefined();
    });

    it("should create storage error with cause", () => {
      const cause = new Error("Original error");
      const error = new StorageError(
        StorageErrorCode.OPERATION_FAILED,
        "Operation failed",
        cause
      );

      expect(error.cause).toBe(cause);
    });

    it("should maintain proper prototype chain", () => {
      const error = new StorageError(
        StorageErrorCode.NOT_AVAILABLE,
        "Not available"
      );

      expect(error instanceof StorageError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it("should serialize to JSON", () => {
      const cause = new Error("Cause");
      const error = new StorageError(
        StorageErrorCode.INVALID_INPUT,
        "Invalid input",
        cause
      );

      const json = error.toJSON();

      expect(json).toEqual({
        name: "StorageError",
        code: StorageErrorCode.INVALID_INPUT,
        message: "Invalid input",
        cause: cause,
      });
    });
  });

  describe("isFhevmError", () => {
    it("should return true for FhevmError", () => {
      const error = new FhevmError(FhevmErrorCode.UNKNOWN_ERROR);
      expect(isFhevmError(error)).toBe(true);
    });

    it("should return false for non-FhevmError", () => {
      expect(isFhevmError(new Error())).toBe(false);
      expect(isFhevmError(new FhevmAbortError())).toBe(false);
      expect(isFhevmError("error")).toBe(false);
      expect(isFhevmError(null)).toBe(false);
    });
  });

  describe("isFhevmAbortError", () => {
    it("should return true for FhevmAbortError", () => {
      const error = new FhevmAbortError();
      expect(isFhevmAbortError(error)).toBe(true);
    });

    it("should return false for non-FhevmAbortError", () => {
      expect(isFhevmAbortError(new Error())).toBe(false);
      expect(isFhevmAbortError(new FhevmError(FhevmErrorCode.UNKNOWN_ERROR))).toBe(false);
      expect(isFhevmAbortError("error")).toBe(false);
      expect(isFhevmAbortError(null)).toBe(false);
    });
  });

  describe("isStorageError", () => {
    it("should return true for StorageError", () => {
      const error = new StorageError(
        StorageErrorCode.NOT_AVAILABLE,
        "Not available"
      );
      expect(isStorageError(error)).toBe(true);
    });

    it("should return false for non-StorageError", () => {
      expect(isStorageError(new Error())).toBe(false);
      expect(isStorageError(new FhevmError(FhevmErrorCode.UNKNOWN_ERROR))).toBe(false);
      expect(isStorageError("error")).toBe(false);
      expect(isStorageError(null)).toBe(false);
    });
  });

  describe("getErrorMessage", () => {
    it("should return message for PROVIDER_NOT_FOUND", () => {
      const error = new FhevmError(FhevmErrorCode.PROVIDER_NOT_FOUND);
      const message = getErrorMessage(error);

      expect(message).toContain("Ethereum provider");
      expect(message).toContain("MetaMask");
    });

    it("should return message for UNSUPPORTED_CHAIN", () => {
      const error = new FhevmError(FhevmErrorCode.UNSUPPORTED_CHAIN);
      const message = getErrorMessage(error);

      expect(message).toContain("not supported");
      expect(message).toContain("network");
    });

    it("should return message for SDK_LOAD_FAILED", () => {
      const error = new FhevmError(FhevmErrorCode.SDK_LOAD_FAILED);
      const message = getErrorMessage(error);

      expect(message).toContain("Failed to load");
      expect(message).toContain("connection");
    });

    it("should return message for SIGNATURE_REJECTED", () => {
      const error = new FhevmError(FhevmErrorCode.SIGNATURE_REJECTED);
      const message = getErrorMessage(error);

      expect(message).toContain("rejected");
      expect(message).toContain("approve");
    });

    it("should return message for STORAGE_QUOTA_EXCEEDED", () => {
      const error = new FhevmError(FhevmErrorCode.STORAGE_QUOTA_EXCEEDED);
      const message = getErrorMessage(error);

      expect(message).toContain("quota exceeded");
      expect(message).toContain("clear");
    });

    it("should return default message for unmapped error codes", () => {
      const error = new FhevmError(
        FhevmErrorCode.NETWORK_ERROR,
        "Custom network error"
      );
      const message = getErrorMessage(error);

      expect(message).toBe("Custom network error");
    });

    it("should return code as message when message is empty", () => {
      const error = new FhevmError(FhevmErrorCode.CHAIN_MISMATCH);
      const message = getErrorMessage(error);

      expect(message).toBe(FhevmErrorCode.CHAIN_MISMATCH);
    });

    it("should return message for FhevmAbortError", () => {
      const error = new FhevmAbortError();
      const message = getErrorMessage(error);

      expect(message).toBe("Operation was cancelled.");
    });

    it("should return message for StorageError", () => {
      const error = new StorageError(
        StorageErrorCode.NOT_AVAILABLE,
        "Storage not available"
      );
      const message = getErrorMessage(error);

      expect(message).toBe("Storage error: Storage not available");
    });

    it("should return message for generic Error", () => {
      const error = new Error("Generic error");
      const message = getErrorMessage(error);

      expect(message).toBe("Generic error");
    });

    it("should return default message for unknown error types", () => {
      const message = getErrorMessage("string error");

      expect(message).toBe("An unknown error occurred.");
    });

    it("should return default message for null", () => {
      const message = getErrorMessage(null);

      expect(message).toBe("An unknown error occurred.");
    });

    it("should return default message for undefined", () => {
      const message = getErrorMessage(undefined);

      expect(message).toBe("An unknown error occurred.");
    });
  });

  describe("All FhevmErrorCode values", () => {
    it("should handle all error codes without throwing", () => {
      const allCodes = Object.values(FhevmErrorCode);

      allCodes.forEach((code) => {
        expect(() => {
          const error = new FhevmError(code as FhevmErrorCode);
          getErrorMessage(error);
        }).not.toThrow();
      });
    });
  });

  describe("All StorageErrorCode values", () => {
    it("should handle all storage error codes without throwing", () => {
      const allCodes = Object.values(StorageErrorCode);

      allCodes.forEach((code) => {
        expect(() => {
          const error = new StorageError(
            code as StorageErrorCode,
            "Test message"
          );
          getErrorMessage(error);
        }).not.toThrow();
      });
    });
  });
});
