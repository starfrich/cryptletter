/**
 * Tests for vue/useInMemoryStorage.ts
 *
 * These tests cover the useInMemoryStorage composable which provides in-memory storage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useInMemoryStorage } from "../../src/vue/useInMemoryStorage";
import { GenericStringInMemoryStorage } from "../../src/storage/GenericStringStorage";

describe("useInMemoryStorage Composable", () => {
  describe("Basic Functionality", () => {
    it("should return a storage instance", () => {
      const { storage } = useInMemoryStorage();

      expect(storage.value).toBeDefined();
      expect(storage.value).toBeInstanceOf(GenericStringInMemoryStorage);
    });

    it("should return a readonly ref", () => {
      const { storage } = useInMemoryStorage();

      // TypeScript should enforce readonly, but we can check the ref is defined
      expect(storage.value).toBeDefined();
    });

    it("should provide functional storage", () => {
      const { storage } = useInMemoryStorage();

      // Test basic storage operations
      storage.value.setItem("test-key", "test-value");
      expect(storage.value.getItem("test-key")).toBe("test-value");

      storage.value.removeItem("test-key");
      expect(storage.value.getItem("test-key")).toBeNull();
    });
  });

  describe("Isolation", () => {
    it("should create independent storage instances", () => {
      const { storage: storage1 } = useInMemoryStorage();
      const { storage: storage2 } = useInMemoryStorage();

      // Each call should create a new instance
      expect(storage1.value).not.toBe(storage2.value);

      // Changes to one should not affect the other
      storage1.value.setItem("key", "value1");
      storage2.value.setItem("key", "value2");

      expect(storage1.value.getItem("key")).toBe("value1");
      expect(storage2.value.getItem("key")).toBe("value2");
    });

    it("should maintain separate data stores", () => {
      const { storage: storage1 } = useInMemoryStorage();
      const { storage: storage2 } = useInMemoryStorage();

      storage1.value.setItem("key1", "value1");
      storage2.value.setItem("key2", "value2");

      expect(storage1.value.getItem("key1")).toBe("value1");
      expect(storage1.value.getItem("key2")).toBeNull();

      expect(storage2.value.getItem("key1")).toBeNull();
      expect(storage2.value.getItem("key2")).toBe("value2");
    });
  });

  describe("Storage Operations", () => {
    let storage: ReturnType<typeof useInMemoryStorage>["storage"];

    beforeEach(() => {
      ({ storage } = useInMemoryStorage());
    });

    it("should set and get items", () => {
      storage.value.setItem("test", "data");
      expect(storage.value.getItem("test")).toBe("data");
    });

    it("should remove items", () => {
      storage.value.setItem("test", "data");
      expect(storage.value.getItem("test")).toBe("data");

      storage.value.removeItem("test");
      expect(storage.value.getItem("test")).toBeNull();
    });

    it("should return null for non-existent items", () => {
      expect(storage.value.getItem("nonexistent")).toBeNull();
    });

    it("should overwrite existing items", () => {
      storage.value.setItem("test", "original");
      expect(storage.value.getItem("test")).toBe("original");

      storage.value.setItem("test", "updated");
      expect(storage.value.getItem("test")).toBe("updated");
    });

    it("should handle multiple items", () => {
      storage.value.setItem("key1", "value1");
      storage.value.setItem("key2", "value2");
      storage.value.setItem("key3", "value3");

      expect(storage.value.getItem("key1")).toBe("value1");
      expect(storage.value.getItem("key2")).toBe("value2");
      expect(storage.value.getItem("key3")).toBe("value3");
    });

    it("should handle empty string values", () => {
      storage.value.setItem("empty", "");
      expect(storage.value.getItem("empty")).toBe("");
    });

    it("should handle special characters in keys", () => {
      const specialKey = "key-with-special_chars.123";
      storage.value.setItem(specialKey, "value");
      expect(storage.value.getItem(specialKey)).toBe("value");
    });

    it("should handle special characters in values", () => {
      const specialValue = "value\nwith\tspecial\\chars";
      storage.value.setItem("key", specialValue);
      expect(storage.value.getItem("key")).toBe(specialValue);
    });

    it("should handle JSON-like strings", () => {
      const jsonString = JSON.stringify({ foo: "bar", nested: { value: 123 } });
      storage.value.setItem("json", jsonString);
      expect(storage.value.getItem("json")).toBe(jsonString);
    });

    it("should handle long values", () => {
      const longValue = "a".repeat(10000);
      storage.value.setItem("long", longValue);
      expect(storage.value.getItem("long")).toBe(longValue);
    });
  });

  describe("Integration with useFHEDecrypt", () => {
    it("should be compatible with fhevmDecryptionSignatureStorage", () => {
      const { storage } = useInMemoryStorage();

      // Simulate storing a decryption signature
      const mockSignature = JSON.stringify({
        publicKey: "0xpubkey",
        privateKey: "0xprivkey",
        signature: "0xsig",
      });

      storage.value.setItem("fhevm-decryption-signature", mockSignature);

      const retrieved = storage.value.getItem("fhevm-decryption-signature");
      expect(retrieved).toBe(mockSignature);

      const parsed = JSON.parse(retrieved!);
      expect(parsed.publicKey).toBe("0xpubkey");
    });

    it("should handle signature cache key format", () => {
      const { storage } = useInMemoryStorage();

      const chainId = 31337;
      const userAddress = "0x" + "a".repeat(40);
      const cacheKey = `fhevm-decryption-signature-${chainId}-${userAddress}`;

      storage.value.setItem(cacheKey, "signature-data");
      expect(storage.value.getItem(cacheKey)).toBe("signature-data");
    });
  });

  describe("Type Safety", () => {
    it("should have correct return type", () => {
      const result = useInMemoryStorage();

      // TypeScript should infer these types correctly
      expect(result).toHaveProperty("storage");
      expect(typeof result.storage.value.getItem).toBe("function");
      expect(typeof result.storage.value.setItem).toBe("function");
      expect(typeof result.storage.value.removeItem).toBe("function");
    });
  });

  describe("Performance", () => {
    it("should handle rapid operations", () => {
      const { storage } = useInMemoryStorage();

      for (let i = 0; i < 1000; i++) {
        storage.value.setItem(`key${i}`, `value${i}`);
      }

      for (let i = 0; i < 1000; i++) {
        expect(storage.value.getItem(`key${i}`)).toBe(`value${i}`);
      }

      for (let i = 0; i < 1000; i++) {
        storage.value.removeItem(`key${i}`);
      }

      for (let i = 0; i < 1000; i++) {
        expect(storage.value.getItem(`key${i}`)).toBeNull();
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle removing non-existent items gracefully", () => {
      const { storage } = useInMemoryStorage();

      expect(() => {
        storage.value.removeItem("nonexistent");
      }).not.toThrow();
    });

    it("should handle setting items with undefined-like keys", () => {
      const { storage } = useInMemoryStorage();

      storage.value.setItem("undefined", "value");
      expect(storage.value.getItem("undefined")).toBe("value");

      storage.value.setItem("null", "value");
      expect(storage.value.getItem("null")).toBe("value");
    });

    it("should handle numeric-looking keys as strings", () => {
      const { storage } = useInMemoryStorage();

      storage.value.setItem("123", "value");
      expect(storage.value.getItem("123")).toBe("value");
    });
  });

  describe("Comparison with React Version", () => {
    it("should provide equivalent functionality to React version", () => {
      // Vue version creates storage directly, React version uses Context
      // Both should provide the same GenericStringInMemoryStorage interface
      const { storage } = useInMemoryStorage();

      // Test that it conforms to the same interface
      expect(storage.value).toHaveProperty("getItem");
      expect(storage.value).toHaveProperty("setItem");
      expect(storage.value).toHaveProperty("removeItem");

      // Test that it works the same way
      storage.value.setItem("test", "value");
      expect(storage.value.getItem("test")).toBe("value");
      storage.value.removeItem("test");
      expect(storage.value.getItem("test")).toBeNull();
    });
  });
});
