/**
 * Tests for storage/memory.ts
 *
 * Comprehensive tests for in-memory storage implementation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStorage } from "../../src/storage/memory";
import { StorageError, StorageErrorCode } from "../../src/storage/types";

describe("MemoryStorage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  describe("Constructor", () => {
    it("should create an empty storage instance", () => {
      expect(storage.size).toBe(0);
      expect(storage.keys()).toEqual([]);
    });

    it("should accept initial data", () => {
      const initialData = {
        key1: "value1",
        key2: "value2",
        key3: "value3",
      };
      const storageWithData = new MemoryStorage(initialData);

      expect(storageWithData.size).toBe(3);
      expect(storageWithData.keys()).toContain("key1");
      expect(storageWithData.keys()).toContain("key2");
      expect(storageWithData.keys()).toContain("key3");
    });

    it("should handle empty initial data object", () => {
      const storageWithEmpty = new MemoryStorage({});
      expect(storageWithEmpty.size).toBe(0);
    });

    it("should preserve initial data values", async () => {
      const initialData = {
        publicKey: "0x123abc",
        privateKey: "0x456def",
      };
      const storageWithData = new MemoryStorage(initialData);

      expect(await storageWithData.getItem("publicKey")).toBe("0x123abc");
      expect(await storageWithData.getItem("privateKey")).toBe("0x456def");
    });
  });

  describe("getItem", () => {
    it("should return null for non-existent key", async () => {
      const result = await storage.getItem("nonexistent");
      expect(result).toBeNull();
    });

    it("should retrieve stored value", async () => {
      await storage.setItem("testKey", "testValue");
      const result = await storage.getItem("testKey");
      expect(result).toBe("testValue");
    });

    it("should throw error for empty string key", async () => {
      await expect(storage.getItem("")).rejects.toThrow(StorageError);
      await expect(storage.getItem("")).rejects.toThrow(
        "Key must be a non-empty string"
      );
    });

    it("should throw error for non-string key", async () => {
      await expect(storage.getItem(null as any)).rejects.toThrow(StorageError);
      await expect(storage.getItem(undefined as any)).rejects.toThrow(
        StorageError
      );
      await expect(storage.getItem(123 as any)).rejects.toThrow(StorageError);
      await expect(storage.getItem({} as any)).rejects.toThrow(StorageError);
      await expect(storage.getItem([] as any)).rejects.toThrow(StorageError);
    });

    it("should throw StorageError with correct code", async () => {
      try {
        await storage.getItem("");
        throw new Error("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(
          StorageErrorCode.INVALID_INPUT
        );
      }
    });

    it("should handle special characters in keys", async () => {
      const specialKey = "key-with-!@#$%^&*()_+";
      await storage.setItem(specialKey, "value");
      expect(await storage.getItem(specialKey)).toBe("value");
    });

    it("should handle Unicode keys", async () => {
      const unicodeKey = "键-🔑-مفتاح";
      await storage.setItem(unicodeKey, "value");
      expect(await storage.getItem(unicodeKey)).toBe("value");
    });
  });

  describe("setItem", () => {
    it("should store a value", async () => {
      await storage.setItem("key", "value");
      expect(await storage.getItem("key")).toBe("value");
    });

    it("should overwrite existing value", async () => {
      await storage.setItem("key", "oldValue");
      await storage.setItem("key", "newValue");
      expect(await storage.getItem("key")).toBe("newValue");
    });

    it("should throw error for empty string key", async () => {
      await expect(storage.setItem("", "value")).rejects.toThrow(StorageError);
      await expect(storage.setItem("", "value")).rejects.toThrow(
        "Key must be a non-empty string"
      );
    });

    it("should throw error for non-string key", async () => {
      await expect(storage.setItem(null as any, "value")).rejects.toThrow(
        StorageError
      );
      await expect(storage.setItem(undefined as any, "value")).rejects.toThrow(
        StorageError
      );
      await expect(storage.setItem(123 as any, "value")).rejects.toThrow(
        StorageError
      );
    });

    it("should throw error for non-string value", async () => {
      await expect(storage.setItem("key", null as any)).rejects.toThrow(
        StorageError
      );
      await expect(storage.setItem("key", undefined as any)).rejects.toThrow(
        StorageError
      );
      await expect(storage.setItem("key", 123 as any)).rejects.toThrow(
        StorageError
      );
      await expect(storage.setItem("key", {} as any)).rejects.toThrow(
        StorageError
      );
      await expect(storage.setItem("key", [] as any)).rejects.toThrow(
        StorageError
      );
    });

    it("should throw StorageError with correct code for invalid value", async () => {
      try {
        await storage.setItem("key", 123 as any);
        throw new Error("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(
          StorageErrorCode.INVALID_INPUT
        );
        expect((error as StorageError).message).toContain(
          "Value must be a string"
        );
      }
    });

    it("should handle empty string value", async () => {
      await storage.setItem("key", "");
      expect(await storage.getItem("key")).toBe("");
    });

    it("should handle very long values", async () => {
      const longValue = "x".repeat(100000);
      await storage.setItem("longKey", longValue);
      expect(await storage.getItem("longKey")).toBe(longValue);
    });

    it("should handle Unicode values", async () => {
      const unicodeValue = "Hello 世界 مرحبا 🌍";
      await storage.setItem("key", unicodeValue);
      expect(await storage.getItem("key")).toBe(unicodeValue);
    });

    it("should handle JSON strings as values", async () => {
      const jsonValue = JSON.stringify({ foo: "bar", num: 123 });
      await storage.setItem("json", jsonValue);
      expect(await storage.getItem("json")).toBe(jsonValue);
    });
  });

  describe("removeItem", () => {
    it("should remove existing item", async () => {
      await storage.setItem("key", "value");
      await storage.removeItem("key");
      expect(await storage.getItem("key")).toBeNull();
    });

    it("should not throw when removing non-existent key", async () => {
      await expect(storage.removeItem("nonexistent")).resolves.toBeUndefined();
    });

    it("should throw error for empty string key", async () => {
      await expect(storage.removeItem("")).rejects.toThrow(StorageError);
      await expect(storage.removeItem("")).rejects.toThrow(
        "Key must be a non-empty string"
      );
    });

    it("should throw error for non-string key", async () => {
      await expect(storage.removeItem(null as any)).rejects.toThrow(
        StorageError
      );
      await expect(storage.removeItem(undefined as any)).rejects.toThrow(
        StorageError
      );
      await expect(storage.removeItem(123 as any)).rejects.toThrow(
        StorageError
      );
    });

    it("should decrease size after removal", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      expect(storage.size).toBe(2);

      await storage.removeItem("key1");
      expect(storage.size).toBe(1);
    });

    it("should handle multiple removals of same key", async () => {
      await storage.setItem("key", "value");
      await storage.removeItem("key");
      await storage.removeItem("key");
      expect(await storage.getItem("key")).toBeNull();
      expect(storage.size).toBe(0);
    });
  });

  describe("clear", () => {
    it("should clear all items", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      await storage.setItem("key3", "value3");

      await storage.clear();

      expect(storage.size).toBe(0);
      expect(await storage.getItem("key1")).toBeNull();
      expect(await storage.getItem("key2")).toBeNull();
      expect(await storage.getItem("key3")).toBeNull();
    });

    it("should work on empty storage", async () => {
      await storage.clear();
      expect(storage.size).toBe(0);
    });

    it("should allow adding items after clear", async () => {
      await storage.setItem("key1", "value1");
      await storage.clear();
      await storage.setItem("key2", "value2");

      expect(storage.size).toBe(1);
      expect(await storage.getItem("key2")).toBe("value2");
    });

    it("should handle multiple clears", async () => {
      await storage.setItem("key", "value");
      await storage.clear();
      await storage.clear();
      expect(storage.size).toBe(0);
    });
  });

  describe("size", () => {
    it("should return 0 for empty storage", () => {
      expect(storage.size).toBe(0);
    });

    it("should return correct count after adding items", async () => {
      await storage.setItem("key1", "value1");
      expect(storage.size).toBe(1);

      await storage.setItem("key2", "value2");
      expect(storage.size).toBe(2);

      await storage.setItem("key3", "value3");
      expect(storage.size).toBe(3);
    });

    it("should not count overwritten items twice", async () => {
      await storage.setItem("key", "value1");
      await storage.setItem("key", "value2");
      expect(storage.size).toBe(1);
    });

    it("should update after removal", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      await storage.removeItem("key1");
      expect(storage.size).toBe(1);
    });
  });

  describe("keys", () => {
    it("should return empty array for empty storage", () => {
      expect(storage.keys()).toEqual([]);
    });

    it("should return all keys", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      await storage.setItem("key3", "value3");

      const keys = storage.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys).toContain("key3");
    });

    it("should not include removed keys", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      await storage.removeItem("key1");

      const keys = storage.keys();
      expect(keys).toHaveLength(1);
      expect(keys).toContain("key2");
      expect(keys).not.toContain("key1");
    });

    it("should return new array each time", async () => {
      await storage.setItem("key", "value");
      const keys1 = storage.keys();
      const keys2 = storage.keys();

      expect(keys1).toEqual(keys2);
      expect(keys1).not.toBe(keys2); // Different instances
    });
  });

  describe("values", () => {
    it("should return empty array for empty storage", () => {
      expect(storage.values()).toEqual([]);
    });

    it("should return all values", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      await storage.setItem("key3", "value3");

      const values = storage.values();
      expect(values).toHaveLength(3);
      expect(values).toContain("value1");
      expect(values).toContain("value2");
      expect(values).toContain("value3");
    });

    it("should reflect updated values", async () => {
      await storage.setItem("key", "oldValue");
      await storage.setItem("key", "newValue");

      const values = storage.values();
      expect(values).toHaveLength(1);
      expect(values).toContain("newValue");
      expect(values).not.toContain("oldValue");
    });

    it("should return new array each time", async () => {
      await storage.setItem("key", "value");
      const values1 = storage.values();
      const values2 = storage.values();

      expect(values1).toEqual(values2);
      expect(values1).not.toBe(values2); // Different instances
    });
  });

  describe("entries", () => {
    it("should return empty array for empty storage", () => {
      expect(storage.entries()).toEqual([]);
    });

    it("should return all key-value pairs", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");

      const entries = storage.entries();
      expect(entries).toHaveLength(2);
      expect(entries).toContainEqual(["key1", "value1"]);
      expect(entries).toContainEqual(["key2", "value2"]);
    });

    it("should reflect current state", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      await storage.removeItem("key1");

      const entries = storage.entries();
      expect(entries).toHaveLength(1);
      expect(entries).toContainEqual(["key2", "value2"]);
    });

    it("should return new array each time", async () => {
      await storage.setItem("key", "value");
      const entries1 = storage.entries();
      const entries2 = storage.entries();

      expect(entries1).toEqual(entries2);
      expect(entries1).not.toBe(entries2); // Different instances
    });
  });

  describe("toJSON", () => {
    it("should return empty object for empty storage", () => {
      expect(storage.toJSON()).toEqual({});
    });

    it("should return all data as object", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      await storage.setItem("key3", "value3");

      const json = storage.toJSON();
      expect(json).toEqual({
        key1: "value1",
        key2: "value2",
        key3: "value3",
      });
    });

    it("should reflect current state", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      await storage.removeItem("key1");

      const json = storage.toJSON();
      expect(json).toEqual({ key2: "value2" });
    });

    it("should be serializable with JSON.stringify", async () => {
      await storage.setItem("foo", "bar");
      const json = storage.toJSON();
      const serialized = JSON.stringify(json);
      expect(serialized).toBe('{"foo":"bar"}');
    });

    it("should return new object each time", async () => {
      await storage.setItem("key", "value");
      const json1 = storage.toJSON();
      const json2 = storage.toJSON();

      expect(json1).toEqual(json2);
      expect(json1).not.toBe(json2); // Different instances
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete CRUD workflow", async () => {
      // Create
      await storage.setItem("user", "alice");
      expect(await storage.getItem("user")).toBe("alice");

      // Update
      await storage.setItem("user", "bob");
      expect(await storage.getItem("user")).toBe("bob");

      // Read
      const value = await storage.getItem("user");
      expect(value).toBe("bob");

      // Delete
      await storage.removeItem("user");
      expect(await storage.getItem("user")).toBeNull();
    });

    it("should handle multiple concurrent operations", async () => {
      const promises = [
        storage.setItem("key1", "value1"),
        storage.setItem("key2", "value2"),
        storage.setItem("key3", "value3"),
      ];

      await Promise.all(promises);

      expect(storage.size).toBe(3);
      expect(await storage.getItem("key1")).toBe("value1");
      expect(await storage.getItem("key2")).toBe("value2");
      expect(await storage.getItem("key3")).toBe("value3");
    });

    it("should handle batch operations", async () => {
      const data = {
        publicKey: "0xabc123",
        privateKey: "0xdef456",
        chainId: "11155111",
      };

      // Batch set
      await Promise.all(
        Object.entries(data).map(([key, value]) => storage.setItem(key, value))
      );

      // Batch get
      const results = await Promise.all(
        Object.keys(data).map((key) => storage.getItem(key))
      );

      expect(results).toEqual(["0xabc123", "0xdef456", "11155111"]);
    });

    it("should work as cache replacement", async () => {
      const cache = new MemoryStorage();

      // Store computed values
      await cache.setItem("computed_1", "result1");
      await cache.setItem("computed_2", "result2");

      // Retrieve from cache
      expect(await cache.getItem("computed_1")).toBe("result1");

      // Invalidate cache
      await cache.clear();
      expect(await cache.getItem("computed_1")).toBeNull();
    });

    it("should support export and import pattern", async () => {
      // Populate storage
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");

      // Export
      const exported = storage.toJSON();

      // Create new instance with exported data
      const imported = new MemoryStorage(exported);

      // Verify data preserved
      expect(await imported.getItem("key1")).toBe("value1");
      expect(await imported.getItem("key2")).toBe("value2");
      expect(imported.size).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large number of items", async () => {
      const count = 10000;
      for (let i = 0; i < count; i++) {
        await storage.setItem(`key${i}`, `value${i}`);
      }

      expect(storage.size).toBe(count);
      expect(await storage.getItem("key0")).toBe("value0");
      expect(await storage.getItem(`key${count - 1}`)).toBe(
        `value${count - 1}`
      );
    });

    it("should handle keys with special characters", async () => {
      const specialKeys = [
        "key.with.dots",
        "key-with-dashes",
        "key_with_underscores",
        "key:with:colons",
        "key/with/slashes",
        "key with spaces",
      ];

      for (const key of specialKeys) {
        await storage.setItem(key, "value");
        expect(await storage.getItem(key)).toBe("value");
      }
    });

    it("should maintain data isolation between instances", async () => {
      const storage1 = new MemoryStorage();
      const storage2 = new MemoryStorage();

      await storage1.setItem("key", "value1");
      await storage2.setItem("key", "value2");

      expect(await storage1.getItem("key")).toBe("value1");
      expect(await storage2.getItem("key")).toBe("value2");
    });

    it("should handle rapid updates to same key", async () => {
      for (let i = 0; i < 100; i++) {
        await storage.setItem("key", `value${i}`);
      }

      expect(await storage.getItem("key")).toBe("value99");
      expect(storage.size).toBe(1);
    });

    it("should handle whitespace in values", async () => {
      const whitespaceValue = "  value with spaces  \n\t";
      await storage.setItem("key", whitespaceValue);
      expect(await storage.getItem("key")).toBe(whitespaceValue);
    });
  });
});
