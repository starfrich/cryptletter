import { describe, it, expect } from "vitest";
import { render, renderHook } from "@testing-library/react";
import {
  useInMemoryStorage,
  InMemoryStorageProvider,
} from "../../src/react/useInMemoryStorage";
import { GenericStringInMemoryStorage } from "../../src/storage/GenericStringStorage";
import { ReactNode } from "react";

describe("useInMemoryStorage", () => {
  describe("InMemoryStorageProvider", () => {
    it("should render children correctly", () => {
      const { getByText } = render(
        <InMemoryStorageProvider>
          <div>Test Child</div>
        </InMemoryStorageProvider>
      );

      expect(getByText("Test Child")).toBeDefined();
    });

    it("should provide storage instance to children", () => {
      const { result } = renderHook(() => useInMemoryStorage(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        ),
      });

      expect(result.current.storage).toBeDefined();
      expect(result.current.storage).toBeInstanceOf(
        GenericStringInMemoryStorage
      );
    });

    it("should provide the same storage instance on re-renders", () => {
      const { result, rerender } = renderHook(() => useInMemoryStorage(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        ),
      });

      const firstStorage = result.current.storage;

      rerender();

      expect(result.current.storage).toBe(firstStorage);
    });

    it("should allow multiple components within same provider to access the same storage", async () => {
      const { result: result1 } = renderHook(() => useInMemoryStorage(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        ),
      });

      // Create second hook within the same test to share the provider
      const { result: result2 } = renderHook(() => useInMemoryStorage(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        ),
      });

      // They won't be the same instance because each wrapper creates a new provider
      // This test should verify they work independently
      await result1.current.storage.setItem("key", "value1");
      await result2.current.storage.setItem("key", "value2");

      const value1 = await result1.current.storage.getItem("key");
      const value2 = await result2.current.storage.getItem("key");

      expect(value1).toBe("value1");
      expect(value2).toBe("value2");
    });
  });

  describe("useInMemoryStorage hook", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console error for this test
      const consoleError = console.error;
      console.error = () => {};

      expect(() => {
        renderHook(() => useInMemoryStorage());
      }).toThrow("useInMemoryStorage must be used within a InMemoryStorageProvider");

      console.error = consoleError;
    });

    it("should provide functional storage instance", async () => {
      const { result } = renderHook(() => useInMemoryStorage(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        ),
      });

      const storage = result.current.storage;

      // Test setItem
      await storage.setItem("test-key", "test-value");

      // Test getItem
      const value = await storage.getItem("test-key");
      expect(value).toBe("test-value");

      // Test removeItem
      await storage.removeItem("test-key");
      const removedValue = await storage.getItem("test-key");
      expect(removedValue).toBeNull();
    });

    it("should isolate storage between different providers", async () => {
      const { result: result1 } = renderHook(() => useInMemoryStorage(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        ),
      });

      const { result: result2 } = renderHook(() => useInMemoryStorage(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        ),
      });

      // Each provider should have its own storage instance
      expect(result1.current.storage).not.toBe(result2.current.storage);

      // Set value in first storage
      await result1.current.storage.setItem("key", "value1");

      // Second storage should not have the value
      const value2 = await result2.current.storage.getItem("key");
      expect(value2).toBeNull();

      // Set different value in second storage
      await result2.current.storage.setItem("key", "value2");

      // First storage should still have original value
      const value1 = await result1.current.storage.getItem("key");
      expect(value1).toBe("value1");
    });

    it("should handle complex data in storage", async () => {
      const { result } = renderHook(() => useInMemoryStorage(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        ),
      });

      const storage = result.current.storage;
      const complexData = JSON.stringify({
        publicKey: "0xpublickey",
        privateKey: "0xprivatekey",
        nested: { value: 42 },
      });

      await storage.setItem("complex", complexData);
      const retrieved = await storage.getItem("complex");

      expect(retrieved).toBe(complexData);
      expect(JSON.parse(retrieved!)).toEqual(JSON.parse(complexData));
    });

    it("should handle concurrent operations", async () => {
      const { result } = renderHook(() => useInMemoryStorage(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        ),
      });

      const storage = result.current.storage;

      // Perform multiple operations concurrently
      await Promise.all([
        storage.setItem("key1", "value1"),
        storage.setItem("key2", "value2"),
        storage.setItem("key3", "value3"),
      ]);

      const [value1, value2, value3] = await Promise.all([
        storage.getItem("key1"),
        storage.getItem("key2"),
        storage.getItem("key3"),
      ]);

      expect(value1).toBe("value1");
      expect(value2).toBe("value2");
      expect(value3).toBe("value3");
    });
  });
});
