import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateFhevmType,
  encryptSingle,
  decryptHandle,
  parseEncryptedData,
  buildDecryptionRequests,
  helpers,
} from "../../src/vanilla/helpers";
import type { FhevmInstance } from "../../src/core/types";
import type { DecryptionSignature } from "../../src/core/decryption";

// Create a simple mock instance
function createMockFhevmInstance(): FhevmInstance {
  return {
    clientKey: {} as any,
    publicKey: {} as any,
    gatewayUrl: "http://localhost:8545",
    chainId: 31337,
  };
}

// Mock the core modules
vi.mock("../../src/core/encryption", async () => {
  const actual = await vi.importActual<typeof import("../../src/core/encryption")>(
    "../../src/core/encryption"
  );
  return {
    ...actual,
    encryptValue: vi.fn(),
    getEncryptionMethod: vi.fn(),
    toHex: vi.fn((data: Uint8Array) => "0x" + Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('')),
  };
});

vi.mock("../../src/core/decryption", async () => {
  const actual = await vi.importActual<typeof import("../../src/core/decryption")>(
    "../../src/core/decryption"
  );
  return {
    ...actual,
    decryptValue: vi.fn(),
    isSignatureValid: vi.fn(),
    getUniqueContractAddresses: vi.fn(),
    filterValidRequests: vi.fn(),
  };
});

describe("Vanilla Helpers", () => {
  let mockInstance: FhevmInstance;
  const contractAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC" as `0x${string}`;
  const userAddress = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed" as `0x${string}`;

  beforeEach(() => {
    mockInstance = createMockFhevmInstance();
    vi.clearAllMocks();
  });

  describe("validateFhevmType", () => {
    it("should validate ebool type", () => {
      expect(validateFhevmType("ebool")).toBe(true);
    });

    it("should validate euint8 type", () => {
      expect(validateFhevmType("euint8")).toBe(true);
    });

    it("should validate euint16 type", () => {
      expect(validateFhevmType("euint16")).toBe(true);
    });

    it("should validate euint32 type", () => {
      expect(validateFhevmType("euint32")).toBe(true);
    });

    it("should validate euint64 type", () => {
      expect(validateFhevmType("euint64")).toBe(true);
    });

    it("should validate euint128 type", () => {
      expect(validateFhevmType("euint128")).toBe(true);
    });

    it("should validate euint256 type", () => {
      expect(validateFhevmType("euint256")).toBe(true);
    });

    it("should validate eaddress type", () => {
      expect(validateFhevmType("eaddress")).toBe(true);
    });

    it("should reject invalid types", () => {
      expect(validateFhevmType("uint256")).toBe(false);
      expect(validateFhevmType("address")).toBe(false);
      expect(validateFhevmType("bool")).toBe(false);
      expect(validateFhevmType("string")).toBe(false);
      expect(validateFhevmType("euint512")).toBe(false);
      expect(validateFhevmType("")).toBe(false);
      expect(validateFhevmType("random")).toBe(false);
    });

    it("should be case sensitive", () => {
      expect(validateFhevmType("EBOOL")).toBe(false);
      expect(validateFhevmType("Euint32")).toBe(false);
      expect(validateFhevmType("EUINT64")).toBe(false);
    });
  });

  describe("encryptSingle", () => {
    it("should call encryptValue with correct parameters for number", async () => {
      const { encryptValue } = await import("../../src/core/encryption");
      const mockEncryptValue = encryptValue as ReturnType<typeof vi.fn>;

      mockEncryptValue.mockResolvedValue({
        handles: [new Uint8Array([1, 2, 3, 4])],
        inputProof: new Uint8Array([5, 6, 7, 8]),
      });

      await encryptSingle(mockInstance, contractAddress, userAddress, 100, "euint32");

      expect(mockEncryptValue).toHaveBeenCalledWith(
        mockInstance,
        contractAddress,
        userAddress,
        100,
        "euint32"
      );
    });

    it("should call encryptValue with correct parameters for boolean", async () => {
      const { encryptValue } = await import("../../src/core/encryption");
      const mockEncryptValue = encryptValue as ReturnType<typeof vi.fn>;

      mockEncryptValue.mockResolvedValue({
        handles: [new Uint8Array([1, 2])],
        inputProof: new Uint8Array([3, 4]),
      });

      await encryptSingle(mockInstance, contractAddress, userAddress, true, "ebool");

      expect(mockEncryptValue).toHaveBeenCalledWith(
        mockInstance,
        contractAddress,
        userAddress,
        true,
        "ebool"
      );
    });

    it("should call encryptValue with correct parameters for address", async () => {
      const { encryptValue } = await import("../../src/core/encryption");
      const mockEncryptValue = encryptValue as ReturnType<typeof vi.fn>;

      const addressValue = "0x1234567890123456789012345678901234567890";
      mockEncryptValue.mockResolvedValue({
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      });

      await encryptSingle(
        mockInstance,
        contractAddress,
        userAddress,
        addressValue,
        "eaddress"
      );

      expect(mockEncryptValue).toHaveBeenCalledWith(
        mockInstance,
        contractAddress,
        userAddress,
        addressValue,
        "eaddress"
      );
    });

    it("should return encryption result", async () => {
      const { encryptValue } = await import("../../src/core/encryption");
      const mockEncryptValue = encryptValue as ReturnType<typeof vi.fn>;

      const mockResult = {
        handles: [new Uint8Array([1, 2, 3, 4])],
        inputProof: new Uint8Array([5, 6, 7, 8]),
      };
      mockEncryptValue.mockResolvedValue(mockResult);

      const result = await encryptSingle(
        mockInstance,
        contractAddress,
        userAddress,
        42,
        "euint8"
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe("decryptHandle", () => {
    it("should call decryptValue with correct parameters", async () => {
      const { decryptValue } = await import("../../src/core/decryption");
      const mockDecryptValue = decryptValue as ReturnType<typeof vi.fn>;

      const handle = "0x1234567890abcdef";
      const signature: DecryptionSignature = {
        signature: "0xsignature",
        account: userAddress,
      };
      mockDecryptValue.mockResolvedValue(BigInt(100));

      await decryptHandle(mockInstance, handle, contractAddress, signature);

      expect(mockDecryptValue).toHaveBeenCalledWith(
        mockInstance,
        handle,
        contractAddress,
        signature
      );
    });

    it("should return decrypted value", async () => {
      const { decryptValue } = await import("../../src/core/decryption");
      const mockDecryptValue = decryptValue as ReturnType<typeof vi.fn>;

      const handle = "0xabcdef1234567890";
      const signature: DecryptionSignature = {
        signature: "0xsig",
        account: userAddress,
      };
      const expectedValue = BigInt(42);
      mockDecryptValue.mockResolvedValue(expectedValue);

      const result = await decryptHandle(
        mockInstance,
        handle,
        contractAddress,
        signature
      );

      expect(result).toBe(expectedValue);
    });
  });

  describe("parseEncryptedData", () => {
    it("should parse encryption result to hex strings", () => {
      const encResult = {
        handles: [new Uint8Array([0x12, 0x34, 0x56, 0x78])],
        inputProof: new Uint8Array([0xab, 0xcd, 0xef, 0x01]),
      };

      const parsed = parseEncryptedData(encResult);

      expect(parsed.handleHex).toBe("0x12345678");
      expect(parsed.inputProofHex).toBe("0xabcdef01");
    });

    it("should handle empty arrays", () => {
      const encResult = {
        handles: [new Uint8Array([])],
        inputProof: new Uint8Array([]),
      };

      const parsed = parseEncryptedData(encResult);

      expect(parsed.handleHex).toBe("0x");
      expect(parsed.inputProofHex).toBe("0x");
    });

    it("should handle single byte arrays", () => {
      const encResult = {
        handles: [new Uint8Array([0xff])],
        inputProof: new Uint8Array([0x00]),
      };

      const parsed = parseEncryptedData(encResult);

      expect(parsed.handleHex).toBe("0xff");
      expect(parsed.inputProofHex).toBe("0x00");
    });

    it("should always use first handle in handles array", () => {
      const encResult = {
        handles: [
          new Uint8Array([0x11, 0x22]),
          new Uint8Array([0x33, 0x44]),
        ],
        inputProof: new Uint8Array([0xaa, 0xbb]),
      };

      const parsed = parseEncryptedData(encResult);

      expect(parsed.handleHex).toBe("0x1122");
    });

    it("should return readonly object", () => {
      const encResult = {
        handles: [new Uint8Array([0x12, 0x34])],
        inputProof: new Uint8Array([0xab, 0xcd]),
      };

      const parsed = parseEncryptedData(encResult);

      // TypeScript should prevent this, but test runtime behavior
      expect(Object.isFrozen(parsed)).toBe(false); // as const makes it readonly at compile time, not runtime
      expect(parsed).toHaveProperty("handleHex");
      expect(parsed).toHaveProperty("inputProofHex");
    });
  });

  describe("buildDecryptionRequests", () => {
    it("should build requests for single handle", () => {
      const handles = ["0x1234567890abcdef"];
      const requests = buildDecryptionRequests(handles, contractAddress);

      expect(requests).toHaveLength(1);
      expect(requests[0]).toEqual({
        handle: "0x1234567890abcdef",
        contractAddress,
      });
    });

    it("should build requests for multiple handles", () => {
      const handles = [
        "0x1111111111111111",
        "0x2222222222222222",
        "0x3333333333333333",
      ];
      const requests = buildDecryptionRequests(handles, contractAddress);

      expect(requests).toHaveLength(3);
      expect(requests[0]).toEqual({
        handle: "0x1111111111111111",
        contractAddress,
      });
      expect(requests[1]).toEqual({
        handle: "0x2222222222222222",
        contractAddress,
      });
      expect(requests[2]).toEqual({
        handle: "0x3333333333333333",
        contractAddress,
      });
    });

    it("should handle empty handles array", () => {
      const handles: readonly string[] = [];
      const requests = buildDecryptionRequests(handles, contractAddress);

      expect(requests).toHaveLength(0);
      expect(requests).toEqual([]);
    });

    it("should use same contract address for all requests", () => {
      const handles = [
        "0xaaaa",
        "0xbbbb",
        "0xcccc",
      ];
      const requests = buildDecryptionRequests(handles, contractAddress);

      expect(requests.every((req) => req.contractAddress === contractAddress)).toBe(
        true
      );
    });

    it("should preserve handle order", () => {
      const handles = ["0x5555", "0x3333", "0x7777", "0x1111"];
      const requests = buildDecryptionRequests(handles, contractAddress);

      expect(requests.map((r) => r.handle)).toEqual([
        "0x5555",
        "0x3333",
        "0x7777",
        "0x1111",
      ]);
    });
  });

  describe("helpers object", () => {
    it("should export all helper functions", () => {
      expect(helpers).toHaveProperty("getEncryptionMethod");
      expect(helpers).toHaveProperty("toHex");
      expect(helpers).toHaveProperty("validateFhevmType");
      expect(helpers).toHaveProperty("encryptSingle");
      expect(helpers).toHaveProperty("decryptHandle");
      expect(helpers).toHaveProperty("parseEncryptedData");
      expect(helpers).toHaveProperty("isSignatureValid");
      expect(helpers).toHaveProperty("getUniqueContractAddresses");
      expect(helpers).toHaveProperty("filterValidRequests");
      expect(helpers).toHaveProperty("buildDecryptionRequests");
    });

    it("should have all functions be callable", () => {
      expect(typeof helpers.validateFhevmType).toBe("function");
      expect(typeof helpers.encryptSingle).toBe("function");
      expect(typeof helpers.decryptHandle).toBe("function");
      expect(typeof helpers.parseEncryptedData).toBe("function");
      expect(typeof helpers.buildDecryptionRequests).toBe("function");
    });

    it("validateFhevmType should work through helpers object", () => {
      expect(helpers.validateFhevmType("euint32")).toBe(true);
      expect(helpers.validateFhevmType("invalid")).toBe(false);
    });

    it("parseEncryptedData should work through helpers object", () => {
      const encResult = {
        handles: [new Uint8Array([0x12, 0x34])],
        inputProof: new Uint8Array([0xab, 0xcd]),
      };

      const parsed = helpers.parseEncryptedData(encResult);

      expect(parsed.handleHex).toBe("0x1234");
      expect(parsed.inputProofHex).toBe("0xabcd");
    });

    it("buildDecryptionRequests should work through helpers object", () => {
      const handles = ["0x1111", "0x2222"];
      const requests = helpers.buildDecryptionRequests(handles, contractAddress);

      expect(requests).toHaveLength(2);
      expect(requests[0].handle).toBe("0x1111");
      expect(requests[1].handle).toBe("0x2222");
    });
  });

  describe("Integration Tests", () => {
    it("should support complete encryption workflow", async () => {
      const { encryptValue } = await import("../../src/core/encryption");
      const mockEncryptValue = encryptValue as ReturnType<typeof vi.fn>;

      const mockResult = {
        handles: [new Uint8Array([0x12, 0x34, 0x56, 0x78])],
        inputProof: new Uint8Array([0xab, 0xcd, 0xef, 0x01]),
      };
      mockEncryptValue.mockResolvedValue(mockResult);

      // Validate type
      expect(validateFhevmType("euint32")).toBe(true);

      // Encrypt value
      const encResult = await encryptSingle(
        mockInstance,
        contractAddress,
        userAddress,
        12345,
        "euint32"
      );

      // Parse result
      const parsed = parseEncryptedData(encResult);

      expect(parsed.handleHex).toBe("0x12345678");
      expect(parsed.inputProofHex).toBe("0xabcdef01");
    });

    it("should support complete decryption workflow", async () => {
      const { decryptValue } = await import("../../src/core/decryption");
      const mockDecryptValue = decryptValue as ReturnType<typeof vi.fn>;

      mockDecryptValue.mockResolvedValue(BigInt(100));

      // Build requests
      const handles = ["0xhandle1", "0xhandle2"];
      const requests = buildDecryptionRequests(handles, contractAddress);

      expect(requests).toHaveLength(2);

      // Decrypt single handle
      const signature: DecryptionSignature = {
        signature: "0xsig",
        account: userAddress,
      };
      const decryptedValue = await decryptHandle(
        mockInstance,
        handles[0],
        contractAddress,
        signature
      );

      expect(decryptedValue).toBe(BigInt(100));
    });

    it("should work with all FHEVM types", async () => {
      const { encryptValue } = await import("../../src/core/encryption");
      const mockEncryptValue = encryptValue as ReturnType<typeof vi.fn>;

      const types = [
        "ebool",
        "euint8",
        "euint16",
        "euint32",
        "euint64",
        "euint128",
        "euint256",
        "eaddress",
      ] as const;

      for (const type of types) {
        expect(validateFhevmType(type)).toBe(true);

        mockEncryptValue.mockResolvedValue({
          handles: [new Uint8Array([0x01])],
          inputProof: new Uint8Array([0x02]),
        });

        const value = type === "ebool" ? true : type === "eaddress" ? userAddress : 1;
        await encryptSingle(mockInstance, contractAddress, userAddress, value, type);

        expect(mockEncryptValue).toHaveBeenCalled();
        mockEncryptValue.mockClear();
      }
    });
  });
});
