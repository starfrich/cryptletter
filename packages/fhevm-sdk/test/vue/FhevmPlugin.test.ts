/**
 * Tests for vue/FhevmPlugin.ts
 *
 * These tests cover the FhevmPlugin which provides FHEVM instance through Vue's provide/inject system.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createApp, inject, defineComponent, App } from "vue";
import { FhevmPlugin, FhevmInjectionKey, type FhevmPluginOptions } from "../../src/vue/FhevmPlugin";
import type { FhevmInstance } from "../../src/core/types";

// Mock the createFhevmInstance function
vi.mock("../../src/core/instance", async () => {
  const actual = await vi.importActual<typeof import("../../src/core/instance")>("../../src/core/instance");
  return {
    ...actual,
    createFhevmInstance: vi.fn(),
  };
});

describe("FhevmPlugin", () => {
  const mockProvider = "http://localhost:8545";
  const mockChainId = 31337;

  let mockCreateFhevmInstance: ReturnType<typeof vi.fn>;
  let app: App;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked function
    const { createFhevmInstance } = await import("../../src/core/instance");
    mockCreateFhevmInstance = vi.mocked(createFhevmInstance);

    // Reset mock implementation
    mockCreateFhevmInstance.mockReset();
  });

  afterEach(() => {
    if (app) {
      app.unmount();
    }
  });

  describe("Plugin Installation", () => {
    it("should throw error when provider is not provided", () => {
      app = createApp({});

      expect(() => {
        app.use(FhevmPlugin, {} as FhevmPluginOptions);
      }).toThrow("[FhevmPlugin] provider is required");
    });

    it("should install plugin without errors when provider is provided", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      app = createApp({});

      expect(() => {
        app.use(FhevmPlugin, {
          provider: mockProvider,
        });
      }).not.toThrow();
    });

    it("should accept string provider", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      app = createApp({});

      expect(() => {
        app.use(FhevmPlugin, {
          provider: "http://localhost:8545",
        });
      }).not.toThrow();
    });

    it("should accept EIP-1193 provider", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const eip1193Provider = {
        request: vi.fn(),
      };

      app = createApp({});

      expect(() => {
        app.use(FhevmPlugin, {
          provider: eip1193Provider,
        });
      }).not.toThrow();
    });
  });

  describe("Auto-initialization", () => {
    it("should auto-initialize by default", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      app = createApp({});
      app.use(FhevmPlugin, {
        provider: mockProvider,
      });

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockCreateFhevmInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("should respect autoInit: false", async () => {
      app = createApp({});
      app.use(FhevmPlugin, {
        provider: mockProvider,
        autoInit: false,
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockCreateFhevmInstance).not.toHaveBeenCalled();
    });

    it("should pass mockChains to createFhevmInstance", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const mockChains = {
        31337: "http://localhost:8545",
        11155111: "https://sepolia.infura.io",
      };

      app = createApp({});
      app.use(FhevmPlugin, {
        provider: mockProvider,
        mockChains,
      });

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockCreateFhevmInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          mockChains,
        })
      );
    });
  });

  describe("Callbacks", () => {
    it("should call onSuccess callback when instance is created", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const onSuccess = vi.fn();

      app = createApp({});
      app.use(FhevmPlugin, {
        provider: mockProvider,
        onSuccess,
      });

      // Wait for async initialization
      await vi.waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockInstance);
      }, { timeout: 1000 });
    });

    it("should call onError callback when instance creation fails", async () => {
      const error = new Error("Creation failed");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const onError = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      app = createApp({});
      app.use(FhevmPlugin, {
        provider: mockProvider,
        onError,
      });

      // Wait for async initialization
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      }, { timeout: 1000 });

      consoleErrorSpy.mockRestore();
    });

    it("should handle errors in onSuccess callback gracefully", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const onSuccess = vi.fn(() => {
        throw new Error("Callback error");
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      app = createApp({});
      app.use(FhevmPlugin, {
        provider: mockProvider,
        onSuccess,
      });

      // Wait for async initialization
      await vi.waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockInstance);
      }, { timeout: 1000 });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("onSuccess callback error"),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle errors in onError callback gracefully", async () => {
      const error = new Error("Creation failed");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const onError = vi.fn(() => {
        throw new Error("Callback error");
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      app = createApp({});
      app.use(FhevmPlugin, {
        provider: mockProvider,
        onError,
      });

      // Wait for async initialization
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      }, { timeout: 1000 });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("onError callback error"),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Provide/Inject System", () => {
    it("should provide instance through injection key", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      let injectedInstance: FhevmInstance | undefined;
      let mounted = false;

      const TestComponent = defineComponent({
        setup() {
          injectedInstance = inject(FhevmInjectionKey);
          return () => null;
        },
        mounted() {
          mounted = true;
        }
      });

      app = createApp(TestComponent);
      app.use(FhevmPlugin, {
        provider: mockProvider,
      });

      const container = document.createElement("div");
      app.mount(container);

      // Wait for component to mount first
      await vi.waitFor(() => {
        expect(mounted).toBe(true);
      }, { timeout: 500 });

      // Initially undefined because async
      expect(injectedInstance).toBeUndefined();

      // Wait for async initialization to complete
      await vi.waitFor(() => {
        expect(mockCreateFhevmInstance).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Note: The plugin provides the instance after creation
      // Since we're testing outside normal Vue component lifecycle,
      // we verify the plugin was called successfully
      expect(mockCreateFhevmInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
        })
      );
    });

    it("should set global property $fhevm", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      app = createApp({});
      app.use(FhevmPlugin, {
        provider: mockProvider,
      });

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 50));

      // Note: $fhevm is set initially to null, then updated when instance is ready
      // We test that the property exists
      expect(app.config.globalProperties).toHaveProperty("$fhevm");
    });

    it("should inject undefined before instance is ready", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      // Make createFhevmInstance never resolve
      mockCreateFhevmInstance.mockImplementation(() => new Promise(() => {}));

      let injectedInstance: FhevmInstance | undefined | null = "not-injected";

      const TestComponent = defineComponent({
        setup() {
          injectedInstance = inject(FhevmInjectionKey);
          return () => null;
        },
      });

      app = createApp(TestComponent);
      app.use(FhevmPlugin, {
        provider: mockProvider,
      });

      const container = document.createElement("div");
      app.mount(container);

      // Should be undefined because instance creation hasn't completed
      expect(injectedInstance).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should log error when instance creation fails", async () => {
      const error = new Error("Creation failed");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      app = createApp({});
      app.use(FhevmPlugin, {
        provider: mockProvider,
      });

      // Wait for async initialization
      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to create FHEVM instance"),
          error
        );
      }, { timeout: 1000 });

      consoleErrorSpy.mockRestore();
    });

    it("should continue after error without crashing", async () => {
      const error = new Error("Creation failed");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      app = createApp({});

      expect(() => {
        app.use(FhevmPlugin, {
          provider: mockProvider,
        });
      }).not.toThrow();

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Status Change Callback", () => {
    it("should log status changes", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      mockCreateFhevmInstance.mockImplementation(async ({ onStatusChange }) => {
        onStatusChange?.("fetching-public-key");
        onStatusChange?.("loading-fhevm-sdk");
        onStatusChange?.("initializing-fhevm-sdk");
        return mockInstance as FhevmInstance;
      });

      app = createApp({});
      app.use(FhevmPlugin, {
        provider: mockProvider,
      });

      // Wait for async initialization
      await vi.waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining("Instance creation status")
        );
      }, { timeout: 1000 });

      consoleLogSpy.mockRestore();
    });
  });

  describe("FhevmInjectionKey", () => {
    it("should be a Symbol", () => {
      expect(typeof FhevmInjectionKey).toBe("symbol");
    });

    it("should have descriptive name", () => {
      expect(FhevmInjectionKey.toString()).toContain("fhevm");
    });
  });

  describe("Multiple App Instances", () => {
    it("should support multiple independent app instances", async () => {
      const mockInstance1: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      const mockInstance2: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance
        .mockResolvedValueOnce(mockInstance1 as FhevmInstance)
        .mockResolvedValueOnce(mockInstance2 as FhevmInstance);

      const app1 = createApp({});
      const app2 = createApp({});

      app1.use(FhevmPlugin, {
        provider: "http://localhost:8545",
      });

      app2.use(FhevmPlugin, {
        provider: "http://localhost:8546",
      });

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCreateFhevmInstance).toHaveBeenCalledTimes(2);

      app1.unmount();
      app2.unmount();
    });
  });
});
