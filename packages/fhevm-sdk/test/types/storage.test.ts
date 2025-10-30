import { describe, it, expect, vi } from "vitest";
import type {
  IFhevmStorage,
  GenericStringStorage,
  StorageType,
  StorageOptions,
  StorageFactory,
} from "../../src/types/storage";

describe("types/storage", () => {
  describe("IFhevmStorage Interface", () => {
    it("implements async storage interface correctly", async () => {
      const mockStorage: IFhevmStorage = {
        getItem: vi.fn().mockResolvedValue("test-value"),
        setItem: vi.fn().mockResolvedValue(undefined),
        removeItem: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      };

      // Test getItem
      const value = await mockStorage.getItem("test-key");
      expect(value).toBe("test-value");
      expect(mockStorage.getItem).toHaveBeenCalledWith("test-key");

      // Test setItem
      await mockStorage.setItem("test-key", "new-value");
      expect(mockStorage.setItem).toHaveBeenCalledWith("test-key", "new-value");

      // Test removeItem
      await mockStorage.removeItem("test-key");
      expect(mockStorage.removeItem).toHaveBeenCalledWith("test-key");

      // Test clear
      await mockStorage.clear();
      expect(mockStorage.clear).toHaveBeenCalled();
    });

    it("returns null when key not found", async () => {
      const mockStorage: IFhevmStorage = {
        getItem: vi.fn().mockResolvedValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      const value = await mockStorage.getItem("nonexistent-key");
      expect(value).toBeNull();
    });

    it("handles storage operations sequentially", async () => {
      const storage: IFhevmStorage = {
        getItem: vi.fn().mockResolvedValue(null),
        setItem: vi.fn().mockResolvedValue(undefined),
        removeItem: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      };

      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");
      await storage.removeItem("key1");
      await storage.clear();

      expect(storage.setItem).toHaveBeenCalledTimes(2);
      expect(storage.removeItem).toHaveBeenCalledTimes(1);
      expect(storage.clear).toHaveBeenCalledTimes(1);
    });

    it("can be used for FHEVM data persistence", async () => {
      const storage: IFhevmStorage = {
        getItem: vi.fn().mockImplementation((key) => {
          if (key === "fhevm:publicKey") {
            return Promise.resolve('{"publicKeyId":"key123","publicKey":[1,2,3]}');
          }
          return Promise.resolve(null);
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      const publicKeyData = await storage.getItem("fhevm:publicKey");
      expect(publicKeyData).toBeTruthy();

      const parsed = JSON.parse(publicKeyData!);
      expect(parsed.publicKeyId).toBe("key123");
      expect(parsed.publicKey).toEqual([1, 2, 3]);
    });
  });

  describe("GenericStringStorage Interface (Legacy)", () => {
    it("supports synchronous storage operations", () => {
      const syncStorage: GenericStringStorage = {
        getItem: vi.fn().mockReturnValue("sync-value"),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };

      const value = syncStorage.getItem("key");
      expect(value).toBe("sync-value");

      syncStorage.setItem("key", "new-value");
      expect(syncStorage.setItem).toHaveBeenCalledWith("key", "new-value");

      syncStorage.removeItem("key");
      expect(syncStorage.removeItem).toHaveBeenCalledWith("key");
    });

    it("supports async storage operations with Promise", async () => {
      const asyncStorage: GenericStringStorage = {
        getItem: vi.fn().mockResolvedValue("async-value"),
        setItem: vi.fn().mockResolvedValue(undefined),
        removeItem: vi.fn().mockResolvedValue(undefined),
      };

      const value = await asyncStorage.getItem("key");
      expect(value).toBe("async-value");

      await asyncStorage.setItem("key", "new-value");
      expect(asyncStorage.setItem).toHaveBeenCalledWith("key", "new-value");

      await asyncStorage.removeItem("key");
      expect(asyncStorage.removeItem).toHaveBeenCalledWith("key");
    });

    it("supports mixed sync and async operations", async () => {
      const mixedStorage: GenericStringStorage = {
        getItem: vi.fn().mockReturnValue("sync-value"),
        setItem: vi.fn().mockResolvedValue(undefined),
        removeItem: vi.fn(),
      };

      // Sync operation
      const value = mixedStorage.getItem("key");
      expect(value).toBe("sync-value");

      // Async operation
      await mixedStorage.setItem("key", "new-value");
      expect(mixedStorage.setItem).toHaveBeenCalled();

      // Sync operation
      mixedStorage.removeItem("key");
      expect(mixedStorage.removeItem).toHaveBeenCalled();
    });

    it("returns null for missing keys", () => {
      const storage: GenericStringStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };

      const value = storage.getItem("missing");
      expect(value).toBeNull();
    });
  });

  describe("StorageType", () => {
    it("accepts all valid storage type values", () => {
      const types: StorageType[] = [
        "indexeddb",
        "localstorage",
        "memory",
        "custom",
      ];

      types.forEach((type) => {
        const storageType: StorageType = type;
        expect(storageType).toBe(type);
      });
    });

    it("can be used for type-based storage selection", () => {
      const selectStorage = (type: StorageType): string => {
        switch (type) {
          case "indexeddb":
            return "IndexedDB Storage";
          case "localstorage":
            return "LocalStorage Storage";
          case "memory":
            return "Memory Storage";
          case "custom":
            return "Custom Storage";
        }
      };

      expect(selectStorage("indexeddb")).toBe("IndexedDB Storage");
      expect(selectStorage("localstorage")).toBe("LocalStorage Storage");
      expect(selectStorage("memory")).toBe("Memory Storage");
      expect(selectStorage("custom")).toBe("Custom Storage");
    });
  });

  describe("StorageOptions", () => {
    it("accepts minimal configuration for IndexedDB", () => {
      const options: StorageOptions = {
        type: "indexeddb",
      };

      expect(options.type).toBe("indexeddb");
      expect(options.dbName).toBeUndefined();
      expect(options.storeName).toBeUndefined();
    });

    it("accepts full configuration for IndexedDB", () => {
      const options: StorageOptions = {
        type: "indexeddb",
        dbName: "my-app-db",
        storeName: "fhevm-keys",
      };

      expect(options.type).toBe("indexeddb");
      expect(options.dbName).toBe("my-app-db");
      expect(options.storeName).toBe("fhevm-keys");
    });

    it("accepts minimal configuration for LocalStorage", () => {
      const options: StorageOptions = {
        type: "localstorage",
      };

      expect(options.type).toBe("localstorage");
      expect(options.prefix).toBeUndefined();
    });

    it("accepts configuration with prefix for LocalStorage", () => {
      const options: StorageOptions = {
        type: "localstorage",
        prefix: "myapp:fhevm:",
      };

      expect(options.type).toBe("localstorage");
      expect(options.prefix).toBe("myapp:fhevm:");
    });

    it("accepts memory storage configuration", () => {
      const options: StorageOptions = {
        type: "memory",
      };

      expect(options.type).toBe("memory");
    });

    it("accepts custom storage configuration", () => {
      const customStorage: IFhevmStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      const options: StorageOptions = {
        type: "custom",
        custom: customStorage,
      };

      expect(options.type).toBe("custom");
      expect(options.custom).toBe(customStorage);
    });

    it("can have mixed optional fields", () => {
      const options: StorageOptions = {
        type: "indexeddb",
        dbName: "custom-db",
        // storeName is optional
        prefix: "custom-prefix:", // This field is for localStorage but won't cause issues
      };

      expect(options.type).toBe("indexeddb");
      expect(options.dbName).toBe("custom-db");
      expect(options.prefix).toBe("custom-prefix:");
    });

    it("validates custom storage is provided when type is custom", () => {
      const customStorage: IFhevmStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      const options: StorageOptions = {
        type: "custom",
        custom: customStorage,
      };

      // Runtime validation would happen in factory function
      const hasCustomStorage = options.type === "custom" && options.custom !== undefined;
      expect(hasCustomStorage).toBe(true);
    });
  });

  describe("StorageFactory", () => {
    it("creates storage with default options", () => {
      const factory: StorageFactory = (options) => {
        return {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        };
      };

      const storage = factory();
      expect(storage).toBeDefined();
      expect(storage.getItem).toBeDefined();
    });

    it("creates storage with custom options", () => {
      const factory: StorageFactory = (options) => {
        const dbName = options?.dbName || "default-db";
        const storeName = options?.storeName || "default-store";

        return {
          getItem: vi.fn().mockImplementation(async (key) => {
            return `${dbName}:${storeName}:${key}`;
          }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        };
      };

      const storage = factory({
        type: "indexeddb",
        dbName: "test-db",
        storeName: "test-store",
      });

      expect(storage).toBeDefined();
    });

    it("creates different storage types based on options", () => {
      const factory: StorageFactory = (options) => {
        const type = options?.type || "memory";

        const storage: IFhevmStorage = {
          getItem: vi.fn().mockImplementation(async () => `${type}-value`),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        };

        return storage;
      };

      const indexedDBStorage = factory({ type: "indexeddb" });
      const localStorageStorage = factory({ type: "localstorage" });
      const memoryStorage = factory({ type: "memory" });

      expect(indexedDBStorage).toBeDefined();
      expect(localStorageStorage).toBeDefined();
      expect(memoryStorage).toBeDefined();
    });

    it("handles partial options correctly", () => {
      const factory: StorageFactory = (options) => {
        const prefix = options?.prefix || "fhevm:";

        return {
          getItem: vi.fn().mockImplementation(async (key) => {
            return `${prefix}${key}`;
          }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        };
      };

      const storage1 = factory(); // Default prefix
      const storage2 = factory({ type: "localstorage", prefix: "custom:" }); // Custom prefix

      expect(storage1).toBeDefined();
      expect(storage2).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    it("IFhevmStorage can be used for complete storage lifecycle", async () => {
      const data = new Map<string, string>();

      const storage: IFhevmStorage = {
        getItem: async (key) => data.get(key) || null,
        setItem: async (key, value) => {
          data.set(key, value);
        },
        removeItem: async (key) => {
          data.delete(key);
        },
        clear: async () => {
          data.clear();
        },
      };

      // Initially empty
      expect(await storage.getItem("key1")).toBeNull();

      // Set values
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");

      // Retrieve values
      expect(await storage.getItem("key1")).toBe("value1");
      expect(await storage.getItem("key2")).toBe("value2");

      // Remove one value
      await storage.removeItem("key1");
      expect(await storage.getItem("key1")).toBeNull();
      expect(await storage.getItem("key2")).toBe("value2");

      // Clear all
      await storage.clear();
      expect(await storage.getItem("key2")).toBeNull();
    });

    it("factory creates functional storage implementation", async () => {
      const factory: StorageFactory = (options) => {
        const store = new Map<string, string>();
        const prefix = options?.prefix || "fhevm:";

        return {
          getItem: async (key) => store.get(`${prefix}${key}`) || null,
          setItem: async (key, value) => {
            store.set(`${prefix}${key}`, value);
          },
          removeItem: async (key) => {
            store.delete(`${prefix}${key}`);
          },
          clear: async () => {
            store.clear();
          },
        };
      };

      const storage = factory({ type: "memory", prefix: "test:" });

      await storage.setItem("publicKey", "0x1234");
      const value = await storage.getItem("publicKey");

      expect(value).toBe("0x1234");
    });

    it("storage can handle FHEVM-specific data types", async () => {
      const storage: IFhevmStorage = {
        getItem: vi.fn().mockImplementation(async (key) => {
          if (key === "fhevm:publicKey:11155111") {
            return JSON.stringify({
              publicKeyId: "key-id-123",
              publicKey: [1, 2, 3, 4, 5],
            });
          }
          if (key === "fhevm:signature:11155111") {
            return JSON.stringify({
              signature: "0xsig123",
              startTimestamp: 1700000000,
              durationDays: 30,
            });
          }
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      const publicKeyData = await storage.getItem("fhevm:publicKey:11155111");
      const signatureData = await storage.getItem("fhevm:signature:11155111");

      expect(publicKeyData).toBeTruthy();
      expect(signatureData).toBeTruthy();

      const publicKey = JSON.parse(publicKeyData!);
      const signature = JSON.parse(signatureData!);

      expect(publicKey.publicKeyId).toBe("key-id-123");
      expect(signature.signature).toBe("0xsig123");
    });

    it("storage options can be configured per environment", () => {
      const createStorageForEnv = (env: "browser" | "node"): StorageOptions => {
        if (env === "browser") {
          return {
            type: "indexeddb",
            dbName: "fhevm-browser-db",
            storeName: "fhevm-data",
          };
        } else {
          return {
            type: "memory", // Or file-based for Node.js
          };
        }
      };

      const browserOptions = createStorageForEnv("browser");
      const nodeOptions = createStorageForEnv("node");

      expect(browserOptions.type).toBe("indexeddb");
      expect(browserOptions.dbName).toBe("fhevm-browser-db");

      expect(nodeOptions.type).toBe("memory");
    });

    it("multiple storage instances can coexist with different configs", async () => {
      const createStorage = (prefix: string): IFhevmStorage => {
        const data = new Map<string, string>();
        return {
          getItem: async (key) => data.get(`${prefix}${key}`) || null,
          setItem: async (key, value) => {
            data.set(`${prefix}${key}`, value);
          },
          removeItem: async (key) => {
            data.delete(`${prefix}${key}`);
          },
          clear: async () => {
            data.clear();
          },
        };
      };

      const storage1 = createStorage("app1:");
      const storage2 = createStorage("app2:");

      await storage1.setItem("key", "value1");
      await storage2.setItem("key", "value2");

      // Values are isolated by prefix
      expect(await storage1.getItem("key")).toBe("value1");
      expect(await storage2.getItem("key")).toBe("value2");
    });
  });

  describe("Error Handling", () => {
    it("storage operations can handle errors gracefully", async () => {
      const storage: IFhevmStorage = {
        getItem: vi.fn().mockRejectedValue(new Error("Read failed")),
        setItem: vi.fn().mockRejectedValue(new Error("Write failed")),
        removeItem: vi.fn().mockRejectedValue(new Error("Delete failed")),
        clear: vi.fn().mockRejectedValue(new Error("Clear failed")),
      };

      await expect(storage.getItem("key")).rejects.toThrow("Read failed");
      await expect(storage.setItem("key", "value")).rejects.toThrow("Write failed");
      await expect(storage.removeItem("key")).rejects.toThrow("Delete failed");
      await expect(storage.clear()).rejects.toThrow("Clear failed");
    });

    it("storage quota exceeded scenario", async () => {
      const storage: IFhevmStorage = {
        getItem: vi.fn(),
        setItem: vi.fn().mockRejectedValue(new Error("QuotaExceededError")),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };

      await expect(storage.setItem("key", "large-value")).rejects.toThrow(
        "QuotaExceededError"
      );
    });

    it("storage not available scenario", async () => {
      const storage: IFhevmStorage = {
        getItem: vi.fn().mockRejectedValue(new Error("Storage not available")),
        setItem: vi.fn().mockRejectedValue(new Error("Storage not available")),
        removeItem: vi.fn().mockRejectedValue(new Error("Storage not available")),
        clear: vi.fn().mockRejectedValue(new Error("Storage not available")),
      };

      await expect(storage.getItem("key")).rejects.toThrow("Storage not available");
    });
  });
});
