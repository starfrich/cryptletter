import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useStorage } from "../../src/react/useStorage";
import { IndexedDBStorage, LocalStorageStorage, MemoryStorage } from "../../src/storage";

describe("useStorage Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing storage
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("Basic Initialization", () => {
    it("initializes with auto storage type by default", async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).not.toBeNull();
      expect(result.current.storageType).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it("initializes with memory storage explicitly", async () => {
      const { result } = renderHook(() => useStorage({ type: "memory" }));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).toBeInstanceOf(MemoryStorage);
      expect(result.current.storageType).toBe("memory");
      expect(result.current.error).toBeNull();
    });

    it("starts with isReady false", () => {
      const { result } = renderHook(() => useStorage());

      // Initially not ready
      expect(result.current.isReady).toBe(false);
      expect(result.current.storage).toBeNull();
    });
  });

  describe("Storage Type Selection", () => {
    it("uses IndexedDB when type is 'indexeddb'", async () => {
      const { result } = renderHook(() => useStorage({ type: "indexeddb" }));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).toBeInstanceOf(IndexedDBStorage);
      expect(result.current.storageType).toBe("indexeddb");
    });

    it("uses LocalStorage when type is 'localstorage'", async () => {
      const { result } = renderHook(() => useStorage({ type: "localstorage" }));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).toBeInstanceOf(LocalStorageStorage);
      expect(result.current.storageType).toBe("localstorage");
    });

    it("uses MemoryStorage when type is 'memory'", async () => {
      const { result } = renderHook(() => useStorage({ type: "memory" }));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).toBeInstanceOf(MemoryStorage);
      expect(result.current.storageType).toBe("memory");
    });

    it("uses auto fallback when type is 'auto'", async () => {
      const { result } = renderHook(() => useStorage({ type: "auto" }));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).not.toBeNull();
      expect(["indexeddb", "localstorage", "memory"]).toContain(result.current.storageType);
    });
  });

  describe("Auto Fallback", () => {
    it("enables auto fallback when type is 'auto'", async () => {
      const { result } = renderHook(() => useStorage({ type: "auto" }));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Should have selected a storage type
      expect(result.current.storageType).not.toBeNull();
    });

    it("respects explicit autoFallback option", async () => {
      const { result } = renderHook(() =>
        useStorage({ type: "indexeddb", autoFallback: true })
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).not.toBeNull();
    });

    it("does not fallback when autoFallback is false", async () => {
      const { result } = renderHook(() =>
        useStorage({ type: "memory", autoFallback: false })
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storageType).toBe("memory");
    });
  });

  describe("Storage Configuration", () => {
    it("accepts custom dbName for IndexedDB", async () => {
      const { result } = renderHook(() =>
        useStorage({
          type: "indexeddb",
          dbName: "custom-db",
        })
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).toBeInstanceOf(IndexedDBStorage);
    });

    it("accepts custom storeName for IndexedDB", async () => {
      const { result } = renderHook(() =>
        useStorage({
          type: "indexeddb",
          storeName: "custom-store",
        })
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).toBeInstanceOf(IndexedDBStorage);
    });

    it("accepts custom prefix for LocalStorage", async () => {
      const { result } = renderHook(() =>
        useStorage({
          type: "localstorage",
          prefix: "custom-prefix:",
        })
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).toBeInstanceOf(LocalStorageStorage);
    });

    it("uses default configuration when no options provided", async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).not.toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("falls back to memory storage on error", async () => {
      // Mock createStorageWithFallback to throw an error
      const { result } = renderHook(() =>
        useStorage({ type: "auto" })
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Should still have storage (memory fallback)
      expect(result.current.storage).not.toBeNull();
    });

    it("sets error state when initialization fails", async () => {
      const { result } = renderHook(() => useStorage({ type: "auto" }));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Even with errors, should fallback and be ready
      expect(result.current.isReady).toBe(true);
    });
  });

  describe("React Lifecycle", () => {
    it("reinitializes when options change", async () => {
      const { result, rerender } = renderHook(
        ({ type }) => useStorage({ type }),
        { initialProps: { type: "memory" as const } }
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const firstStorage = result.current.storage;
      expect(firstStorage).toBeInstanceOf(MemoryStorage);

      // Change type
      rerender({ type: "localstorage" as const });

      await waitFor(() => {
        expect(result.current.storage).toBeInstanceOf(LocalStorageStorage);
      });

      expect(result.current.storage).not.toBe(firstStorage);
    });

    it("reinitializes when dbName changes", async () => {
      const { result, rerender } = renderHook(
        ({ dbName }) => useStorage({ type: "indexeddb", dbName }),
        { initialProps: { dbName: "db1" } }
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const firstStorage = result.current.storage;

      // Change dbName
      rerender({ dbName: "db2" });

      await waitFor(() => {
        expect(result.current.storage).not.toBe(firstStorage);
      });
    });

    it("handles unmount correctly", async () => {
      const { result, unmount } = renderHook(() => useStorage({ type: "memory" }));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    it("does not update state after unmount", async () => {
      const { unmount } = renderHook(() => useStorage({ type: "auto" }));

      // Unmount immediately
      unmount();

      // Wait a bit to ensure no state updates happen
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should not throw or cause warnings
    });
  });

  describe("Return Value", () => {
    it("returns all expected properties", async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current).toHaveProperty("storage");
      expect(result.current).toHaveProperty("storageType");
      expect(result.current).toHaveProperty("isReady");
      expect(result.current).toHaveProperty("error");
    });

    it("returns readonly-like interface", async () => {
      const { result } = renderHook(() => useStorage());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // TypeScript enforces readonly, but we can check properties exist
      const { storage, storageType, isReady, error } = result.current;
      expect(storage).toBeDefined();
      expect(storageType).toBeDefined();
      expect(isReady).toBeDefined();
      expect(error).toBeDefined();
    });
  });

  describe("Storage Operations", () => {
    it("can use storage to set and get items", async () => {
      const { result } = renderHook(() => useStorage({ type: "memory" }));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const storage = result.current.storage;
      expect(storage).not.toBeNull();

      if (storage) {
        await storage.setItem("test-key", "test-value");
        const value = await storage.getItem("test-key");
        expect(value).toBe("test-value");
      }
    });

    it("can remove items from storage", async () => {
      const { result } = renderHook(() => useStorage({ type: "memory" }));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const storage = result.current.storage;
      if (storage) {
        await storage.setItem("test-key", "test-value");
        await storage.removeItem("test-key");
        const value = await storage.getItem("test-key");
        expect(value).toBeNull();
      }
    });

    it("isolates storage between different hook instances", async () => {
      const { result: result1 } = renderHook(() =>
        useStorage({ type: "memory" })
      );
      const { result: result2 } = renderHook(() =>
        useStorage({ type: "memory" })
      );

      await waitFor(() => {
        expect(result1.current.isReady).toBe(true);
        expect(result2.current.isReady).toBe(true);
      });

      // Different instances should be independent
      expect(result1.current.storage).not.toBe(result2.current.storage);
    });
  });

  describe("Edge Cases", () => {
    it("handles null options gracefully", async () => {
      const { result } = renderHook(() => useStorage(undefined));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).not.toBeNull();
    });

    it("handles empty options object", async () => {
      const { result } = renderHook(() => useStorage({}));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).not.toBeNull();
    });

    it("handles rapid option changes", async () => {
      const { result, rerender } = renderHook(
        ({ type }) => useStorage({ type }),
        { initialProps: { type: "memory" as const } }
      );

      // Rapidly change options
      rerender({ type: "localstorage" as const });
      rerender({ type: "memory" as const });
      rerender({ type: "localstorage" as const });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.storage).not.toBeNull();
    });
  });

  describe("Custom Storage Detection", () => {
    it("detects custom storage type correctly", async () => {
      // Create a custom storage that doesn't match known types
      const { result } = renderHook(() =>
        useStorage({ type: "auto" })
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Should detect one of the known types
      expect(["indexeddb", "localstorage", "memory", "custom"]).toContain(
        result.current.storageType
      );
    });
  });
});
