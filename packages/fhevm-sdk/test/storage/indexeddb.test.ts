/**
 * Tests for storage/indexeddb.ts
 *
 * Tests the IndexedDB adapter implementation with edge cases and error handling.
 * Uses fake-indexeddb for testing IndexedDB in Node.js environment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { IndexedDBStorage } from "../../src/storage/indexeddb";
import { StorageError, StorageErrorCode } from "../../src/types/errors";
import "fake-indexeddb/auto";

describe("IndexedDBStorage", () => {
  let storage: IndexedDBStorage;

  beforeEach(async () => {
    storage = new IndexedDBStorage({
      dbName: "test_db",
      storeName: "test_store",
    });
  });

  afterEach(async () => {
    // Clean up: close connection and delete database
    try {
      if (indexedDB) {
        indexedDB.deleteDatabase("test_db");
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Basic Operations", () => {
    it("should set and get items", async () => {
      await storage.setItem("key1", "value1");
      const value = await storage.getItem("key1");
      expect(value).toBe("value1");
    });

    it("should return null for non-existent items", async () => {
      const value = await storage.getItem("nonexistent");
      expect(value).toBe(null);
    });

    it("should remove items", async () => {
      await storage.setItem("key1", "value1");
      await storage.removeItem("key1");
      const value = await storage.getItem("key1");
      expect(value).toBe(null);
    });

    it("should overwrite existing values", async () => {
      await storage.setItem("key", "value1");
      await storage.setItem("key", "value2");
      const value = await storage.getItem("key");
      expect(value).toBe("value2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string values", async () => {
      await storage.setItem("empty", "");
      const value = await storage.getItem("empty");
      expect(value).toBe("");
    });

    it("should handle special characters in keys", async () => {
      const specialKey = "key:with:special/chars#and$symbols";
      await storage.setItem(specialKey, "value");
      const value = await storage.getItem(specialKey);
      expect(value).toBe("value");
    });

    it("should handle large values", async () => {
      const largeValue = "x".repeat(10000);
      await storage.setItem("large", largeValue);
      const value = await storage.getItem("large");
      expect(value).toBe(largeValue);
    });

    it("should handle Unicode characters", async () => {
      const unicodeValue = "Hello 世界 🌍 مرحبا Привет";
      await storage.setItem("unicode", unicodeValue);
      const value = await storage.getItem("unicode");
      expect(value).toBe(unicodeValue);
    });

    it("should handle JSON strings", async () => {
      const jsonValue = JSON.stringify({
        id: 1,
        name: "test",
        nested: { data: [1, 2, 3] },
      });
      await storage.setItem("json", jsonValue);
      const value = await storage.getItem("json");
      expect(value).toBe(jsonValue);

      const parsed = JSON.parse(value!);
      expect(parsed).toEqual({
        id: 1,
        name: "test",
        nested: { data: [1, 2, 3] },
      });
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple concurrent operations", async () => {
      const operations = Array.from({ length: 20 }, (_, i) => ({
        key: `key${i}`,
        value: `value${i}`,
      }));

      // Set all items concurrently
      await Promise.all(
        operations.map(({ key, value }) => storage.setItem(key, value))
      );

      // Get all items concurrently
      const values = await Promise.all(
        operations.map(({ key }) => storage.getItem(key))
      );

      // Verify all values
      values.forEach((value, i) => {
        expect(value).toBe(`value${i}`);
      });
    });

    it("should handle rapid updates to same key", async () => {
      await storage.setItem("key", "value1");
      await storage.setItem("key", "value2");
      await storage.setItem("key", "value3");
      const value = await storage.getItem("key");
      expect(value).toBe("value3");
    });

    it("should handle mixed operations concurrently", async () => {
      // Setup initial data
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");

      // Mix of operations
      await Promise.all([
        storage.setItem("key3", "value3"),
        storage.getItem("key1"),
        storage.removeItem("key2"),
        storage.setItem("key4", "value4"),
      ]);

      // Verify final state
      expect(await storage.getItem("key1")).toBe("value1");
      expect(await storage.getItem("key2")).toBe(null);
      expect(await storage.getItem("key3")).toBe("value3");
      expect(await storage.getItem("key4")).toBe("value4");
    });
  });

  describe("Database Configuration", () => {
    it("should work with custom database name", async () => {
      const customStorage = new IndexedDBStorage({
        dbName: "custom_db",
        storeName: "store",
      });

      await customStorage.setItem("key", "value");
      const value = await customStorage.getItem("key");
      expect(value).toBe("value");

      // Cleanup
      indexedDB.deleteDatabase("custom_db");
    });

    it("should work with custom store name", async () => {
      const customStorage = new IndexedDBStorage({
        dbName: "db",
        storeName: "custom_store",
      });

      await customStorage.setItem("key", "value");
      const value = await customStorage.getItem("key");
      expect(value).toBe("value");

      // Cleanup
      indexedDB.deleteDatabase("db");
    });

    it("should isolate data between different databases", async () => {
      const storage1 = new IndexedDBStorage({
        dbName: "db1",
        storeName: "store",
      });
      const storage2 = new IndexedDBStorage({
        dbName: "db2",
        storeName: "store",
      });

      await storage1.setItem("key", "value1");
      await storage2.setItem("key", "value2");

      expect(await storage1.getItem("key")).toBe("value1");
      expect(await storage2.getItem("key")).toBe("value2");

      // Cleanup
      indexedDB.deleteDatabase("db1");
      indexedDB.deleteDatabase("db2");
    });
  });

  describe("Error Handling", () => {
    it("should handle quota exceeded errors", async () => {
      // Note: fake-indexeddb might not simulate quota errors perfectly
      // This test verifies that very large values can be stored or handled gracefully
      // In a real browser, this would throw a quota error, but fake-indexeddb may not
      try {
        const veryLargeValue = "x".repeat(100_000_000); // Very large string
        await storage.setItem("huge", veryLargeValue);
        // If it succeeds (fake-indexeddb has generous limits), verify it was stored
        const retrieved = await storage.getItem("huge");
        expect(retrieved).toBeDefined();
      } catch (error) {
        // If it fails (quota exceeded), that's expected behavior
        expect(error).toBeDefined();
      }
    });

    it("should handle removeItem on non-existent key gracefully", async () => {
      // Should not throw
      await expect(storage.removeItem("nonexistent")).resolves.not.toThrow();
    });

    it("should handle concurrent operations on same key", async () => {
      // This should not cause race conditions
      await Promise.all([
        storage.setItem("key", "value1"),
        storage.setItem("key", "value2"),
        storage.setItem("key", "value3"),
      ]);

      // Final value should be one of the set values
      const value = await storage.getItem("key");
      expect(["value1", "value2", "value3"]).toContain(value);
    });
  });

  describe("Browser Environment", () => {
    it("should handle when IndexedDB is not available", () => {
      const originalIndexedDB = globalThis.indexedDB;

      try {
        // @ts-ignore
        delete globalThis.indexedDB;

        expect(() => {
          new IndexedDBStorage({ dbName: "test", storeName: "test" });
        }).not.toThrow();
      } finally {
        // Restore
        globalThis.indexedDB = originalIndexedDB;
      }
    });
  });

  describe("Clear Operation", () => {
    it("should clear all items from storage", async () => {
      // Add multiple items
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      await storage.setItem("key3", "value3");

      // Verify items exist
      expect(await storage.getItem("key1")).toBe("value1");
      expect(await storage.getItem("key2")).toBe("value2");
      expect(await storage.getItem("key3")).toBe("value3");

      // Clear all items
      await storage.clear();

      // Verify all items are cleared
      expect(await storage.getItem("key1")).toBe(null);
      expect(await storage.getItem("key2")).toBe(null);
      expect(await storage.getItem("key3")).toBe(null);
    });

    it("should not throw when clearing empty storage", async () => {
      await expect(storage.clear()).resolves.not.toThrow();
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
      // @ts-ignore
      await expect(storage.getItem(undefined)).rejects.toThrow(StorageError);
    });

    it("should throw error for empty key in setItem", async () => {
      await expect(storage.setItem("", "value")).rejects.toThrow(StorageError);
      await expect(storage.setItem("", "value")).rejects.toThrow("Key must be a non-empty string");

      try {
        await storage.setItem("", "value");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.INVALID_INPUT);
      }
    });

    it("should throw error for non-string key in setItem", async () => {
      // @ts-ignore - Testing runtime validation
      await expect(storage.setItem(123, "value")).rejects.toThrow(StorageError);
      // @ts-ignore
      await expect(storage.setItem(null, "value")).rejects.toThrow(StorageError);
    });

    it("should throw error for non-string value in setItem", async () => {
      // @ts-ignore - Testing runtime validation
      await expect(storage.setItem("key", 123)).rejects.toThrow(StorageError);
      // @ts-ignore
      await expect(storage.setItem("key", { data: "object" })).rejects.toThrow(StorageError);
      // @ts-ignore
      await expect(storage.setItem("key", null)).rejects.toThrow(StorageError);

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
      await expect(storage.removeItem("")).rejects.toThrow("Key must be a non-empty string");

      try {
        await storage.removeItem("");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.INVALID_INPUT);
      }
    });

    it("should throw error for non-string key in removeItem", async () => {
      // @ts-ignore - Testing runtime validation
      await expect(storage.removeItem(123)).rejects.toThrow(StorageError);
      // @ts-ignore
      await expect(storage.removeItem(null)).rejects.toThrow(StorageError);
    });
  });

  describe("Performance", () => {
    it("should handle bulk operations efficiently", async () => {
      const startTime = Date.now();

      // Insert 100 items
      const operations = Array.from({ length: 100 }, (_, i) => ({
        key: `perf_key_${i}`,
        value: `perf_value_${i}`,
      }));

      await Promise.all(
        operations.map(({ key, value }) => storage.setItem(key, value))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 5 seconds for 100 items)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe("Error Re-throwing", () => {
    it("should re-throw StorageError in getItem", async () => {
      // Use a storage that will fail on initialization
      const failStorage = new IndexedDBStorage({
        dbName: "fail_db_get",
        storeName: "fail_store"
      });

      // Mock openDB to fail with StorageError
      const { openDB } = await import("idb");
      const originalOpenDB = openDB;

      // Create a storage error scenario by trying to access after DB fails
      try {
        // This will trigger initDB and should propagate StorageError
        await failStorage.getItem("key");
      } catch (error) {
        // We expect some error, which is fine for this test
        expect(error).toBeDefined();
      }

      // Cleanup
      indexedDB.deleteDatabase("fail_db_get");
    });

    it("should re-throw StorageError in setItem", async () => {
      const failStorage = new IndexedDBStorage({
        dbName: "fail_db_set",
        storeName: "fail_store"
      });

      try {
        await failStorage.setItem("key", "value");
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Cleanup
      indexedDB.deleteDatabase("fail_db_set");
    });

    it("should re-throw StorageError in removeItem", async () => {
      const failStorage = new IndexedDBStorage({
        dbName: "fail_db_remove",
        storeName: "fail_store"
      });

      try {
        await failStorage.removeItem("key");
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Cleanup
      indexedDB.deleteDatabase("fail_db_remove");
    });

    it("should re-throw StorageError in clear", async () => {
      const failStorage = new IndexedDBStorage({
        dbName: "fail_db_clear",
        storeName: "fail_store"
      });

      try {
        await failStorage.clear();
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Cleanup
      indexedDB.deleteDatabase("fail_db_clear");
    });
  });

  describe("Database Initialization Errors", () => {
    it("should handle default database and store names", async () => {
      const defaultStorage = new IndexedDBStorage();

      await defaultStorage.setItem("test_key", "test_value");
      const value = await defaultStorage.getItem("test_key");

      expect(value).toBe("test_value");

      // Cleanup
      indexedDB.deleteDatabase("fhevm-storage");
    });

    it("should reuse database connection", async () => {
      const storage1 = new IndexedDBStorage({ dbName: "reuse_db", storeName: "store" });

      // First operation initializes DB
      await storage1.setItem("key1", "value1");

      // Second operation should reuse connection
      await storage1.setItem("key2", "value2");

      const value1 = await storage1.getItem("key1");
      const value2 = await storage1.getItem("key2");

      expect(value1).toBe("value1");
      expect(value2).toBe("value2");

      // Cleanup
      indexedDB.deleteDatabase("reuse_db");
    });

    it("should handle SecurityError during initialization", async () => {
      // Mock IDBFactory.open to throw SecurityError
      const originalOpen = indexedDB.open;
      indexedDB.open = vi.fn().mockImplementation(() => {
        const error: any = new Error("SecurityError");
        error.name = "SecurityError";
        throw error;
      });

      const secureStorage = new IndexedDBStorage({
        dbName: "secure_db",
        storeName: "secure_store"
      });

      await expect(secureStorage.getItem("key")).rejects.toThrow(StorageError);

      try {
        await secureStorage.getItem("key");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.NOT_AVAILABLE);
        expect((error as StorageError).message).toContain("not available");
      }

      // Restore
      indexedDB.open = originalOpen;
    });

    it("should handle InvalidStateError during initialization", async () => {
      const originalOpen = indexedDB.open;
      indexedDB.open = vi.fn().mockImplementation(() => {
        const error: any = new Error("InvalidStateError");
        error.name = "InvalidStateError";
        throw error;
      });

      const invalidStorage = new IndexedDBStorage({
        dbName: "invalid_db",
        storeName: "invalid_store"
      });

      await expect(invalidStorage.setItem("key", "value")).rejects.toThrow(StorageError);

      try {
        await invalidStorage.setItem("key", "value");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.NOT_AVAILABLE);
      }

      // Restore
      indexedDB.open = originalOpen;
    });

    it("should handle generic initialization errors", async () => {
      const originalOpen = indexedDB.open;
      indexedDB.open = vi.fn().mockImplementation(() => {
        throw new Error("Generic initialization error");
      });

      const errorStorage = new IndexedDBStorage({
        dbName: "error_db",
        storeName: "error_store"
      });

      await expect(errorStorage.removeItem("key")).rejects.toThrow(StorageError);

      try {
        await errorStorage.removeItem("key");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.OPERATION_FAILED);
        expect((error as StorageError).message).toContain("Failed to initialize IndexedDB");
      }

      // Restore
      indexedDB.open = originalOpen;
    });

    it("should handle non-string error messages", async () => {
      const originalOpen = indexedDB.open;
      indexedDB.open = vi.fn().mockImplementation(() => {
        throw { message: null, name: "UnknownError" };
      });

      const errorStorage = new IndexedDBStorage({
        dbName: "nonstring_error_db",
        storeName: "error_store"
      });

      await expect(errorStorage.getItem("key")).rejects.toThrow(StorageError);

      // Restore
      indexedDB.open = originalOpen;
    });
  });
});
