import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isSignatureValid,
  getUniqueContractAddresses,
  isValidDecryptionRequest,
  filterValidRequests,
  decryptBatch,
  decryptValue,
  type DecryptionSignature,
  type DecryptionRequest,
} from "../../src/core/decryption";
import type { FhevmInstance } from "../../src/core/types";

describe("Core Decryption Utils", () => {
  describe("isSignatureValid", () => {
    const now = Math.floor(Date.now() / 1000);

    it("returns true for valid signature", () => {
      const signature: DecryptionSignature = {
        publicKey: "pk",
        privateKey: "sk",
        signature: "sig",
        contractAddresses: ["0x" + "0".repeat(40)] as const,
        userAddress: "0x" + "1".repeat(40),
        startTimestamp: now - 86400, // Started yesterday
        durationDays: 7,
      };
      expect(isSignatureValid(signature)).toBe(true);
    });

    it("returns false for expired signature", () => {
      const signature: DecryptionSignature = {
        publicKey: "pk",
        privateKey: "sk",
        signature: "sig",
        contractAddresses: ["0x" + "0".repeat(40)] as const,
        userAddress: "0x" + "1".repeat(40),
        startTimestamp: now - 10 * 86400, // Started 10 days ago
        durationDays: 7, // Expired 3 days ago
      };
      expect(isSignatureValid(signature)).toBe(false);
    });

    it("returns true for signature expiring soon", () => {
      const signature: DecryptionSignature = {
        publicKey: "pk",
        privateKey: "sk",
        signature: "sig",
        contractAddresses: ["0x" + "0".repeat(40)] as const,
        userAddress: "0x" + "1".repeat(40),
        startTimestamp: now - 86400,
        durationDays: 7, // Expires tomorrow
      };
      expect(isSignatureValid(signature)).toBe(true);
    });
  });

  describe("getUniqueContractAddresses", () => {
    it("returns unique addresses", () => {
      const requests: DecryptionRequest[] = [
        {
          handle: "0x123",
          contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        },
        {
          handle: "0x456",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
        {
          handle: "0x789",
          contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        },
      ];

      const addresses = getUniqueContractAddresses(requests);
      expect(addresses).toHaveLength(2);
      expect(addresses[0]).toBe("0x" + "a".repeat(40));
      expect(addresses[1]).toBe("0x" + "b".repeat(40));
    });

    it("returns empty array for empty requests", () => {
      const addresses = getUniqueContractAddresses([]);
      expect(addresses).toEqual([]);
    });

    it("returns sorted addresses", () => {
      const requests: DecryptionRequest[] = [
        {
          handle: "0x123",
          contractAddress: "0x" + "c".repeat(40) as `0x${string}`,
        },
        {
          handle: "0x456",
          contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        },
        {
          handle: "0x789",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const addresses = getUniqueContractAddresses(requests);
      expect(addresses[0] < addresses[1]).toBe(true);
      expect(addresses[1] < addresses[2]).toBe(true);
    });
  });

  describe("isValidDecryptionRequest", () => {
    it("accepts valid request", () => {
      const request: DecryptionRequest = {
        handle: "0x123abc",
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
      };
      expect(isValidDecryptionRequest(request)).toBe(true);
    });

    it("rejects handle without 0x prefix", () => {
      const request: DecryptionRequest = {
        handle: "123abc",
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
      };
      expect(isValidDecryptionRequest(request)).toBe(false);
    });

    it("rejects handle that is too short", () => {
      const request: DecryptionRequest = {
        handle: "0x",
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
      };
      expect(isValidDecryptionRequest(request)).toBe(false);
    });

    it("rejects non-string handle", () => {
      const request = {
        handle: 123 as any,
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
      };
      expect(isValidDecryptionRequest(request)).toBe(false);
    });

    it("rejects invalid contract address", () => {
      const request: DecryptionRequest = {
        handle: "0x123abc",
        contractAddress: "0x" + "a".repeat(39) as `0x${string}`, // 39 chars instead of 40
      };
      expect(isValidDecryptionRequest(request)).toBe(false);
    });

    it("rejects contract address without 0x prefix", () => {
      const request = {
        handle: "0x123abc",
        contractAddress: "a".repeat(40) as `0x${string}`,
      };
      expect(isValidDecryptionRequest(request)).toBe(false);
    });

    it("rejects non-string contract address", () => {
      const request = {
        handle: "0x123abc",
        contractAddress: 123 as any,
      };
      expect(isValidDecryptionRequest(request)).toBe(false);
    });
  });

  describe("filterValidRequests", () => {
    it("filters out invalid requests", () => {
      const requests: any[] = [
        {
          handle: "0x123abc",
          contractAddress: "0x" + "a".repeat(40),
        }, // valid
        {
          handle: "invalid",
          contractAddress: "0x" + "a".repeat(40),
        }, // invalid handle
        {
          handle: "0x456def",
          contractAddress: "0x" + "b".repeat(40),
        }, // valid
        {
          handle: "0x",
          contractAddress: "0x" + "c".repeat(40),
        }, // invalid handle (too short)
      ];

      const valid = filterValidRequests(requests);
      expect(valid).toHaveLength(2);
      expect(valid[0].handle).toBe("0x123abc");
      expect(valid[1].handle).toBe("0x456def");
    });

    it("returns empty array when all requests are invalid", () => {
      const requests: any[] = [
        { handle: "invalid", contractAddress: "0x" + "a".repeat(40) },
        { handle: "0x", contractAddress: "0x" + "b".repeat(40) },
      ];

      const valid = filterValidRequests(requests);
      expect(valid).toHaveLength(0);
    });

    it("returns all requests when all are valid", () => {
      const requests: DecryptionRequest[] = [
        {
          handle: "0x123",
          contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        },
        {
          handle: "0x456",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const valid = filterValidRequests(requests);
      expect(valid).toHaveLength(2);
    });
  });

  describe("decryptBatch", () => {
    const mockSignature: DecryptionSignature = {
      publicKey: "test-public-key",
      privateKey: "test-private-key",
      signature: "test-signature",
      contractAddresses: ["0x" + "a".repeat(40)] as const,
      userAddress: "0x" + "1".repeat(40) as `0x${string}`,
      startTimestamp: Math.floor(Date.now() / 1000),
      durationDays: 7,
    };

    it("should successfully decrypt batch of requests", async () => {
      const mockResults = {
        "0x123": BigInt(42),
        "0x456": true,
        "0x789": "decrypted-value",
      };

      const mockInstance = {
        userDecrypt: vi.fn(async () => mockResults),
      } as unknown as FhevmInstance;

      const requests: DecryptionRequest[] = [
        { handle: "0x123", contractAddress: "0x" + "a".repeat(40) as `0x${string}` },
        { handle: "0x456", contractAddress: "0x" + "a".repeat(40) as `0x${string}` },
        { handle: "0x789", contractAddress: "0x" + "a".repeat(40) as `0x${string}` },
      ];

      const result = await decryptBatch({
        instance: mockInstance,
        requests,
        signature: mockSignature,
      });

      expect(result.success).toBe(true);
      expect(result.results).toEqual(mockResults);
      expect(mockInstance.userDecrypt).toHaveBeenCalledWith(
        requests.map((r) => ({ handle: r.handle, contractAddress: r.contractAddress })),
        mockSignature.privateKey,
        mockSignature.publicKey,
        mockSignature.signature,
        mockSignature.contractAddresses,
        mockSignature.userAddress,
        mockSignature.startTimestamp,
        mockSignature.durationDays
      );
    });

    it("should handle empty requests array", async () => {
      const mockInstance = {
        userDecrypt: vi.fn(),
      } as unknown as FhevmInstance;

      const result = await decryptBatch({
        instance: mockInstance,
        requests: [],
        signature: mockSignature,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No requests to decrypt");
      expect(mockInstance.userDecrypt).not.toHaveBeenCalled();
    });

    it("should handle decryption errors gracefully", async () => {
      const mockInstance = {
        userDecrypt: vi.fn(async () => {
          throw new Error("Decryption failed: Invalid signature");
        }),
      } as unknown as FhevmInstance;

      const requests: DecryptionRequest[] = [
        { handle: "0x123", contractAddress: "0x" + "a".repeat(40) as `0x${string}` },
      ];

      const result = await decryptBatch({
        instance: mockInstance,
        requests,
        signature: mockSignature,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Decryption failed: Invalid signature");
      expect(result.results).toEqual({});
    });

    it("should call onProgress callback during decryption", async () => {
      const mockResults = { "0x123": BigInt(100) };
      const mockInstance = {
        userDecrypt: vi.fn(async () => mockResults),
      } as unknown as FhevmInstance;

      const requests: DecryptionRequest[] = [
        { handle: "0x123", contractAddress: "0x" + "a".repeat(40) as `0x${string}` },
      ];

      const progressMessages: string[] = [];
      const onProgress = vi.fn((msg: string) => {
        progressMessages.push(msg);
      });

      const result = await decryptBatch({
        instance: mockInstance,
        requests,
        signature: mockSignature,
        onProgress,
      });

      expect(result.success).toBe(true);
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(progressMessages).toContain("Starting decryption...");
      expect(progressMessages).toContain("Calling FHEVM userDecrypt...");
      expect(progressMessages).toContain("Decryption completed!");
    });

    it("should call onProgress with error message on failure", async () => {
      const mockInstance = {
        userDecrypt: vi.fn(async () => {
          throw new Error("Network timeout");
        }),
      } as unknown as FhevmInstance;

      const requests: DecryptionRequest[] = [
        { handle: "0x123", contractAddress: "0x" + "a".repeat(40) as `0x${string}` },
      ];

      const progressMessages: string[] = [];
      const onProgress = vi.fn((msg: string) => {
        progressMessages.push(msg);
      });

      await decryptBatch({
        instance: mockInstance,
        requests,
        signature: mockSignature,
        onProgress,
      });

      expect(progressMessages).toContain("Decryption failed: Network timeout");
    });

    it("should handle multiple contract addresses", async () => {
      const mockResults = {
        "0x123": BigInt(10),
        "0x456": BigInt(20),
      };

      const mockInstance = {
        userDecrypt: vi.fn(async () => mockResults),
      } as unknown as FhevmInstance;

      const requests: DecryptionRequest[] = [
        { handle: "0x123", contractAddress: "0x" + "a".repeat(40) as `0x${string}` },
        { handle: "0x456", contractAddress: "0x" + "b".repeat(40) as `0x${string}` },
      ];

      const result = await decryptBatch({
        instance: mockInstance,
        requests,
        signature: mockSignature,
      });

      expect(result.success).toBe(true);
      expect(result.results).toEqual(mockResults);
    });
  });

  describe("decryptValue", () => {
    const mockSignature: DecryptionSignature = {
      publicKey: "test-public-key",
      privateKey: "test-private-key",
      signature: "test-signature",
      contractAddresses: ["0x" + "a".repeat(40)] as const,
      userAddress: "0x" + "1".repeat(40) as `0x${string}`,
      startTimestamp: Math.floor(Date.now() / 1000),
      durationDays: 7,
    };

    it("should decrypt single value successfully", async () => {
      const mockResults = { "0x123": BigInt(42) };
      const mockInstance = {
        userDecrypt: vi.fn(async () => mockResults),
      } as unknown as FhevmInstance;

      const value = await decryptValue(
        mockInstance,
        "0x123",
        "0x" + "a".repeat(40) as `0x${string}`,
        mockSignature
      );

      expect(value).toBe(BigInt(42));
      expect(mockInstance.userDecrypt).toHaveBeenCalledTimes(1);
    });

    it("should return undefined on decryption failure", async () => {
      const mockInstance = {
        userDecrypt: vi.fn(async () => {
          throw new Error("Decryption failed");
        }),
      } as unknown as FhevmInstance;

      const value = await decryptValue(
        mockInstance,
        "0x123",
        "0x" + "a".repeat(40) as `0x${string}`,
        mockSignature
      );

      expect(value).toBeUndefined();
    });

    it("should handle boolean decrypted values", async () => {
      const mockResults = { "0xabc": true };
      const mockInstance = {
        userDecrypt: vi.fn(async () => mockResults),
      } as unknown as FhevmInstance;

      const value = await decryptValue(
        mockInstance,
        "0xabc",
        "0x" + "a".repeat(40) as `0x${string}`,
        mockSignature
      );

      expect(value).toBe(true);
    });

    it("should handle string decrypted values", async () => {
      const mockResults = { "0xdef": "0x" + "c".repeat(40) };
      const mockInstance = {
        userDecrypt: vi.fn(async () => mockResults),
      } as unknown as FhevmInstance;

      const value = await decryptValue(
        mockInstance,
        "0xdef",
        "0x" + "a".repeat(40) as `0x${string}`,
        mockSignature
      );

      expect(value).toBe("0x" + "c".repeat(40));
    });

    it("should handle BigInt decrypted values", async () => {
      const mockResults = { "0x999": BigInt("999999999999999999") };
      const mockInstance = {
        userDecrypt: vi.fn(async () => mockResults),
      } as unknown as FhevmInstance;

      const value = await decryptValue(
        mockInstance,
        "0x999",
        "0x" + "a".repeat(40) as `0x${string}`,
        mockSignature
      );

      expect(value).toBe(BigInt("999999999999999999"));
    });
  });
});
