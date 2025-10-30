import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GenericStringInMemoryStorage } from "../../src/storage/GenericStringStorage";

describe("Storage Implementations", () => {
  describe("GenericStringInMemoryStorage", () => {
    let storage: GenericStringInMemoryStorage;

    beforeEach(() => {
      storage = new GenericStringInMemoryStorage();
    });

    it("sets and retrieves values", () => {
      storage.setItem("key1", "value1");
      expect(storage.getItem("key1")).toBe("value1");
    });

    it("returns null for missing keys", () => {
      expect(storage.getItem("nonexistent")).toBe(null);
    });

    it("removes items", () => {
      storage.setItem("key1", "value1");
      expect(storage.getItem("key1")).toBe("value1");

      storage.removeItem("key1");
      expect(storage.getItem("key1")).toBe(null);
    });

    it("overwrites existing values", () => {
      storage.setItem("key1", "value1");
      storage.setItem("key1", "value2");
      expect(storage.getItem("key1")).toBe("value2");
    });

    it("handles multiple keys independently", () => {
      storage.setItem("key1", "value1");
      storage.setItem("key2", "value2");
      storage.setItem("key3", "value3");

      expect(storage.getItem("key1")).toBe("value1");
      expect(storage.getItem("key2")).toBe("value2");
      expect(storage.getItem("key3")).toBe("value3");
    });

    it("handles empty string values", () => {
      storage.setItem("empty", "");
      expect(storage.getItem("empty")).toBe("");
    });

    it("handles special characters in keys and values", () => {
      const specialKey = "key:with:colons:and/slashes";
      const specialValue = "value{with}[special]chars&symbols!@#$%";

      storage.setItem(specialKey, specialValue);
      expect(storage.getItem(specialKey)).toBe(specialValue);
    });

    it("handles large values", () => {
      const largeValue = "x".repeat(10000);
      storage.setItem("large", largeValue);
      expect(storage.getItem("large")).toBe(largeValue);
    });

    it("handles removing non-existent keys gracefully", () => {
      // This should not throw
      expect(() => {
        storage.removeItem("nonexistent");
      }).not.toThrow();

      // Trying to get the non-existent item should return null
      expect(storage.getItem("nonexistent")).toBe(null);
    });

    it("handles concurrent set/get operations", () => {
      const keys = Array.from({ length: 100 }, (_, i) => `key${i}`);
      const values = Array.from({ length: 100 }, (_, i) => `value${i}`);

      keys.forEach((key, i) => {
        storage.setItem(key, values[i]);
      });

      keys.forEach((key, i) => {
        expect(storage.getItem(key)).toBe(values[i]);
      });
    });

    it("is isolated between instances", () => {
      const storage1 = new GenericStringInMemoryStorage();
      const storage2 = new GenericStringInMemoryStorage();

      storage1.setItem("key", "value1");
      storage2.setItem("key", "value2");

      expect(storage1.getItem("key")).toBe("value1");
      expect(storage2.getItem("key")).toBe("value2");
    });

    it("handles JSON serialized objects", () => {
      const obj = { id: 1, name: "test", data: [1, 2, 3] };
      const jsonString = JSON.stringify(obj);

      storage.setItem("obj", jsonString);
      const retrieved = JSON.parse(storage.getItem("obj")!);

      expect(retrieved).toEqual(obj);
    });
  });
});
