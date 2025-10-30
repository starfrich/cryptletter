/**
 * Tests for internal/PublicKeyStorage.ts
 *
 * These tests cover the IndexedDB-based public key and params storage functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { openDB, IDBPDatabase } from "idb";
import { publicKeyStorageGet, publicKeyStorageSet } from "../../src/internal/PublicKeyStorage";

describe("PublicKeyStorage", () => {
  const testAclAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;
  const testAclAddress2 = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`;

  const createTestPublicKey = () => ({
    publicKeyId: "test-key-id-123",
    publicKey: new Uint8Array([1, 2, 3, 4, 5]),
  });

  const createTestPublicParams = () => ({
    publicParamsId: "test-params-id-456",
    publicParams: new Uint8Array([6, 7, 8, 9, 10]),
  });

  // Clean up IndexedDB after each test
  afterEach(async () => {
    if (typeof window !== "undefined" && "indexedDB" in window) {
      try {
        const db = await openDB("fhevm", 1);
        await db.clear("publicKeyStore");
        await db.clear("paramsStore");
        db.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe("publicKeyStorageGet", () => {
    it("should return null publicParams when database is not available", async () => {
      // Simulate Node.js environment where window is undefined
      const originalWindow = global.window;
      // @ts-ignore - Intentionally deleting for test
      delete global.window;

      const result = await publicKeyStorageGet(testAclAddress);

      expect(result.publicParams).toBeNull();
      expect(result.publicKey).toBeUndefined();

      // Restore window
      global.window = originalWindow;
    });

    it("should return empty result when no data is stored", async () => {
      const result = await publicKeyStorageGet(testAclAddress);

      expect(result.publicParams).toBeNull();
      expect(result.publicKey).toBeUndefined();
    });

    it("should retrieve stored public key and params", async () => {
      const testKey = createTestPublicKey();
      const testParams = createTestPublicParams();

      // Store data first
      await publicKeyStorageSet(testAclAddress, testKey, testParams);

      // Retrieve data
      const result = await publicKeyStorageGet(testAclAddress);

      expect(result.publicKey).toBeDefined();
      expect(result.publicKey?.id).toBe(testKey.publicKeyId);
      expect(result.publicKey?.data).toEqual(testKey.publicKey);

      expect(result.publicParams).toBeDefined();
      expect(result.publicParams?.["2048"]).toBeDefined();
      expect(result.publicParams?.["2048"].publicParamsId).toBe(testParams.publicParamsId);
      expect(result.publicParams?.["2048"].publicParams).toEqual(testParams.publicParams);
    });

    it("should retrieve data after storing key only", async () => {
      const testKey = createTestPublicKey();

      await publicKeyStorageSet(testAclAddress, testKey, null);

      const result = await publicKeyStorageGet(testAclAddress);

      // Key should be defined, params may or may not be null depending on previous tests
      expect(result.publicKey).toBeDefined();
      if (result.publicKey) {
        expect(result.publicKey.id).toBe(testKey.publicKeyId);
      }
    });

    it("should retrieve data after storing params only", async () => {
      const testParams = createTestPublicParams();

      await publicKeyStorageSet(testAclAddress2, null, testParams);

      const result = await publicKeyStorageGet(testAclAddress2);

      // Params should be defined
      expect(result.publicParams).toBeDefined();
      if (result.publicParams) {
        expect(result.publicParams["2048"].publicParamsId).toBe(testParams.publicParamsId);
      }
    });

    it("should handle multiple ACL addresses independently", async () => {
      const key1 = createTestPublicKey();
      const key2 = { publicKeyId: "key-2", publicKey: new Uint8Array([11, 12, 13]) };

      await publicKeyStorageSet(testAclAddress, key1, null);
      await publicKeyStorageSet(testAclAddress2, key2, null);

      const result1 = await publicKeyStorageGet(testAclAddress);
      const result2 = await publicKeyStorageGet(testAclAddress2);

      expect(result1.publicKey?.id).toBe(key1.publicKeyId);
      expect(result2.publicKey?.id).toBe(key2.publicKeyId);
    });

    it("should handle database access safely", async () => {
      // This test verifies that database operations don't throw
      const result = await publicKeyStorageGet(testAclAddress);

      // Should not throw and return valid structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty("publicParams");
    });
  });

  describe("publicKeyStorageSet", () => {
    it("should do nothing when database is not available", async () => {
      const originalWindow = global.window;
      // @ts-ignore - Intentionally deleting for test
      delete global.window;

      const testKey = createTestPublicKey();
      const testParams = createTestPublicParams();

      // Should not throw
      await expect(
        publicKeyStorageSet(testAclAddress, testKey, testParams)
      ).resolves.toBeUndefined();

      // Restore window
      global.window = originalWindow;
    });

    it("should store public key and params", async () => {
      const testKey = createTestPublicKey();
      const testParams = createTestPublicParams();

      await publicKeyStorageSet(testAclAddress, testKey, testParams);

      // Verify storage
      const db = await openDB("fhevm", 1);
      const storedKey = await db.get("publicKeyStore", testAclAddress);
      const storedParams = await db.get("paramsStore", testAclAddress);

      expect(storedKey?.value.publicKeyId).toBe(testKey.publicKeyId);
      expect(storedKey?.value.publicKey).toEqual(testKey.publicKey);

      expect(storedParams?.value.publicParamsId).toBe(testParams.publicParamsId);
      expect(storedParams?.value.publicParams).toEqual(testParams.publicParams);

      db.close();
    });

    it("should update existing data", async () => {
      const key1 = createTestPublicKey();
      const key2 = { publicKeyId: "updated-key", publicKey: new Uint8Array([99]) };

      // Store initial data
      await publicKeyStorageSet(testAclAddress, key1, null);

      // Update with new data
      await publicKeyStorageSet(testAclAddress, key2, null);

      // Verify update
      const result = await publicKeyStorageGet(testAclAddress);
      expect(result.publicKey?.id).toBe(key2.publicKeyId);
    });

    it("should accept storing only public key", async () => {
      const testKey = createTestPublicKey();

      // Should not throw
      await expect(
        publicKeyStorageSet(testAclAddress, testKey, null)
      ).resolves.toBeUndefined();
    });

    it("should accept storing only params", async () => {
      const testParams = createTestPublicParams();

      // Should not throw
      await expect(
        publicKeyStorageSet(testAclAddress, null, testParams)
      ).resolves.toBeUndefined();
    });

    it("should accept null for both values", async () => {
      // Should not throw
      await expect(
        publicKeyStorageSet(testAclAddress, null, null)
      ).resolves.toBeUndefined();
    });

    it("should validate public key structure", async () => {
      const invalidKey = { invalid: "structure" } as any;

      await expect(
        publicKeyStorageSet(testAclAddress, invalidKey, null)
      ).rejects.toThrow();
    });

    it("should validate public params structure", async () => {
      const invalidParams = { invalid: "structure" } as any;

      await expect(
        publicKeyStorageSet(testAclAddress, null, invalidParams)
      ).rejects.toThrow();
    });

    it("should validate publicKeyId is a string", async () => {
      const invalidKey = {
        publicKeyId: 123, // Should be string
        publicKey: new Uint8Array([1, 2, 3]),
      } as any;

      await expect(
        publicKeyStorageSet(testAclAddress, invalidKey, null)
      ).rejects.toThrow(/publicKeyId must be a string/);
    });

    it("should validate publicKey is a Uint8Array", async () => {
      const invalidKey = {
        publicKeyId: "test",
        publicKey: [1, 2, 3], // Should be Uint8Array
      } as any;

      await expect(
        publicKeyStorageSet(testAclAddress, invalidKey, null)
      ).rejects.toThrow(/publicKey must be a Uint8Array/);
    });

    it("should validate publicParamsId is a string", async () => {
      const invalidParams = {
        publicParamsId: 456, // Should be string
        publicParams: new Uint8Array([1, 2, 3]),
      } as any;

      await expect(
        publicKeyStorageSet(testAclAddress, null, invalidParams)
      ).rejects.toThrow(/publicParamsId must be a string/);
    });

    it("should validate publicParams is a Uint8Array", async () => {
      const invalidParams = {
        publicParamsId: "test",
        publicParams: [1, 2, 3], // Should be Uint8Array
      } as any;

      await expect(
        publicKeyStorageSet(testAclAddress, null, invalidParams)
      ).rejects.toThrow(/publicParams must be a Uint8Array/);
    });
  });

  describe("Data Integrity", () => {
    it("should preserve Uint8Array data integrity", async () => {
      const originalData = new Uint8Array([0, 1, 2, 3, 4, 5, 255, 254, 253]);
      const testKey = {
        publicKeyId: "integrity-test",
        publicKey: originalData,
      };

      await publicKeyStorageSet(testAclAddress, testKey, null);
      const result = await publicKeyStorageGet(testAclAddress);

      expect(result.publicKey?.data).toEqual(originalData);
      // Verify each byte
      for (let i = 0; i < originalData.length; i++) {
        expect(result.publicKey?.data?.[i]).toBe(originalData[i]);
      }
    });

    it("should handle large Uint8Array data", async () => {
      const largeData = new Uint8Array(10000);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }

      const testKey = {
        publicKeyId: "large-data-test",
        publicKey: largeData,
      };

      await publicKeyStorageSet(testAclAddress, testKey, null);
      const result = await publicKeyStorageGet(testAclAddress);

      expect(result.publicKey?.data?.length).toBe(largeData.length);
      expect(result.publicKey?.data).toEqual(largeData);
    });

    it("should handle empty Uint8Array", async () => {
      const emptyData = new Uint8Array(0);
      const testKey = {
        publicKeyId: "empty-test",
        publicKey: emptyData,
      };

      await publicKeyStorageSet(testAclAddress, testKey, null);
      const result = await publicKeyStorageGet(testAclAddress);

      expect(result.publicKey?.data?.length).toBe(0);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent reads", async () => {
      const testKey = createTestPublicKey();
      await publicKeyStorageSet(testAclAddress, testKey, null);

      // Perform concurrent reads
      const promises = Array(10)
        .fill(null)
        .map(() => publicKeyStorageGet(testAclAddress));

      const results = await Promise.all(promises);

      // All should return the same data
      results.forEach((result) => {
        expect(result.publicKey?.id).toBe(testKey.publicKeyId);
      });
    });

    it("should handle concurrent writes to different addresses", async () => {
      const addresses = [
        "0x1111111111111111111111111111111111111111" as `0x${string}`,
        "0x2222222222222222222222222222222222222222" as `0x${string}`,
        "0x3333333333333333333333333333333333333333" as `0x${string}`,
      ];

      const promises = addresses.map((addr, index) => {
        const key = {
          publicKeyId: `key-${index}`,
          publicKey: new Uint8Array([index]),
        };
        return publicKeyStorageSet(addr, key, null);
      });

      await Promise.all(promises);

      // Verify all were stored correctly
      const results = await Promise.all(addresses.map((addr) => publicKeyStorageGet(addr)));

      results.forEach((result, index) => {
        expect(result.publicKey?.id).toBe(`key-${index}`);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in IDs", async () => {
      const testKey = {
        publicKeyId: "test-key-!@#$%^&*()_+-=[]{}|;:',.<>?/`~",
        publicKey: new Uint8Array([1, 2, 3]),
      };

      await publicKeyStorageSet(testAclAddress, testKey, null);
      const result = await publicKeyStorageGet(testAclAddress);

      expect(result.publicKey?.id).toBe(testKey.publicKeyId);
    });

    it("should handle very long IDs", async () => {
      const longId = "x".repeat(10000);
      const testKey = {
        publicKeyId: longId,
        publicKey: new Uint8Array([1, 2, 3]),
      };

      await publicKeyStorageSet(testAclAddress, testKey, null);
      const result = await publicKeyStorageGet(testAclAddress);

      expect(result.publicKey?.id).toBe(longId);
    });

    it("should handle Unicode characters in IDs", async () => {
      const testKey = {
        publicKeyId: "test-key-你好-🌟-мир",
        publicKey: new Uint8Array([1, 2, 3]),
      };

      await publicKeyStorageSet(testAclAddress, testKey, null);
      const result = await publicKeyStorageGet(testAclAddress);

      expect(result.publicKey?.id).toBe(testKey.publicKeyId);
    });
  });
});
