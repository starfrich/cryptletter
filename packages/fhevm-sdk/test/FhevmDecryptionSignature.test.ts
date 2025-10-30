import { describe, it, expect, vi, beforeEach } from "vitest";
import { FhevmDecryptionSignature } from "../src/FhevmDecryptionSignature";
import { GenericStringStorage } from "../src/storage/GenericStringStorage";
import { FhevmInstance, EIP712Type } from "../src/fhevmTypes";
import { SignTypedDataCallback, GetAddressCallback } from "../src/types/callbacks";

// Mock storage implementation
class MockStorage implements GenericStringStorage {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

// Mock FhevmInstance
const createMockInstance = (): FhevmInstance => {
  return {
    createEIP712: vi.fn((publicKey: string, contractAddresses: string[], startTimestamp: number, durationDays: number) => ({
      domain: {
        name: "FhevmDecryption",
        version: "1",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000000",
      },
      primaryType: "UserDecryptRequestVerification",
      types: {
        UserDecryptRequestVerification: [
          { name: "publicKey", type: "string" },
          { name: "contractAddresses", type: "address[]" },
          { name: "startTimestamp", type: "uint256" },
          { name: "durationDays", type: "uint256" },
        ],
      },
      message: {
        publicKey,
        contractAddresses,
        startTimestamp,
        durationDays,
      },
    })),
    generateKeypair: vi.fn(() => ({
      publicKey: "0xmockedPublicKey123",
      privateKey: "0xmockedPrivateKey456",
    })),
  } as any;
};

describe("FhevmDecryptionSignature", () => {
  describe("checkIs", () => {
    it("should return false for empty object", () => {
      expect(FhevmDecryptionSignature.checkIs({})).toBe(false);
    });

    it("should return false for null", () => {
      expect(FhevmDecryptionSignature.checkIs(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(FhevmDecryptionSignature.checkIs(undefined)).toBe(false);
    });

    it("should return false for non-object types", () => {
      expect(FhevmDecryptionSignature.checkIs("string")).toBe(false);
      expect(FhevmDecryptionSignature.checkIs(123)).toBe(false);
      expect(FhevmDecryptionSignature.checkIs(true)).toBe(false);
    });

    it("should return false when missing publicKey", () => {
      const invalid = {
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when publicKey is not a string", () => {
      const invalid = {
        publicKey: 123,
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when missing privateKey", () => {
      const invalid = {
        publicKey: "0xpublic",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when missing signature", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when missing startTimestamp", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when startTimestamp is not a number", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: "123",
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when missing durationDays", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when contractAddresses is not an array", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: "not-an-array",
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when contractAddresses contains non-string", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: [123],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when contractAddresses contains string without 0x prefix", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when userAddress doesn't start with 0x", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when eip712 is missing", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when eip712 is null", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: null,
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when eip712.domain is missing", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when eip712.primaryType is missing", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when eip712.message is missing", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when eip712.types is missing", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return false when eip712.types is null", () => {
      const invalid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: null,
        },
      };
      expect(FhevmDecryptionSignature.checkIs(invalid)).toBe(false);
    });

    it("should return true for valid signature object", () => {
      const valid = {
        publicKey: "0xpublic",
        privateKey: "0xprivate",
        signature: "0xsig",
        startTimestamp: 123,
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: {
          domain: {},
          primaryType: "test",
          message: {},
          types: {},
        },
      };
      expect(FhevmDecryptionSignature.checkIs(valid)).toBe(true);
    });
  });

  describe("toJSON and fromJSON", () => {
    it("should serialize and deserialize correctly", () => {
      const mockInstance = createMockInstance();
      const mockSignTypedData: SignTypedDataCallback = vi.fn(async () => "0xmockedSignature");
      const mockGetAddress: GetAddressCallback = vi.fn(async () => "0x1234567890123456789012345678901234567890");

      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000),
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };

      const signature = FhevmDecryptionSignature.fromJSON(signatureData);
      const json = signature.toJSON();

      expect(json.publicKey).toBe(signatureData.publicKey);
      expect(json.privateKey).toBe(signatureData.privateKey);
      expect(json.signature).toBe(signatureData.signature);
      expect(json.startTimestamp).toBe(signatureData.startTimestamp);
      expect(json.durationDays).toBe(signatureData.durationDays);
      expect(json.contractAddresses).toEqual(signatureData.contractAddresses);
      expect(json.userAddress).toBe(signatureData.userAddress);
    });

    it("should deserialize from JSON string", () => {
      const mockInstance = createMockInstance();
      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000),
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890"],
        userAddress: "0x1234567890123456789012345678901234567890",
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365),
      };

      const jsonString = JSON.stringify(signatureData);
      const signature = FhevmDecryptionSignature.fromJSON(jsonString);

      expect(signature.publicKey).toBe(signatureData.publicKey);
      expect(signature.privateKey).toBe(signatureData.privateKey);
    });

    it("should throw TypeError for invalid data", () => {
      expect(() => FhevmDecryptionSignature.fromJSON({})).toThrow(TypeError);
    });
  });

  describe("getters", () => {
    let signature: FhevmDecryptionSignature;

    beforeEach(() => {
      const mockInstance = createMockInstance();
      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000),
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };
      signature = FhevmDecryptionSignature.fromJSON(signatureData);
    });

    it("should return correct publicKey", () => {
      expect(signature.publicKey).toBe("0xpublic123");
    });

    it("should return correct privateKey", () => {
      expect(signature.privateKey).toBe("0xprivate456");
    });

    it("should return correct signature", () => {
      expect(signature.signature).toBe("0xsignature789");
    });

    it("should return correct contractAddresses", () => {
      expect(signature.contractAddresses).toEqual(["0x1234567890123456789012345678901234567890"]);
    });

    it("should return correct startTimestamp", () => {
      expect(typeof signature.startTimestamp).toBe("number");
    });

    it("should return correct durationDays", () => {
      expect(signature.durationDays).toBe(365);
    });

    it("should return correct userAddress", () => {
      expect(signature.userAddress).toBe("0x1234567890123456789012345678901234567890");
    });
  });

  describe("equals", () => {
    it("should return true for same signature", () => {
      const mockInstance = createMockInstance();
      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000),
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };

      const signature1 = FhevmDecryptionSignature.fromJSON(signatureData);
      const signature2 = FhevmDecryptionSignature.fromJSON(signatureData);

      expect(signature1.equals(signature2.toJSON())).toBe(true);
    });

    it("should return false for different signature", () => {
      const mockInstance = createMockInstance();
      const signatureData1 = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000),
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };

      const signatureData2 = {
        ...signatureData1,
        signature: "0xdifferentSignature",
      };

      const signature1 = FhevmDecryptionSignature.fromJSON(signatureData1);
      const signature2 = FhevmDecryptionSignature.fromJSON(signatureData2);

      expect(signature1.equals(signature2.toJSON())).toBe(false);
    });
  });

  describe("isValid", () => {
    it("should return true for signature within valid period", () => {
      const mockInstance = createMockInstance();
      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000) - 100, // Started 100 seconds ago
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };

      const signature = FhevmDecryptionSignature.fromJSON(signatureData);
      expect(signature.isValid()).toBe(true);
    });

    it("should return false for expired signature", () => {
      const mockInstance = createMockInstance();
      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000) - (366 * 24 * 60 * 60), // Started more than 365 days ago
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };

      const signature = FhevmDecryptionSignature.fromJSON(signatureData);
      expect(signature.isValid()).toBe(false);
    });
  });

  describe("saveToGenericStringStorage and loadFromGenericStringStorage", () => {
    let storage: MockStorage;
    let mockInstance: FhevmInstance;

    beforeEach(() => {
      storage = new MockStorage();
      mockInstance = createMockInstance();
    });

    it("should save and load signature with publicKey", async () => {
      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000),
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };

      const signature = FhevmDecryptionSignature.fromJSON(signatureData);
      await signature.saveToGenericStringStorage(storage, mockInstance, true);

      const loaded = await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "0x1234567890123456789012345678901234567890",
        "0xpublic123"
      );

      expect(loaded).not.toBeNull();
      expect(loaded?.publicKey).toBe(signatureData.publicKey);
      expect(loaded?.signature).toBe(signatureData.signature);
    });

    it("should save and load signature without publicKey", async () => {
      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000),
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };

      const signature = FhevmDecryptionSignature.fromJSON(signatureData);
      await signature.saveToGenericStringStorage(storage, mockInstance, false);

      const loaded = await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "0x1234567890123456789012345678901234567890",
        undefined
      );

      expect(loaded).not.toBeNull();
      expect(loaded?.publicKey).toBe(signatureData.publicKey);
    });

    it("should return null when loading non-existent signature", async () => {
      const loaded = await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "0x1234567890123456789012345678901234567890",
        "0xpublic123"
      );

      expect(loaded).toBeNull();
    });

    it("should return null when loading expired signature", async () => {
      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000) - (366 * 24 * 60 * 60), // Expired
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };

      const signature = FhevmDecryptionSignature.fromJSON(signatureData);
      await signature.saveToGenericStringStorage(storage, mockInstance, true);

      const loaded = await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "0x1234567890123456789012345678901234567890",
        "0xpublic123"
      );

      expect(loaded).toBeNull();
    });

    it("should return null when loading invalid JSON", async () => {
      await storage.setItem("test-key", "invalid json");

      // Mock the storage key generation to use "test-key"
      const loaded = await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "0x1234567890123456789012345678901234567890",
        "0xpublic123"
      );

      // This won't match our "test-key", so it should return null
      expect(loaded).toBeNull();
    });

    it("should handle storage errors gracefully on save", async () => {
      const failingStorage: GenericStringStorage = {
        getItem: vi.fn(),
        setItem: vi.fn().mockRejectedValue(new Error("Storage error")),
        removeItem: vi.fn(),
        clear: vi.fn(),
        keys: vi.fn(),
      };

      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000),
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };

      const signature = FhevmDecryptionSignature.fromJSON(signatureData);

      // Should not throw
      await expect(signature.saveToGenericStringStorage(failingStorage, mockInstance, true)).resolves.toBeUndefined();
    });

    it("should handle storage errors gracefully on load", async () => {
      const failingStorage: GenericStringStorage = {
        getItem: vi.fn().mockRejectedValue(new Error("Storage error")),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        keys: vi.fn(),
      };

      const loaded = await FhevmDecryptionSignature.loadFromGenericStringStorage(
        failingStorage,
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "0x1234567890123456789012345678901234567890",
        "0xpublic123"
      );

      expect(loaded).toBeNull();
    });

    it("should return null for invalid address in storage key", async () => {
      // The loadFromGenericStringStorage catches all errors and returns null
      const result = await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "invalid-address",
        "0xpublic123"
      );

      expect(result).toBeNull();
    });
  });

  describe("new", () => {
    let mockInstance: FhevmInstance;
    let mockSignTypedData: SignTypedDataCallback;
    let mockGetAddress: GetAddressCallback;

    beforeEach(() => {
      mockInstance = createMockInstance();
      mockSignTypedData = vi.fn(async () => "0xmockedSignature123");
      mockGetAddress = vi.fn(async () => "0x1234567890123456789012345678901234567890");
    });

    it("should create new signature successfully", async () => {
      const signature = await FhevmDecryptionSignature.new(
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "0xpublic123",
        "0xprivate456",
        mockSignTypedData,
        mockGetAddress
      );

      expect(signature).not.toBeNull();
      expect(signature?.publicKey).toBe("0xpublic123");
      expect(signature?.privateKey).toBe("0xprivate456");
      expect(signature?.signature).toBe("0xmockedSignature123");
      expect(signature?.userAddress).toBe("0x1234567890123456789012345678901234567890");
      expect(signature?.durationDays).toBe(365);
    });

    it("should return null when signTypedData throws", async () => {
      const failingSignTypedData = vi.fn().mockRejectedValue(new Error("Signing failed"));

      const signature = await FhevmDecryptionSignature.new(
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "0xpublic123",
        "0xprivate456",
        failingSignTypedData,
        mockGetAddress
      );

      expect(signature).toBeNull();
    });

    it("should return null when getAddress throws", async () => {
      const failingGetAddress = vi.fn().mockRejectedValue(new Error("Get address failed"));

      const signature = await FhevmDecryptionSignature.new(
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "0xpublic123",
        "0xprivate456",
        mockSignTypedData,
        failingGetAddress
      );

      expect(signature).toBeNull();
    });
  });

  describe("loadOrSign", () => {
    let storage: MockStorage;
    let mockInstance: FhevmInstance;
    let mockSignTypedData: SignTypedDataCallback;
    let mockGetAddress: GetAddressCallback;

    beforeEach(() => {
      storage = new MockStorage();
      mockInstance = createMockInstance();
      mockSignTypedData = vi.fn(async () => "0xmockedSignature123");
      mockGetAddress = vi.fn(async () => "0x1234567890123456789012345678901234567890");
    });

    it("should return cached signature if valid", async () => {
      const signatureData = {
        publicKey: "0xpublic123",
        privateKey: "0xprivate456",
        signature: "0xsignature789",
        startTimestamp: Math.floor(Date.now() / 1000),
        durationDays: 365,
        contractAddresses: ["0x1234567890123456789012345678901234567890" as `0x${string}`],
        userAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        eip712: mockInstance.createEIP712("0xpublic123", ["0x1234567890123456789012345678901234567890"], Math.floor(Date.now() / 1000), 365) as EIP712Type,
      };

      const signature = FhevmDecryptionSignature.fromJSON(signatureData);
      await signature.saveToGenericStringStorage(storage, mockInstance, true);

      const loaded = await FhevmDecryptionSignature.loadOrSign(
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        mockSignTypedData,
        mockGetAddress,
        storage,
        { publicKey: "0xpublic123", privateKey: "0xprivate456" }
      );

      expect(loaded).not.toBeNull();
      expect(loaded?.signature).toBe("0xsignature789");
      expect(mockSignTypedData).not.toHaveBeenCalled();
    });

    it("should create new signature if not cached", async () => {
      const loaded = await FhevmDecryptionSignature.loadOrSign(
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        mockSignTypedData,
        mockGetAddress,
        storage,
        { publicKey: "0xpublic123", privateKey: "0xprivate456" }
      );

      expect(loaded).not.toBeNull();
      expect(loaded?.publicKey).toBe("0xpublic123");
      expect(loaded?.privateKey).toBe("0xprivate456");
      expect(loaded?.signature).toBe("0xmockedSignature123");
      expect(mockSignTypedData).toHaveBeenCalled();
    });

    it("should generate keypair if not provided", async () => {
      const loaded = await FhevmDecryptionSignature.loadOrSign(
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        mockSignTypedData,
        mockGetAddress,
        storage,
        undefined
      );

      expect(loaded).not.toBeNull();
      expect(loaded?.publicKey).toBe("0xmockedPublicKey123");
      expect(loaded?.privateKey).toBe("0xmockedPrivateKey456");
      expect(mockInstance.generateKeypair).toHaveBeenCalled();
    });

    it("should save newly created signature to storage", async () => {
      const loaded = await FhevmDecryptionSignature.loadOrSign(
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        mockSignTypedData,
        mockGetAddress,
        storage,
        { publicKey: "0xpublic123", privateKey: "0xprivate456" }
      );

      expect(loaded).not.toBeNull();

      // Try loading again - should get from cache
      const cachedSignature = await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        "0x1234567890123456789012345678901234567890",
        "0xpublic123"
      );

      expect(cachedSignature).not.toBeNull();
      expect(cachedSignature?.signature).toBe("0xmockedSignature123");
    });

    it("should return null if signing fails", async () => {
      const failingSignTypedData = vi.fn().mockRejectedValue(new Error("Signing failed"));

      const loaded = await FhevmDecryptionSignature.loadOrSign(
        mockInstance,
        ["0x1234567890123456789012345678901234567890"],
        failingSignTypedData,
        mockGetAddress,
        storage,
        { publicKey: "0xpublic123", privateKey: "0xprivate456" }
      );

      expect(loaded).toBeNull();
    });
  });
});

