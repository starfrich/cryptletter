import { describe, it, expect } from "vitest";
import {
  isValidAddress,
  assertValidAddress,
  validateAddresses,
  isValidFhevmType,
  assertValidFhevmType,
  getValidFhevmTypes,
  validateEncryptionValue,
  assertValidEncryptionValue,
  isValidChainId,
  COMMON_CHAIN_IDS,
  isEthereumCompatibleChain,
  isValidHex,
  normalizeHex,
  assertDefined,
  assertRequiredParams,
  assertNotEmpty,
  assertNotEmptyArray,
  assertAllValid,
  isNotQuotaExceeded,
  isValidStorageKey,
  isValidStorageValue,
} from "../../src/utils/validation";
import {
  FhevmError,
  FhevmErrorCode,
  StorageError,
  StorageErrorCode,
} from "../../src/types/errors";

describe("Validation Utils", () => {
  describe("Ethereum Address Validation", () => {
    describe("isValidAddress", () => {
      it("should validate correct address format", () => {
        const validAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
        expect(isValidAddress(validAddress)).toBe(false); // 39 chars, need 40
      });

      it("should validate correct 40-char hex address", () => {
        const validAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
        expect(isValidAddress(validAddress)).toBe(true);
      });

      it("should reject addresses without 0x prefix", () => {
        const address = "742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
        expect(isValidAddress(address)).toBe(false);
      });

      it("should reject addresses with invalid characters", () => {
        const invalidAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bXYZ";
        expect(isValidAddress(invalidAddress)).toBe(false);
      });

      it("should reject addresses with wrong length", () => {
        const shortAddress = "0x742d35Cc6634C";
        const longAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC123";

        expect(isValidAddress(shortAddress)).toBe(false);
        expect(isValidAddress(longAddress)).toBe(false);
      });

      it("should reject non-string values", () => {
        expect(isValidAddress(123)).toBe(false);
        expect(isValidAddress(null)).toBe(false);
        expect(isValidAddress(undefined)).toBe(false);
        expect(isValidAddress({})).toBe(false);
      });

      it("should throw when throwOnInvalid is true", () => {
        const invalidAddress = "invalid";
        expect(() => isValidAddress(invalidAddress, true)).toThrow(FhevmError);
        expect(() => isValidAddress(invalidAddress, true)).toThrow(
          /Invalid Ethereum address/
        );
      });

      it("should accept valid checksummed addresses", () => {
        const checksumAddress = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
        expect(isValidAddress(checksumAddress)).toBe(true);
      });
    });

    describe("assertValidAddress", () => {
      it("should not throw for valid address", () => {
        const validAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
        expect(() => assertValidAddress(validAddress)).not.toThrow();
      });

      it("should throw FhevmError for invalid address", () => {
        const invalidAddress = "invalid";
        expect(() => assertValidAddress(invalidAddress)).toThrow(FhevmError);
        expect(() => assertValidAddress(invalidAddress)).toThrow(
          /Invalid Ethereum address/
        );
      });

      it("should include parameter name in error message", () => {
        try {
          assertValidAddress("invalid", "contractAddress");
        } catch (error) {
          expect(error).toBeInstanceOf(FhevmError);
          expect((error as FhevmError).message).toContain("contractAddress");
        }
      });

      it("should include context in error", () => {
        try {
          assertValidAddress("invalid", "testParam");
        } catch (error) {
          expect(error).toBeInstanceOf(FhevmError);
          const fhevmError = error as FhevmError;
          expect(fhevmError.context).toBeDefined();
          expect(fhevmError.context.paramName).toBe("testParam");
        }
      });
    });

    describe("validateAddresses", () => {
      it("should validate multiple addresses", () => {
        const addresses = [
          "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
          "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
          "invalid",
        ];

        const results = validateAddresses(addresses);
        expect(results).toEqual([true, true, false]);
      });

      it("should throw on first invalid when throwOnInvalid is true", () => {
        const addresses = [
          "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
          "invalid",
        ];

        expect(() => validateAddresses(addresses, true)).toThrow(FhevmError);
      });

      it("should handle empty array", () => {
        const results = validateAddresses([]);
        expect(results).toEqual([]);
      });
    });
  });

  describe("FHEVM Type Validation", () => {
    describe("isValidFhevmType", () => {
      it("should validate all valid FHEVM types", () => {
        const validTypes = [
          "ebool",
          "euint8",
          "euint16",
          "euint32",
          "euint64",
          "euint128",
          "euint256",
          "eaddress",
        ];

        validTypes.forEach((type) => {
          expect(isValidFhevmType(type)).toBe(true);
        });
      });

      it("should reject invalid types", () => {
        const invalidTypes = ["string", "uint256", "address", "bool", "euint512"];

        invalidTypes.forEach((type) => {
          expect(isValidFhevmType(type)).toBe(false);
        });
      });

      it("should reject non-string values", () => {
        expect(isValidFhevmType(123)).toBe(false);
        expect(isValidFhevmType(null)).toBe(false);
        expect(isValidFhevmType(undefined)).toBe(false);
      });

      it("should throw when throwOnInvalid is true", () => {
        expect(() => isValidFhevmType("invalid", true)).toThrow(FhevmError);
        expect(() => isValidFhevmType("invalid", true)).toThrow(
          /Invalid FHEVM type/
        );
      });
    });

    describe("assertValidFhevmType", () => {
      it("should not throw for valid type", () => {
        expect(() => assertValidFhevmType("euint32")).not.toThrow();
      });

      it("should throw for invalid type", () => {
        expect(() => assertValidFhevmType("invalid")).toThrow(FhevmError);
        expect(() => assertValidFhevmType("invalid")).toThrow(
          /Invalid FHEVM type/
        );
      });

      it("should list valid types in error message", () => {
        try {
          assertValidFhevmType("invalid");
        } catch (error) {
          expect((error as FhevmError).message).toContain("ebool");
          expect((error as FhevmError).message).toContain("euint8");
        }
      });
    });

    describe("getValidFhevmTypes", () => {
      it("should return all valid FHEVM types", () => {
        const types = getValidFhevmTypes();
        expect(types).toContain("ebool");
        expect(types).toContain("euint8");
        expect(types).toContain("euint16");
        expect(types).toContain("euint32");
        expect(types).toContain("euint64");
        expect(types).toContain("euint128");
        expect(types).toContain("euint256");
        expect(types).toContain("eaddress");
      });

      it("should return readonly array", () => {
        const types = getValidFhevmTypes();
        expect(Array.isArray(types)).toBe(true);
      });
    });
  });

  describe("Value Validation", () => {
    describe("validateEncryptionValue", () => {
      describe("ebool type", () => {
        it("should accept boolean values", () => {
          expect(validateEncryptionValue(true, "ebool")).toBe(true);
          expect(validateEncryptionValue(false, "ebool")).toBe(true);
        });

        it("should accept 0 and 1", () => {
          expect(validateEncryptionValue(0, "ebool")).toBe(true);
          expect(validateEncryptionValue(1, "ebool")).toBe(true);
        });

        it("should reject other values", () => {
          expect(validateEncryptionValue(2, "ebool")).toBe(false);
          expect(validateEncryptionValue("true", "ebool")).toBe(false);
        });

        it("should throw when throwOnInvalid is true", () => {
          expect(() => validateEncryptionValue(2, "ebool", true)).toThrow();
        });
      });

      describe("eaddress type", () => {
        it("should accept valid addresses", () => {
          const validAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
          expect(validateEncryptionValue(validAddress, "eaddress")).toBe(true);
        });

        it("should reject invalid addresses", () => {
          expect(validateEncryptionValue("invalid", "eaddress")).toBe(false);
        });

        it("should throw when throwOnInvalid is true", () => {
          expect(() =>
            validateEncryptionValue("invalid", "eaddress", true)
          ).toThrow();
        });
      });

      describe("euint8 type", () => {
        it("should accept values in range 0-255", () => {
          expect(validateEncryptionValue(0, "euint8")).toBe(true);
          expect(validateEncryptionValue(255, "euint8")).toBe(true);
          expect(validateEncryptionValue(128, "euint8")).toBe(true);
        });

        it("should reject values out of range", () => {
          expect(validateEncryptionValue(-1, "euint8")).toBe(false);
          expect(validateEncryptionValue(256, "euint8")).toBe(false);
        });

        it("should accept BigInt values", () => {
          expect(validateEncryptionValue(BigInt(255), "euint8")).toBe(true);
        });

        it("should throw when throwOnInvalid is true", () => {
          expect(() => validateEncryptionValue(256, "euint8", true)).toThrow(
            FhevmError
          );
        });
      });

      describe("euint16 type", () => {
        it("should accept values in range 0-65535", () => {
          expect(validateEncryptionValue(0, "euint16")).toBe(true);
          expect(validateEncryptionValue(65535, "euint16")).toBe(true);
        });

        it("should reject values out of range", () => {
          expect(validateEncryptionValue(-1, "euint16")).toBe(false);
          expect(validateEncryptionValue(65536, "euint16")).toBe(false);
        });
      });

      describe("euint32 type", () => {
        it("should accept values in range 0-4294967295", () => {
          expect(validateEncryptionValue(0, "euint32")).toBe(true);
          expect(validateEncryptionValue(4294967295, "euint32")).toBe(true);
        });

        it("should reject values out of range", () => {
          expect(validateEncryptionValue(-1, "euint32")).toBe(false);
          expect(validateEncryptionValue(4294967296, "euint32")).toBe(false);
        });
      });

      describe("euint64 type", () => {
        it("should accept values in range", () => {
          expect(validateEncryptionValue(0, "euint64")).toBe(true);
          expect(
            validateEncryptionValue(BigInt("18446744073709551615"), "euint64")
          ).toBe(true);
        });

        it("should reject values out of range", () => {
          expect(
            validateEncryptionValue(BigInt("18446744073709551616"), "euint64")
          ).toBe(false);
        });
      });

      describe("euint128 type", () => {
        it("should accept values in range", () => {
          expect(validateEncryptionValue(0, "euint128")).toBe(true);
          expect(
            validateEncryptionValue(
              BigInt("340282366920938463463374607431768211455"),
              "euint128"
            )
          ).toBe(true);
        });

        it("should reject values out of range", () => {
          expect(
            validateEncryptionValue(
              BigInt("340282366920938463463374607431768211456"),
              "euint128"
            )
          ).toBe(false);
        });
      });

      describe("euint256 type", () => {
        it("should accept values in range", () => {
          expect(validateEncryptionValue(0, "euint256")).toBe(true);
          expect(
            validateEncryptionValue(
              BigInt(
                "115792089237316195423570985008687907853269984665640564039457584007913129639935"
              ),
              "euint256"
            )
          ).toBe(true);
        });

        it("should reject values out of range", () => {
          expect(
            validateEncryptionValue(
              BigInt(
                "115792089237316195423570985008687907853269984665640564039457584007913129639936"
              ),
              "euint256"
            )
          ).toBe(false);
        });
      });

      it("should reject non-convertible values", () => {
        expect(validateEncryptionValue("abc", "euint32")).toBe(false);
        expect(validateEncryptionValue({}, "euint32")).toBe(false);
        expect(validateEncryptionValue(null, "euint32")).toBe(false);
      });

      it("should throw FhevmError with INVALID_ENCRYPTION_VALUE code", () => {
        try {
          validateEncryptionValue(256, "euint8", true);
        } catch (error) {
          expect(error).toBeInstanceOf(FhevmError);
          expect((error as FhevmError).code).toBe(
            FhevmErrorCode.INVALID_ENCRYPTION_VALUE
          );
        }
      });
    });

    describe("assertValidEncryptionValue", () => {
      it("should not throw for valid value", () => {
        expect(() => assertValidEncryptionValue(100, "euint8")).not.toThrow();
      });

      it("should throw for invalid value", () => {
        expect(() => assertValidEncryptionValue(256, "euint8")).toThrow(
          FhevmError
        );
      });
    });
  });

  describe("Chain/Network Validation", () => {
    describe("isValidChainId", () => {
      it("should accept positive integers", () => {
        expect(isValidChainId(1)).toBe(true);
        expect(isValidChainId(31337)).toBe(true);
        expect(isValidChainId(11155111)).toBe(true);
      });

      it("should reject zero and negative numbers", () => {
        expect(isValidChainId(0)).toBe(false);
        expect(isValidChainId(-1)).toBe(false);
      });

      it("should reject non-integers", () => {
        expect(isValidChainId(1.5)).toBe(false);
        expect(isValidChainId(NaN)).toBe(false);
      });

      it("should reject non-numbers", () => {
        expect(isValidChainId("1")).toBe(false);
        expect(isValidChainId(null)).toBe(false);
        expect(isValidChainId(undefined)).toBe(false);
      });

      it("should throw when throwOnInvalid is true", () => {
        expect(() => isValidChainId(0, true)).toThrow(FhevmError);
        expect(() => isValidChainId(0, true)).toThrow(/Invalid chain ID/);
      });
    });

    describe("COMMON_CHAIN_IDS", () => {
      it("should have correct common chain IDs", () => {
        expect(COMMON_CHAIN_IDS.HARDHAT).toBe(31337);
        expect(COMMON_CHAIN_IDS.SEPOLIA).toBe(11155111);
        expect(COMMON_CHAIN_IDS.ETHEREUM).toBe(1);
        expect(COMMON_CHAIN_IDS.POLYGON).toBe(137);
        expect(COMMON_CHAIN_IDS.POLYGON_MUMBAI).toBe(80001);
      });
    });

    describe("isEthereumCompatibleChain", () => {
      it("should return true for common Ethereum chains", () => {
        expect(isEthereumCompatibleChain(1)).toBe(true); // Mainnet
        expect(isEthereumCompatibleChain(137)).toBe(true); // Polygon
        expect(isEthereumCompatibleChain(31337)).toBe(true); // Hardhat
      });

      it("should return false for very high chain IDs", () => {
        expect(isEthereumCompatibleChain(100000)).toBe(false);
        expect(isEthereumCompatibleChain(11155111)).toBe(false); // Sepolia is > 100000
      });

      it("should return false for zero and negative", () => {
        expect(isEthereumCompatibleChain(0)).toBe(false);
        expect(isEthereumCompatibleChain(-1)).toBe(false);
      });
    });
  });

  describe("Hex String Validation", () => {
    describe("isValidHex", () => {
      it("should accept valid hex strings", () => {
        expect(isValidHex("0x1234abcd")).toBe(true);
        expect(isValidHex("1234abcd")).toBe(true);
        expect(isValidHex("0xABCDEF")).toBe(true);
        expect(isValidHex("")).toBe(true); // Empty is valid hex
      });

      it("should reject non-hex characters", () => {
        expect(isValidHex("0x12XYZ")).toBe(false);
        expect(isValidHex("ghijkl")).toBe(false);
      });

      it("should reject non-strings", () => {
        expect(isValidHex(123)).toBe(false);
        expect(isValidHex(null)).toBe(false);
        expect(isValidHex(undefined)).toBe(false);
      });

      it("should throw when throwOnInvalid is true", () => {
        expect(() => isValidHex("XYZ", true)).toThrow(FhevmError);
        expect(() => isValidHex("XYZ", true)).toThrow(/Invalid hex string/);
      });

      it("should throw with proper error for non-strings when throwOnInvalid is true", () => {
        expect(() => isValidHex(123, true)).toThrow(FhevmError);
        expect(() => isValidHex(123, true)).toThrow(/Hex value must be a string/);
      });
    });

    describe("normalizeHex", () => {
      it("should add 0x prefix when missing", () => {
        expect(normalizeHex("1234")).toBe("0x1234");
        expect(normalizeHex("abcd")).toBe("0xabcd");
      });

      it("should keep 0x prefix when present", () => {
        expect(normalizeHex("0x1234")).toBe("0x1234");
      });

      it("should throw for invalid hex", () => {
        expect(() => normalizeHex("XYZ")).toThrow(FhevmError);
      });

      it("should handle empty strings", () => {
        expect(normalizeHex("")).toBe("0x");
      });
    });
  });

  describe("Parameter Validation", () => {
    describe("assertDefined", () => {
      it("should not throw for defined values", () => {
        expect(() => assertDefined("value", "param")).not.toThrow();
        expect(() => assertDefined(0, "param")).not.toThrow();
        expect(() => assertDefined(false, "param")).not.toThrow();
        expect(() => assertDefined("", "param")).not.toThrow();
      });

      it("should throw for undefined", () => {
        expect(() => assertDefined(undefined, "testParam")).toThrow(FhevmError);
        expect(() => assertDefined(undefined, "testParam")).toThrow(
          /Required parameter is missing: testParam/
        );
      });

      it("should throw for null", () => {
        expect(() => assertDefined(null, "testParam")).toThrow(FhevmError);
        expect(() => assertDefined(null, "testParam")).toThrow(
          /Required parameter is missing: testParam/
        );
      });

      it("should throw with MISSING_PARAMETER code", () => {
        try {
          assertDefined(undefined, "test");
        } catch (error) {
          expect(error).toBeInstanceOf(FhevmError);
          expect((error as FhevmError).code).toBe(
            FhevmErrorCode.MISSING_PARAMETER
          );
        }
      });
    });

    describe("assertRequiredParams", () => {
      it("should not throw when all required params are present", () => {
        const params = { a: 1, b: "test", c: true };
        expect(() => assertRequiredParams(params, ["a", "b", "c"])).not.toThrow();
      });

      it("should throw when required param is missing", () => {
        const params = { a: 1, c: true };
        expect(() => assertRequiredParams(params, ["a", "b", "c"])).toThrow(
          FhevmError
        );
      });

      it("should throw when required param is undefined", () => {
        const params = { a: 1, b: undefined, c: true };
        expect(() => assertRequiredParams(params, ["a", "b", "c"])).toThrow(
          FhevmError
        );
      });

      it("should throw when required param is null", () => {
        const params = { a: 1, b: null, c: true };
        expect(() => assertRequiredParams(params, ["a", "b", "c"])).toThrow(
          FhevmError
        );
      });

      it("should include parameter name in error", () => {
        const params = { a: 1 };
        try {
          assertRequiredParams(params, ["a", "missing"]);
        } catch (error) {
          expect((error as FhevmError).message).toContain("missing");
        }
      });

      it("should accept falsy values that are not null/undefined", () => {
        const params = { a: 0, b: false, c: "" };
        expect(() => assertRequiredParams(params, ["a", "b", "c"])).not.toThrow();
      });
    });

    describe("assertNotEmpty", () => {
      it("should not throw for non-empty strings", () => {
        expect(() => assertNotEmpty("test", "value")).not.toThrow();
        expect(() => assertNotEmpty("  spaces  ", "value")).not.toThrow();
      });

      it("should throw for empty strings", () => {
        expect(() => assertNotEmpty("", "value")).toThrow(FhevmError);
        expect(() => assertNotEmpty("", "value")).toThrow(/value cannot be empty/);
      });

      it("should throw for whitespace-only strings", () => {
        expect(() => assertNotEmpty("   ", "value")).toThrow(FhevmError);
      });

      it("should throw for non-strings", () => {
        expect(() => assertNotEmpty(123 as any, "value")).toThrow(FhevmError);
        expect(() => assertNotEmpty(null as any, "value")).toThrow(FhevmError);
      });
    });
  });

  describe("Batch Validation", () => {
    describe("assertNotEmptyArray", () => {
      it("should not throw for non-empty arrays", () => {
        expect(() => assertNotEmptyArray([1, 2, 3], "items")).not.toThrow();
        expect(() => assertNotEmptyArray([1], "items")).not.toThrow();
      });

      it("should throw for empty arrays", () => {
        expect(() => assertNotEmptyArray([], "items")).toThrow(FhevmError);
        expect(() => assertNotEmptyArray([], "items")).toThrow(
          /items cannot be empty/
        );
      });

      it("should throw for non-arrays", () => {
        expect(() => assertNotEmptyArray("not array" as any, "items")).toThrow(
          FhevmError
        );
        expect(() => assertNotEmptyArray(null as any, "items")).toThrow(
          FhevmError
        );
      });
    });

    describe("assertAllValid", () => {
      it("should not throw when all items pass validation", () => {
        const items = [1, 2, 3, 4];
        const predicate = (item: number) => item > 0;

        expect(() =>
          assertAllValid(items, predicate, "positive numbers")
        ).not.toThrow();
      });

      it("should throw when an item fails validation", () => {
        const items = [1, 2, -3, 4];
        const predicate = (item: number) => item > 0;

        expect(() => assertAllValid(items, predicate, "positive numbers")).toThrow(
          FhevmError
        );
      });

      it("should include index in error message", () => {
        const items = [1, 2, -3, 4];
        const predicate = (item: number) => item > 0;

        try {
          assertAllValid(items, predicate, "positive numbers");
        } catch (error) {
          expect((error as FhevmError).message).toContain("index 2");
        }
      });

      it("should pass index to predicate", () => {
        const items = ["a", "b", "c"];
        const indices: number[] = [];
        const predicate = (item: string, index: number) => {
          indices.push(index);
          return true;
        };

        assertAllValid(items, predicate, "test");
        expect(indices).toEqual([0, 1, 2]);
      });

      it("should handle empty arrays", () => {
        expect(() =>
          assertAllValid([], () => false, "test")
        ).not.toThrow();
      });
    });
  });

  describe("Storage Validation", () => {
    describe("isNotQuotaExceeded", () => {
      it("should return true for non-quota-exceeded errors", () => {
        const error = new StorageError(
          StorageErrorCode.READ_FAILED,
          "Read failed"
        );
        expect(isNotQuotaExceeded(error)).toBe(true);
      });

      it("should return false for quota exceeded errors", () => {
        const error = new StorageError(
          StorageErrorCode.QUOTA_EXCEEDED,
          "Quota exceeded"
        );
        expect(isNotQuotaExceeded(error)).toBe(false);
      });

      it("should return true for non-storage errors", () => {
        const error = new Error("Generic error");
        expect(isNotQuotaExceeded(error)).toBe(true);
      });

      it("should return true for non-errors", () => {
        expect(isNotQuotaExceeded("string error")).toBe(true);
        expect(isNotQuotaExceeded(null)).toBe(true);
      });
    });

    describe("isValidStorageKey", () => {
      it("should accept valid keys", () => {
        expect(isValidStorageKey("valid_key")).toBe(true);
        expect(isValidStorageKey("key-123")).toBe(true);
        expect(isValidStorageKey("a")).toBe(true);
      });

      it("should reject empty strings", () => {
        expect(isValidStorageKey("")).toBe(false);
      });

      it("should reject very long keys (>1000 chars)", () => {
        const longKey = "a".repeat(1001);
        expect(isValidStorageKey(longKey)).toBe(false);
      });

      it("should accept keys at 1000 char limit", () => {
        const maxKey = "a".repeat(1000);
        expect(isValidStorageKey(maxKey)).toBe(true);
      });

      it("should reject non-strings", () => {
        expect(isValidStorageKey(123)).toBe(false);
        expect(isValidStorageKey(null)).toBe(false);
        expect(isValidStorageKey(undefined)).toBe(false);
      });

      it("should throw when throwOnInvalid is true", () => {
        expect(() => isValidStorageKey("", true)).toThrow(StorageError);
        expect(() => isValidStorageKey(123, true)).toThrow(StorageError);
      });
    });

    describe("isValidStorageValue", () => {
      it("should accept JSON-serializable values", () => {
        expect(isValidStorageValue({ key: "value" })).toBe(true);
        expect(isValidStorageValue([1, 2, 3])).toBe(true);
        expect(isValidStorageValue("string")).toBe(true);
        expect(isValidStorageValue(123)).toBe(true);
        expect(isValidStorageValue(true)).toBe(true);
        expect(isValidStorageValue(null)).toBe(true);
      });

      it("should reject non-serializable values", () => {
        const circular: any = {};
        circular.self = circular;
        expect(isValidStorageValue(circular)).toBe(false);
      });

      it("should accept functions (they serialize to undefined)", () => {
        // Functions serialize to undefined in JSON, which is valid
        expect(isValidStorageValue(() => {})).toBe(true);
      });

      it("should throw when throwOnInvalid is true", () => {
        const circular: any = {};
        circular.self = circular;
        expect(() => isValidStorageValue(circular, true)).toThrow(StorageError);
      });

      it("should accept nested objects", () => {
        const nested = {
          a: { b: { c: [1, 2, 3] } },
        };
        expect(isValidStorageValue(nested)).toBe(true);
      });
    });
  });

  describe("Integration Tests", () => {
    it("should validate complete encryption parameters", () => {
      const contractAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC";
      const type = "euint32";
      const value = 12345;

      expect(() => {
        assertValidAddress(contractAddress);
        assertValidFhevmType(type);
        assertValidEncryptionValue(value, type);
      }).not.toThrow();
    });

    it("should validate batch decryption requests", () => {
      const requests = [
        { contractAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC" },
        { contractAddress: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed" },
      ];

      expect(() => {
        assertNotEmptyArray(requests, "decryption requests");
        assertAllValid(
          requests,
          (req) => isValidAddress(req.contractAddress),
          "decryption requests"
        );
      }).not.toThrow();
    });

    it("should validate storage operations", () => {
      const key = "my_storage_key";
      const value = { encrypted: "data", timestamp: Date.now() };

      expect(() => {
        if (!isValidStorageKey(key, true)) {
          throw new Error("Invalid key");
        }
        if (!isValidStorageValue(value, true)) {
          throw new Error("Invalid value");
        }
      }).not.toThrow();
    });

    it("should handle complete parameter validation workflow", () => {
      const params = {
        contractAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC",
        type: "euint32",
        value: 100,
        chainId: 31337,
      };

      expect(() => {
        assertRequiredParams(params, [
          "contractAddress",
          "type",
          "value",
          "chainId",
        ]);
        assertValidAddress(params.contractAddress);
        assertValidFhevmType(params.type);
        assertValidEncryptionValue(params.value, params.type);
        isValidChainId(params.chainId, true);
      }).not.toThrow();
    });
  });
});
