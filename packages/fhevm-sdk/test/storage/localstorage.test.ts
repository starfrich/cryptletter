/**
 * Tests for storage/localstorage.ts
 *
 * Tests the localStorage adapter implementation with edge cases and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LocalStorageStorage } from "../../src/storage/localstorage";
import { StorageError, StorageErrorCode } from "../../src/types/errors";

describe("LocalStorageStorage", () => {
  let storage: LocalStorageStorage;
  let mockLocalStorage: Storage;

  beforeEach(() => {
    // Create a mock localStorage
    const store: Record<string, string> = {};
    mockLocalStorage = {
      getItem: vi.fn((key: string) => {
        // Return the value if it exists in store, even if it's an empty string
        return key in store ? store[key] : null;
      }),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
      key: vi.fn((index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }),
      get length() {
        return Object.keys(store).length;
      },
    };

    // Mock global window.localStorage
    global.window = { localStorage: mockLocalStorage } as any;

    storage = new LocalStorageStorage({ prefix: "test_" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Operations", () => {
    it("should set and get items with prefix", async () => {
      await storage.setItem("key1", "value1");
      expect(await storage.getItem("key1")).toBe("value1");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "test_key1",
        "value1"
      );
    });

    it("should return null for non-existent items", async () => {
      expect(await storage.getItem("nonexistent")).toBe(null);
    });

    it("should remove items", async () => {
      await storage.setItem("key1", "value1");
      await storage.removeItem("key1");
      expect(await storage.getItem("key1")).toBe(null);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("test_key1");
    });

    it("should work without prefix", async () => {
      const unprefixedStorage = new LocalStorageStorage();
      await unprefixedStorage.setItem("key1", "value1");
      expect(await unprefixedStorage.getItem("key1")).toBe("value1");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("fhevm:key1", "value1"); // Default prefix is 'fhevm:'
    });
  });

  describe("Error Handling", () => {
    it("should handle localStorage quota exceeded", async () => {
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        const error: any = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      await expect(storage.setItem("key", "value")).rejects.toThrow(StorageError);

      try {
        await storage.setItem("key", "value");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(
          StorageErrorCode.QUOTA_EXCEEDED
        );
      }
    });

    it("should handle localStorage not available", async () => {
      // Simulate localStorage being unavailable (e.g., private browsing)
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        throw new Error("localStorage is not available");
      });

      await expect(storage.setItem("key", "value")).rejects.toThrow(StorageError);
    });

    it("should handle getItem errors gracefully", async () => {
      vi.spyOn(mockLocalStorage, "getItem").mockImplementation(() => {
        throw new Error("localStorage access denied");
      });

      await expect(storage.getItem("key")).rejects.toThrow(StorageError);
    });

    it("should handle removeItem errors gracefully", async () => {
      vi.spyOn(mockLocalStorage, "removeItem").mockImplementation(() => {
        throw new Error("localStorage access denied");
      });

      await expect(storage.removeItem("key")).rejects.toThrow(StorageError);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string values", async () => {
      await storage.setItem("empty", "");
      expect(await storage.getItem("empty")).toBe("");
    });

    it("should handle special characters in keys", async () => {
      const specialKey = "key:with:special/chars#and$symbols";
      await storage.setItem(specialKey, "value");
      expect(await storage.getItem(specialKey)).toBe("value");
    });

    it("should handle large values", async () => {
      const largeValue = "x".repeat(5000);
      await storage.setItem("large", largeValue);
      expect(await storage.getItem("large")).toBe(largeValue);
    });

    it("should handle Unicode characters", async () => {
      const unicodeValue = "Hello 世界 🌍 مرحبا";
      await storage.setItem("unicode", unicodeValue);
      expect(await storage.getItem("unicode")).toBe(unicodeValue);
    });

    it("should handle JSON strings", async () => {
      const jsonValue = JSON.stringify({ id: 1, name: "test", data: [1, 2, 3] });
      await storage.setItem("json", jsonValue);
      expect(await storage.getItem("json")).toBe(jsonValue);

      const parsed = JSON.parse((await storage.getItem("json"))!);
      expect(parsed).toEqual({ id: 1, name: "test", data: [1, 2, 3] });
    });

    it("should overwrite existing values", async () => {
      await storage.setItem("key", "value1");
      await storage.setItem("key", "value2");
      expect(await storage.getItem("key")).toBe("value2");
    });
  });

  describe("Prefix Isolation", () => {
    it("should isolate data between different prefixes", async () => {
      const storage1 = new LocalStorageStorage({ prefix: "app1_" });
      const storage2 = new LocalStorageStorage({ prefix: "app2_" });

      await storage1.setItem("key", "value1");
      await storage2.setItem("key", "value2");

      expect(await storage1.getItem("key")).toBe("value1");
      expect(await storage2.getItem("key")).toBe("value2");
    });

    it("should not interfere with unprefixed storage", async () => {
      const prefixedStorage = new LocalStorageStorage({ prefix: "test_" });
      const unprefixedStorage = new LocalStorageStorage();

      await prefixedStorage.setItem("key", "prefixed_value");
      await unprefixedStorage.setItem("key", "unprefixed_value");

      expect(await prefixedStorage.getItem("key")).toBe("prefixed_value");
      expect(await unprefixedStorage.getItem("key")).toBe("unprefixed_value");
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple set/get operations", async () => {
      const operations = Array.from({ length: 50 }, (_, i) => ({
        key: `key${i}`,
        value: `value${i}`,
      }));

      for (const { key, value } of operations) {
        await storage.setItem(key, value);
      }

      for (const { key, value } of operations) {
        expect(await storage.getItem(key)).toBe(value);
      }
    });

    it("should handle rapid updates to same key", async () => {
      await storage.setItem("key", "value1");
      await storage.setItem("key", "value2");
      await storage.setItem("key", "value3");
      expect(await storage.getItem("key")).toBe("value3");
    });
  });

  describe("Browser Compatibility", () => {
    it("should work when localStorage is undefined", () => {
      // @ts-ignore
      delete global.localStorage;

      expect(() => {
        new LocalStorageStorage();
      }).not.toThrow();
    });

    it("should detect when localStorage is not available", async () => {
      // @ts-ignore - Remove window to simulate no localStorage environment
      delete global.window;

      const storage = new LocalStorageStorage();
      await expect(storage.setItem("key", "value")).rejects.toThrow();
    });
  });

  describe("Clear Operation", () => {
    it("should clear all items with matching prefix", async () => {
      const storage1 = new LocalStorageStorage({ prefix: "test_" });

      // Add items
      await storage1.setItem("key1", "value1");
      await storage1.setItem("key2", "value2");
      await storage1.setItem("key3", "value3");

      // Verify items exist
      expect(await storage1.getItem("key1")).toBe("value1");
      expect(await storage1.getItem("key2")).toBe("value2");

      // Clear all
      await storage1.clear();

      // Verify all cleared
      expect(await storage1.getItem("key1")).toBe(null);
      expect(await storage1.getItem("key2")).toBe(null);
      expect(await storage1.getItem("key3")).toBe(null);
    });

    it("should only clear items with matching prefix", async () => {
      const storage1 = new LocalStorageStorage({ prefix: "app1_" });
      const storage2 = new LocalStorageStorage({ prefix: "app2_" });

      await storage1.setItem("key", "value1");
      await storage2.setItem("key", "value2");

      // Clear storage1 only
      await storage1.clear();

      // storage1 cleared, storage2 intact
      expect(await storage1.getItem("key")).toBe(null);
      expect(await storage2.getItem("key")).toBe("value2");
    });

    it("should not throw when clearing empty storage", async () => {
      const emptyStorage = new LocalStorageStorage({ prefix: "empty_" });
      await expect(emptyStorage.clear()).resolves.not.toThrow();
    });

    it("should handle clear errors gracefully", async () => {
      // Create fresh instance to ensure clean state
      const storage = new LocalStorageStorage({ prefix: "clear_err_" });

      // Mock removeItem to throw error during clear operation
      const originalRemoveItem = mockLocalStorage.removeItem;
      vi.spyOn(mockLocalStorage, "removeItem").mockImplementation((key: string) => {
        if (key.startsWith("clear_err_")) {
          throw new Error("Access denied during clear");
        }
        return originalRemoveItem.call(mockLocalStorage, key);
      });

      // Add an item first to ensure clear has something to remove
      await storage.setItem("test", "value");

      await expect(storage.clear()).rejects.toThrow(StorageError);

      vi.restoreAllMocks();
    });
  });

  describe("Input Validation", () => {
    it("should throw error for empty key in getItem", async () => {
      await expect(storage.getItem("")).rejects.toThrow(StorageError);
      await expect(storage.getItem("")).rejects.toThrow("Key must be a non-empty string");

      try {
        await storage.getItem("");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.INVALID_INPUT);
      }
    });

    it("should throw error for non-string key in getItem", async () => {
      // @ts-ignore - Testing runtime validation
      await expect(storage.getItem(123)).rejects.toThrow(StorageError);
      // @ts-ignore
      await expect(storage.getItem(null)).rejects.toThrow(StorageError);
    });

    it("should throw error for empty key in setItem", async () => {
      await expect(storage.setItem("", "value")).rejects.toThrow(StorageError);

      try {
        await storage.setItem("", "value");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.INVALID_INPUT);
      }
    });

    it("should throw error for non-string key in setItem", async () => {
      // @ts-ignore
      await expect(storage.setItem(123, "value")).rejects.toThrow(StorageError);
    });

    it("should throw error for non-string value in setItem", async () => {
      // @ts-ignore
      await expect(storage.setItem("key", 123)).rejects.toThrow(StorageError);
      // @ts-ignore
      await expect(storage.setItem("key", { data: "object" })).rejects.toThrow(StorageError);

      try {
        // @ts-ignore
        await storage.setItem("key", 123);
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.INVALID_INPUT);
        expect((error as StorageError).message).toContain("Value must be a string");
      }
    });

    it("should throw error for empty key in removeItem", async () => {
      await expect(storage.removeItem("")).rejects.toThrow(StorageError);

      try {
        await storage.removeItem("");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.INVALID_INPUT);
      }
    });

    it("should throw error for non-string key in removeItem", async () => {
      // @ts-ignore
      await expect(storage.removeItem(123)).rejects.toThrow(StorageError);
    });
  });

  describe("Quota Management", () => {
    it("should attempt to clear old entries when quota exceeded", async () => {
      // Pre-populate storage
      await storage.setItem("old1", "value");
      await storage.setItem("old2", "value");
      await storage.setItem("old3", "value");

      // Mock setItem to fail first time (quota), succeed second time
      let callCount = 0;
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation((key, value) => {
        callCount++;
        if (callCount === 1) {
          const error: any = new Error("QuotaExceededError");
          error.name = "QuotaExceededError";
          throw error;
        }
        // Second call succeeds after clearOldEntries()
        return;
      });

      // This should trigger clearOldEntries and retry
      await expect(storage.setItem("newkey", "newvalue")).resolves.not.toThrow();
    });

    it("should throw quota error if retry fails after clearing", async () => {
      // Mock setItem to always fail with quota error
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        const error: any = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      await expect(storage.setItem("key", "value")).rejects.toThrow(StorageError);

      try {
        await storage.setItem("key", "value");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
        expect((error as StorageError).message).toContain("quota exceeded");
      }
    });

    it("should handle NS_ERROR_DOM_QUOTA_REACHED error", async () => {
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        const error: any = new Error("NS_ERROR_DOM_QUOTA_REACHED");
        error.name = "NS_ERROR_DOM_QUOTA_REACHED";
        throw error;
      });

      await expect(storage.setItem("key", "value")).rejects.toThrow(StorageError);

      try {
        await storage.setItem("key", "value");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
      }
    });
  });
});
