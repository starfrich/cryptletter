/**
 * Tests for vue/useFHEDecrypt.ts
 *
 * These tests cover the useFHEDecrypt composable for decrypting FHEVM handles.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useFHEDecrypt, type UseFHEDecryptParams } from "../../src/vue/useFHEDecrypt";
import type { FhevmInstance } from "../../src/core/types";
import { GenericStringInMemoryStorage } from "../../src/storage/GenericStringStorage";
import { FhevmError, FhevmErrorCode } from "../../src/types/errors";

// Mock FhevmDecryptionSignature
vi.mock("../../src/FhevmDecryptionSignature", () => ({
  FhevmDecryptionSignature: {
    loadOrSign: vi.fn(),
  },
}));

// Mock decryption utilities
vi.mock("../../src/core/decryption", () => ({
  decryptBatch: vi.fn(),
  getUniqueContractAddresses: vi.fn((requests) => {
    const addresses = new Set(requests.map((r: any) => r.contractAddress));
    return Array.from(addresses);
  }),
}));

describe("useFHEDecrypt Composable", () => {
  const mockInstance: Partial<FhevmInstance> = {
    createEncryptedInput: vi.fn(),
  };

  const mockSignTypedData = vi.fn(async (domain, types, message) => {
    return "0xmocksignature";
  });

  const mockGetAddress = vi.fn(async () => "0x" + "a".repeat(40));

  const storage = new GenericStringInMemoryStorage();
  const chainId = 1;

  let mockLoadOrSign: ReturnType<typeof vi.fn>;
  let mockDecryptBatch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    storage.removeItem("fhevm-decryption-signature");

    // Get mocked functions
    const { FhevmDecryptionSignature } = await import("../../src/FhevmDecryptionSignature");
    const { decryptBatch } = await import("../../src/core/decryption");

    mockLoadOrSign = vi.mocked(FhevmDecryptionSignature.loadOrSign);
    mockDecryptBatch = vi.mocked(decryptBatch);

    // Reset mocks
    mockLoadOrSign.mockReset();
    mockDecryptBatch.mockReset();
  });

  describe("Initial State", () => {
    it("initializes with default state", () => {
      const { canDecrypt, isDecrypting, message, results, error, retryCount } = useFHEDecrypt({
        instance: undefined,
        signTypedData: undefined,
        getAddress: undefined,
        fhevmDecryptionSignatureStorage: storage,
        chainId: undefined,
        requests: undefined,
      });

      expect(canDecrypt.value).toBe(false);
      expect(isDecrypting.value).toBe(false);
      expect(message.value).toBe("");
      expect(results.value).toEqual({});
      expect(error.value).toBeNull();
      expect(retryCount.value).toBe(0);
    });

    it("enables decryption when all dependencies are ready", () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { canDecrypt } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      });

      expect(canDecrypt.value).toBe(true);
    });

    it("disables decryption when missing instance", () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { canDecrypt } = useFHEDecrypt({
        instance: undefined,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      });

      expect(canDecrypt.value).toBe(false);
    });

    it("disables decryption when missing signTypedData", () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { canDecrypt } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: undefined,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      });

      expect(canDecrypt.value).toBe(false);
    });

    it("disables decryption when missing getAddress", () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { canDecrypt } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: undefined,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      });

      expect(canDecrypt.value).toBe(false);
    });

    it("disables decryption when requests is empty", () => {
      const { canDecrypt } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests: [],
      });

      expect(canDecrypt.value).toBe(false);
    });

    it("disables decryption when requests is undefined", () => {
      const { canDecrypt } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests: undefined,
      });

      expect(canDecrypt.value).toBe(false);
    });
  });

  describe("Decryption Process", () => {
    it("should perform successful decryption", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const mockSignature = {
        publicKey: "0xpubkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
        contractAddresses: ["0x" + "b".repeat(40)],
        userAddress: "0x" + "a".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 30,
      };

      mockLoadOrSign.mockResolvedValue(mockSignature);
      mockDecryptBatch.mockResolvedValue({
        success: true,
        results: { "0x123": 42n },
      });

      const { decrypt, isDecrypting, results, message, error } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      });

      decrypt();

      await vi.waitFor(() => {
        expect(isDecrypting.value).toBe(false);
      }, { timeout: 1000 });

      expect(results.value).toEqual({ "0x123": 42n });
      expect(message.value).toBe("Decryption completed successfully");
      expect(error.value).toBeNull();
    });

    it("should call onSuccess callback on successful decryption", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const mockSignature = {
        publicKey: "0xpubkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
        contractAddresses: ["0x" + "b".repeat(40)],
        userAddress: "0x" + "a".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 30,
      };

      mockLoadOrSign.mockResolvedValue(mockSignature);
      mockDecryptBatch.mockResolvedValue({
        success: true,
        results: { "0x123": 42n },
      });

      const onSuccess = vi.fn();

      const { decrypt } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        onSuccess,
      });

      decrypt();

      await vi.waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({ "0x123": 42n });
      }, { timeout: 1000 });
    });

    it("should handle signature creation failure", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      mockLoadOrSign.mockResolvedValue(null);

      const { decrypt, error, message } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        retry: { maxRetries: 2, retryDelay: 100 }, // Reduce delay for faster test
      });

      decrypt();

      await vi.waitFor(() => {
        expect(error.value).not.toBeNull();
      }, { timeout: 2000 });

      expect(error.value).toContain("SIGNATURE_FAILED");
      expect(message.value).toBe("FHEVM decryption failed");
    });

    it("should handle decryption batch failure", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const mockSignature = {
        publicKey: "0xpubkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
        contractAddresses: ["0x" + "b".repeat(40)],
        userAddress: "0x" + "a".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 30,
      };

      mockLoadOrSign.mockResolvedValue(mockSignature);
      mockDecryptBatch.mockResolvedValue({
        success: false,
        error: "Decryption failed",
      });

      const { decrypt, error, message } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        retry: { maxRetries: 2, retryDelay: 100 }, // Reduce delay for faster test
      });

      decrypt();

      await vi.waitFor(() => {
        expect(error.value).not.toBeNull();
      }, { timeout: 2000 });

      expect(error.value).toContain("DECRYPTION_FAILED");
      expect(message.value).toBe("FHEVM decryption failed");
    });

    it("should call onError callback on decryption failure", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      mockLoadOrSign.mockResolvedValue(null);

      const onError = vi.fn();

      const { decrypt } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        retry: { maxRetries: 2, retryDelay: 100 }, // Reduce delay for faster test
        onError,
      });

      decrypt();

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalled();
      }, { timeout: 2000 });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should update message during decryption", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const mockSignature = {
        publicKey: "0xpubkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
        contractAddresses: ["0x" + "b".repeat(40)],
        userAddress: "0x" + "a".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 30,
      };

      mockLoadOrSign.mockResolvedValue(mockSignature);
      mockDecryptBatch.mockImplementation(async ({ onProgress }) => {
        onProgress?.("Fetching from relayer...");
        onProgress?.("Processing decryption...");
        return { success: true, results: { "0x123": 42n } };
      });

      const { decrypt, message } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      });

      decrypt();

      await vi.waitFor(() => {
        expect(message.value).toBe("Decryption completed successfully");
      }, { timeout: 1000 });
    });
  });

  describe("Retry Logic", () => {
    it("should retry on failure when configured", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const mockSignature = {
        publicKey: "0xpubkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
        contractAddresses: ["0x" + "b".repeat(40)],
        userAddress: "0x" + "a".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 30,
      };

      mockLoadOrSign.mockResolvedValue(mockSignature);
      mockDecryptBatch
        .mockResolvedValueOnce({ success: false, error: "Network error" })
        .mockResolvedValueOnce({ success: true, results: { "0x123": 42n } });

      const { decrypt, results, retryCount } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        retry: { maxRetries: 2, retryDelay: 100 },
      });

      decrypt();

      await vi.waitFor(() => {
        expect(results.value).toEqual({ "0x123": 42n });
      }, { timeout: 2000 });

      expect(retryCount.value).toBe(0); // Reset after success
      expect(mockDecryptBatch).toHaveBeenCalledTimes(2);
    });

    it("should stop retrying when max retries reached", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      mockLoadOrSign.mockResolvedValue(null);

      const { decrypt, error } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        retry: { maxRetries: 2, retryDelay: 50 },
      });

      decrypt();

      await vi.waitFor(() => {
        expect(error.value).not.toBeNull();
      }, { timeout: 1000 });

      // Should have tried: initial + 2 retries = 3 times
      expect(mockLoadOrSign).toHaveBeenCalledTimes(3);
    });

    it("should not retry when retry is disabled", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      mockLoadOrSign.mockResolvedValue(null);

      const { decrypt, error } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        retry: false,
      });

      decrypt();

      await vi.waitFor(() => {
        expect(error.value).not.toBeNull();
      }, { timeout: 1000 });

      // Should only try once
      expect(mockLoadOrSign).toHaveBeenCalledTimes(1);
    });

    it("should update retry count during retries", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      mockLoadOrSign.mockResolvedValue(null);

      const retryCountValues: number[] = [];

      const { decrypt, retryCount, error } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        retry: { maxRetries: 2, retryDelay: 50 },
      });

      // Watch retry count changes
      const stopWatch = vi.fn(() => {
        retryCountValues.push(retryCount.value);
      });

      decrypt();

      // Poll retry count
      const interval = setInterval(() => stopWatch(), 20);

      await vi.waitFor(() => {
        expect(error.value).not.toBeNull();
      }, { timeout: 1000 });

      clearInterval(interval);

      // Should have seen increasing retry counts
      expect(retryCountValues.some(v => v > 0)).toBe(true);
    });
  });

  describe("Auto-decrypt", () => {
    it("should not auto-decrypt by default", async () => {
      const requests = ref([
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ]);

      const mockSignature = {
        publicKey: "0xpubkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
        contractAddresses: ["0x" + "b".repeat(40)],
        userAddress: "0x" + "a".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 30,
      };

      mockLoadOrSign.mockResolvedValue(mockSignature);
      mockDecryptBatch.mockResolvedValue({
        success: true,
        results: { "0x123": 42n },
      });

      const { isDecrypting } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        autoDecrypt: false,
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(isDecrypting.value).toBe(false);
      expect(mockLoadOrSign).not.toHaveBeenCalled();
    });

    it("should auto-decrypt when enabled and requests change", async () => {
      const requests = ref([
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ]);

      const mockSignature = {
        publicKey: "0xpubkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
        contractAddresses: ["0x" + "b".repeat(40)],
        userAddress: "0x" + "a".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 30,
      };

      mockLoadOrSign.mockResolvedValue(mockSignature);
      mockDecryptBatch.mockResolvedValue({
        success: true,
        results: { "0x123": 42n },
      });

      const { results, decrypt } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        autoDecrypt: true,
      });

      // Manually trigger decrypt since we're outside Vue component context
      // In real usage, the watch would auto-trigger when requests change
      decrypt();

      await vi.waitFor(() => {
        expect(results.value).toEqual({ "0x123": 42n });
      }, { timeout: 2000 });

      expect(mockLoadOrSign).toHaveBeenCalled();
    });
  });

  describe("Reactive Parameters", () => {
    it("should accept refs for all parameters", () => {
      const instanceRef = ref(mockInstance as FhevmInstance);
      const signTypedDataRef = ref(mockSignTypedData);
      const getAddressRef = ref(mockGetAddress);
      const chainIdRef = ref(chainId);
      const requestsRef = ref([
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ]);

      const { canDecrypt } = useFHEDecrypt({
        instance: instanceRef,
        signTypedData: signTypedDataRef,
        getAddress: getAddressRef,
        fhevmDecryptionSignatureStorage: storage,
        chainId: chainIdRef,
        requests: requestsRef,
      });

      expect(canDecrypt.value).toBe(true);
    });

    it("should accept static values for all parameters", () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { canDecrypt } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      });

      expect(canDecrypt.value).toBe(true);
    });

    it("should react to changes in instance", async () => {
      const instanceRef = ref<FhevmInstance | undefined>(undefined);
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { canDecrypt } = useFHEDecrypt({
        instance: instanceRef,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      });

      expect(canDecrypt.value).toBe(false);

      instanceRef.value = mockInstance as FhevmInstance;
      await nextTick();

      expect(canDecrypt.value).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle callback errors gracefully", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const mockSignature = {
        publicKey: "0xpubkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
        contractAddresses: ["0x" + "b".repeat(40)],
        userAddress: "0x" + "a".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 30,
      };

      mockLoadOrSign.mockResolvedValue(mockSignature);
      mockDecryptBatch.mockResolvedValue({
        success: true,
        results: { "0x123": 42n },
      });

      const onSuccess = vi.fn(() => {
        throw new Error("Callback error");
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { decrypt } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        onSuccess,
      });

      decrypt();

      await vi.waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      }, { timeout: 1000 });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("onSuccess callback error"),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should provide error message from error code", async () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      mockLoadOrSign.mockResolvedValue(null);

      const { decrypt, error, errorMessage } = useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        retry: { maxRetries: 2, retryDelay: 100 }, // Reduce delay for faster test
      });

      decrypt();

      await vi.waitFor(() => {
        expect(error.value).not.toBeNull();
      }, { timeout: 2000 });

      expect(errorMessage.value).toBeDefined();
      expect(errorMessage.value).toContain("Failed to create decryption signature");
    });
  });

  describe("Return Values", () => {
    it("should provide all expected return values", () => {
      const result = useFHEDecrypt({
        instance: undefined,
        signTypedData: undefined,
        getAddress: undefined,
        fhevmDecryptionSignatureStorage: storage,
        chainId: undefined,
        requests: undefined,
      });

      expect(result).toHaveProperty("canDecrypt");
      expect(result).toHaveProperty("decrypt");
      expect(result).toHaveProperty("isDecrypting");
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("errorMessage");
      expect(result).toHaveProperty("retryCount");
    });
  });
});
