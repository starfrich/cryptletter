import { describe, it, expect, vi } from "vitest";
import {
  getEncryptionMethod,
  toHex,
  isValidEncryptionValue,
  buildParamsFromAbi,
  encryptValue,
  createEncryptedInput,
  type EncryptResult,
} from "../../src/core/encryption";
import type { FhevmInstance } from "../../src/core/types";

describe("Core Encryption Utils", () => {
  describe("getEncryptionMethod", () => {
    it("maps externalEbool to addBool", () => {
      expect(getEncryptionMethod("externalEbool")).toBe("addBool");
    });

    it("maps externalEuint8 to add8", () => {
      expect(getEncryptionMethod("externalEuint8")).toBe("add8");
    });

    it("maps externalEuint16 to add16", () => {
      expect(getEncryptionMethod("externalEuint16")).toBe("add16");
    });

    it("maps externalEuint32 to add32", () => {
      expect(getEncryptionMethod("externalEuint32")).toBe("add32");
    });

    it("maps externalEuint64 to add64", () => {
      expect(getEncryptionMethod("externalEuint64")).toBe("add64");
    });

    it("maps externalEuint128 to add128", () => {
      expect(getEncryptionMethod("externalEuint128")).toBe("add128");
    });

    it("maps externalEuint256 to add256", () => {
      expect(getEncryptionMethod("externalEuint256")).toBe("add256");
    });

    it("maps externalEaddress to addAddress", () => {
      expect(getEncryptionMethod("externalEaddress")).toBe("addAddress");
    });

    it("defaults unknown types to add64 and logs warning", () => {
      const warnSpy = vi.spyOn(console, "warn");
      expect(getEncryptionMethod("unknownType")).toBe("add64");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("unknownType")
      );
      warnSpy.mockRestore();
    });
  });

  describe("toHex", () => {
    it("converts Uint8Array to hex string with 0x prefix", () => {
      const arr = new Uint8Array([1, 2, 3]);
      expect(toHex(arr)).toBe("0x010203");
    });

    it("handles Uint8Array with larger values", () => {
      const arr = new Uint8Array([255, 128, 0]);
      expect(toHex(arr)).toBe("0xff8000");
    });

    it("adds 0x prefix to hex string without it", () => {
      expect(toHex("010203")).toBe("0x010203");
    });

    it("preserves existing 0x prefix", () => {
      expect(toHex("0x010203")).toBe("0x010203");
    });

    it("handles empty Uint8Array", () => {
      const arr = new Uint8Array([]);
      expect(toHex(arr)).toBe("0x");
    });
  });

  describe("isValidEncryptionValue", () => {
    describe("ebool type", () => {
      it("accepts boolean true", () => {
        expect(isValidEncryptionValue(true, "ebool")).toBe(true);
      });

      it("accepts boolean false", () => {
        expect(isValidEncryptionValue(false, "ebool")).toBe(true);
      });

      it("accepts 0 and 1", () => {
        expect(isValidEncryptionValue(0, "ebool")).toBe(true);
        expect(isValidEncryptionValue(1, "ebool")).toBe(true);
      });

      it("rejects other numbers", () => {
        expect(isValidEncryptionValue(2, "ebool")).toBe(false);
      });
    });

    describe("euint8 type", () => {
      it("accepts valid range 0-255", () => {
        expect(isValidEncryptionValue(0, "euint8")).toBe(true);
        expect(isValidEncryptionValue(128, "euint8")).toBe(true);
        expect(isValidEncryptionValue(255, "euint8")).toBe(true);
      });

      it("rejects negative numbers", () => {
        expect(isValidEncryptionValue(-1, "euint8")).toBe(false);
      });

      it("rejects numbers > 255", () => {
        expect(isValidEncryptionValue(256, "euint8")).toBe(false);
      });

      it("rejects non-integers", () => {
        expect(isValidEncryptionValue(10.5, "euint8")).toBe(false);
      });
    });

    describe("euint16 type", () => {
      it("accepts valid range 0-65535", () => {
        expect(isValidEncryptionValue(0, "euint16")).toBe(true);
        expect(isValidEncryptionValue(32768, "euint16")).toBe(true);
        expect(isValidEncryptionValue(65535, "euint16")).toBe(true);
      });

      it("rejects out of range", () => {
        expect(isValidEncryptionValue(-1, "euint16")).toBe(false);
        expect(isValidEncryptionValue(65536, "euint16")).toBe(false);
      });
    });

    describe("euint32 type", () => {
      it("accepts valid range 0-4294967295", () => {
        expect(isValidEncryptionValue(0, "euint32")).toBe(true);
        expect(isValidEncryptionValue(2147483648, "euint32")).toBe(true);
        expect(isValidEncryptionValue(4294967295, "euint32")).toBe(true);
      });

      it("rejects out of range", () => {
        expect(isValidEncryptionValue(-1, "euint32")).toBe(false);
        expect(isValidEncryptionValue(4294967296, "euint32")).toBe(false);
      });
    });

    describe("euint64/128/256 types", () => {
      it("accepts BigInt values", () => {
        expect(isValidEncryptionValue(BigInt(100), "euint64")).toBe(true);
        expect(isValidEncryptionValue(BigInt(0), "euint128")).toBe(true);
        expect(isValidEncryptionValue(BigInt("999999999999999999"), "euint256")).toBe(
          true
        );
      });

      it("rejects negative BigInt", () => {
        expect(isValidEncryptionValue(BigInt(-1), "euint64")).toBe(false);
      });

      it("accepts string representation of BigInt", () => {
        expect(isValidEncryptionValue("100", "euint64")).toBe(true);
        expect(isValidEncryptionValue("999999999999999999", "euint128")).toBe(true);
      });
    });

    describe("eaddress type", () => {
      it("accepts valid Ethereum address", () => {
        expect(
          isValidEncryptionValue("0x1234567890123456789012345678901234567890", "eaddress")
        ).toBe(true);
      });

      it("rejects invalid addresses", () => {
        expect(isValidEncryptionValue("0x123", "eaddress")).toBe(false);
        expect(isValidEncryptionValue("0x12345678901234567890123456789012345678901", "eaddress")).toBe(false); // 41 chars
        expect(isValidEncryptionValue("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", "eaddress")).toBe(false); // invalid hex
        expect(isValidEncryptionValue("12345678901234567890123456789012345678901", "eaddress")).toBe(false); // no 0x
      });
    });
  });

  describe("buildParamsFromAbi", () => {
    it("builds parameters from ABI", () => {
      const encResult: EncryptResult = {
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      };

      const abi = [
        {
          type: "function",
          name: "setEncryptedValue",
          inputs: [
            { name: "encryptedValue", type: "bytes32" },
            { name: "proof", type: "bytes" },
          ],
        },
      ];

      const params = buildParamsFromAbi(encResult, abi, "setEncryptedValue");
      expect(params).toHaveLength(2);
      expect(params[0]).toBe("0x010203");
      expect(params[1]).toBe("0x040506");
    });

    it("throws error when function not found", () => {
      const encResult: EncryptResult = {
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      };

      const abi = [
        {
          type: "function",
          name: "otherFunction",
          inputs: [],
        },
      ];

      expect(() => {
        buildParamsFromAbi(encResult, abi, "setEncryptedValue");
      }).toThrow("Function ABI not found for setEncryptedValue");
    });

    it("handles uint256 type by converting to BigInt", () => {
      const encResult: EncryptResult = {
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      };

      const abi = [
        {
          type: "function",
          name: "test",
          inputs: [
            { name: "value", type: "bytes" }, // uint256 expects bytes
            { name: "proof", type: "bytes" },
          ],
        },
      ];

      const params = buildParamsFromAbi(encResult, abi, "test");
      // Both should be hex strings (bytes type)
      expect(params[0]).toBe("0x010203");
      expect(params[1]).toBe("0x040506");
    });

    it("handles address type by returning as string", () => {
      const encResult: EncryptResult = {
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      };

      const abi = [
        {
          type: "function",
          name: "test",
          inputs: [
            { name: "addr", type: "address" },
            { name: "proof", type: "bytes" },
          ],
        },
      ];

      const params = buildParamsFromAbi(encResult, abi, "test");
      expect(typeof params[0]).toBe("object"); // Uint8Array converted to object
    });

    it("handles string type by returning as string", () => {
      const encResult: EncryptResult = {
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      };

      const abi = [
        {
          type: "function",
          name: "test",
          inputs: [
            { name: "str", type: "string" },
            { name: "proof", type: "bytes" },
          ],
        },
      ];

      const params = buildParamsFromAbi(encResult, abi, "test");
      expect(typeof params[0]).toBe("object"); // Uint8Array
    });

    it("handles bool type by converting to boolean", () => {
      const encResult: EncryptResult = {
        handles: [new Uint8Array([1])],
        inputProof: new Uint8Array([0]),
      };

      const abi = [
        {
          type: "function",
          name: "test",
          inputs: [
            { name: "flag", type: "bool" },
            { name: "proof", type: "bytes" },
          ],
        },
      ];

      const params = buildParamsFromAbi(encResult, abi, "test");
      expect(typeof params[0]).toBe("boolean");
      expect(params[0]).toBe(true); // Non-zero Uint8Array is truthy
    });

    it("handles unknown type with warning and returns hex", () => {
      const warnSpy = vi.spyOn(console, "warn");
      const encResult: EncryptResult = {
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      };

      const abi = [
        {
          type: "function",
          name: "test",
          inputs: [
            { name: "unknown", type: "unknownType" },
            { name: "proof", type: "bytes" },
          ],
        },
      ];

      const params = buildParamsFromAbi(encResult, abi, "test");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown ABI param type unknownType")
      );
      expect(params[0]).toBe("0x010203");
      warnSpy.mockRestore();
    });
  });

  describe("isValidEncryptionValue edge cases", () => {
    it("returns false for invalid BigInt string in euint64", () => {
      expect(isValidEncryptionValue("not-a-number", "euint64")).toBe(false);
    });

    it("returns false for invalid BigInt string in euint128", () => {
      expect(isValidEncryptionValue("invalid", "euint128")).toBe(false);
    });

    it("returns false for invalid BigInt string in euint256", () => {
      expect(isValidEncryptionValue("abc", "euint256")).toBe(false);
    });

    it("returns false for unknown type", () => {
      expect(isValidEncryptionValue(42, "unknown" as any)).toBe(false);
    });
  });

  describe("encryptValue", () => {
    it("should encrypt ebool value", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1, 2, 3])],
          inputProof: new Uint8Array([4, 5, 6]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      const result = await encryptValue(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40),
        true,
        "ebool"
      );

      expect(mockInstance.createEncryptedInput).toHaveBeenCalledWith(
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40)
      );
      expect(mockEncryptedInput.addBool).toHaveBeenCalledWith(true);
      expect(mockEncryptedInput.encrypt).toHaveBeenCalled();
      expect(result.handles).toHaveLength(1);
      expect(result.inputProof).toBeInstanceOf(Uint8Array);
    });

    it("should encrypt euint8 value", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([7, 8])],
          inputProof: new Uint8Array([9, 10]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      await encryptValue(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40),
        42,
        "euint8"
      );

      expect(mockEncryptedInput.add8).toHaveBeenCalledWith(42);
    });

    it("should encrypt euint16 value", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1])],
          inputProof: new Uint8Array([2]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      await encryptValue(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40),
        1000,
        "euint16"
      );

      expect(mockEncryptedInput.add16).toHaveBeenCalledWith(1000);
    });

    it("should encrypt euint32 value", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1])],
          inputProof: new Uint8Array([2]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      await encryptValue(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40),
        100000,
        "euint32"
      );

      expect(mockEncryptedInput.add32).toHaveBeenCalledWith(100000);
    });

    it("should encrypt euint64 value", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1])],
          inputProof: new Uint8Array([2]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      await encryptValue(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40),
        BigInt(999999999999),
        "euint64"
      );

      expect(mockEncryptedInput.add64).toHaveBeenCalledWith(BigInt(999999999999));
    });

    it("should encrypt euint128 value", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1])],
          inputProof: new Uint8Array([2]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      await encryptValue(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40),
        BigInt("999999999999999999999999"),
        "euint128"
      );

      expect(mockEncryptedInput.add128).toHaveBeenCalledWith(
        BigInt("999999999999999999999999")
      );
    });

    it("should encrypt euint256 value", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1])],
          inputProof: new Uint8Array([2]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      await encryptValue(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40),
        BigInt("9".repeat(50)),
        "euint256"
      );

      expect(mockEncryptedInput.add256).toHaveBeenCalledWith(BigInt("9".repeat(50)));
    });

    it("should encrypt eaddress value", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1])],
          inputProof: new Uint8Array([2]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      const address = "0x" + "c".repeat(40);
      await encryptValue(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40),
        address,
        "eaddress"
      );

      expect(mockEncryptedInput.addAddress).toHaveBeenCalledWith(address);
    });

    it("should throw error for unknown type", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1])],
          inputProof: new Uint8Array([2]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      await expect(
        encryptValue(
          mockInstance,
          "0x" + "a".repeat(40),
          "0x" + "1".repeat(40),
          42,
          "unknown" as any
        )
      ).rejects.toThrow("Unknown FHEVM type: unknown");
    });

    it("should handle boolean value as number 0", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1])],
          inputProof: new Uint8Array([2]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      await encryptValue(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40),
        0,
        "ebool"
      );

      expect(mockEncryptedInput.addBool).toHaveBeenCalledWith(false);
    });

    it("should handle boolean value as number 1", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1])],
          inputProof: new Uint8Array([2]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      await encryptValue(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40),
        1,
        "ebool"
      );

      expect(mockEncryptedInput.addBool).toHaveBeenCalledWith(true);
    });
  });

  describe("createEncryptedInput", () => {
    it("should create encrypted input builder", () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1])],
          inputProof: new Uint8Array([2]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      const contractAddress = "0x" + "a".repeat(40);
      const userAddress = "0x" + "1".repeat(40);

      const builder = createEncryptedInput(mockInstance, contractAddress, userAddress);

      expect(mockInstance.createEncryptedInput).toHaveBeenCalledWith(
        contractAddress,
        userAddress
      );
      expect(builder).toBe(mockEncryptedInput);
    });

    it("should allow chaining multiple values", async () => {
      const mockEncryptedInput = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: vi.fn(async () => ({
          handles: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])],
          inputProof: new Uint8Array([7, 8, 9]),
        })),
      };

      const mockInstance = {
        createEncryptedInput: vi.fn(() => mockEncryptedInput),
      } as unknown as FhevmInstance;

      const builder = createEncryptedInput(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "1".repeat(40)
      );

      // Chain multiple additions
      builder.add32(10).add32(20).addBool(true);

      expect(mockEncryptedInput.add32).toHaveBeenCalledWith(10);
      expect(mockEncryptedInput.add32).toHaveBeenCalledWith(20);
      expect(mockEncryptedInput.addBool).toHaveBeenCalledWith(true);

      // Encrypt and verify
      const result = await builder.encrypt();
      expect(result.handles).toHaveLength(2);
    });
  });
});
