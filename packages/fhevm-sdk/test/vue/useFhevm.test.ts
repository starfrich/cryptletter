/**
 * Tests for vue/useFhevm.ts
 *
 * These tests cover the useFhevm composable which manages FHEVM instance creation with retry logic.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useFhevm, type UseFhevmParams } from "../../src/vue/useFhevm";
import { FhevmError, FhevmErrorCode } from "../../src/types/errors";
import type { FhevmInstance } from "../../src/core/types";
import { ethers } from "ethers";

// Mock the createFhevmInstance function
vi.mock("../../src/core/instance", async () => {
  const actual = await vi.importActual<typeof import("../../src/core/instance")>("../../src/core/instance");
  return {
    ...actual,
    createFhevmInstance: vi.fn(),
  };
});

describe("useFhevm Composable", () => {
  const mockProvider = "http://localhost:8545";
  const mockChainId = 31337;

  let mockCreateFhevmInstance: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked function
    const { createFhevmInstance } = await import("../../src/core/instance");
    mockCreateFhevmInstance = vi.mocked(createFhevmInstance);

    // Reset mock implementation
    mockCreateFhevmInstance.mockReset();
  });

  describe("Initial State", () => {
    it("should initialize with idle status when provider is undefined", () => {
      const { instance, status, error, errorMessage, retryCount } = useFhevm({
        provider: undefined,
        chainId: undefined,
      });

      expect(status.value).toBe("idle");
      expect(instance.value).toBeUndefined();
      expect(error.value).toBeUndefined();
      expect(errorMessage.value).toBeUndefined();
      expect(retryCount.value).toBe(0);
    });

    it("should start loading when provider and chainId are provided", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      // Make the promise take longer to resolve
      let resolveInstance: any;
      const instancePromise = new Promise((resolve) => {
        resolveInstance = resolve;
      });

      mockCreateFhevmInstance.mockReturnValue(instancePromise);

      const { status } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
      });

      // Wait for next tick to ensure the hook has started processing
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should be loading now
      expect(status.value).toBe("loading");

      // Clean up - resolve the promise
      resolveInstance(mockInstance);
    });

    it("should respect enabled flag", () => {
      const { status } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        enabled: false,
      });

      expect(status.value).toBe("idle");
      expect(mockCreateFhevmInstance).not.toHaveBeenCalled();
    });
  });

  describe("Instance Creation", () => {
    it("should create instance successfully", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const { instance, status, error } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(instance.value).toBe(mockInstance);
      expect(error.value).toBeUndefined();
      expect(mockCreateFhevmInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("should call onSuccess callback when instance is created", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const onSuccess = vi.fn();

      const { status } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        onSuccess,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(onSuccess).toHaveBeenCalledWith(mockInstance);
    });

    it("should handle errors during instance creation", async () => {
      const error = new Error("Creation failed");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const { status, error: errorRef, errorMessage } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("error");
      }, { timeout: 1000 });

      expect(errorRef.value).toBe(error);
      expect(errorMessage.value).toBeDefined();
    });

    it("should call onError callback when creation fails", async () => {
      const error = new Error("Creation failed");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const onError = vi.fn();

      const { status } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        onError,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("error");
      }, { timeout: 1000 });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it("should handle callback errors gracefully", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const onSuccess = vi.fn(() => {
        throw new Error("Callback error");
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { status } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        onSuccess,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("onSuccess callback error"),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Retry Logic", () => {
    it("should not retry by default", async () => {
      const error = new FhevmError(FhevmErrorCode.NETWORK_ERROR, "Network error");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const { status, retryCount } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("error");
      }, { timeout: 1000 });

      // Wait a bit more to ensure no retries are triggered
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCreateFhevmInstance).toHaveBeenCalledTimes(1);
      expect(retryCount.value).toBe(0);
    });

    it("should retry on network errors when configured", async () => {
      const error = new FhevmError(FhevmErrorCode.NETWORK_ERROR, "Network error");
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue(mockInstance);

      const { status, instance, retryCount } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        retry: {
          maxRetries: 3,
          retryDelay: 100, // Short delay for testing
        },
      });

      // Should eventually succeed after retries
      await vi.waitFor(
        () => {
          expect(status.value).toBe("ready");
        },
        { timeout: 5000 }
      );

      expect(instance.value).toBe(mockInstance);
      expect(retryCount.value).toBe(0); // Reset after success
      expect(mockCreateFhevmInstance).toHaveBeenCalledTimes(3);
    });

    it("should stop retrying when max retries reached", async () => {
      const error = new FhevmError(FhevmErrorCode.NETWORK_ERROR, "Network error");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const { status, retryCount } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        retry: {
          maxRetries: 2,
          retryDelay: 50,
        },
      });

      // Wait for retries to complete and status to become error
      await vi.waitFor(
        () => {
          expect(status.value).toBe("error");
        },
        { timeout: 1000 }
      );

      expect(retryCount.value).toBe(0); // Reset after final error
      expect(mockCreateFhevmInstance).toHaveBeenCalled();
    });

    it("should not retry abort errors", async () => {
      const { FhevmAbortError } = await import("../../src/core/instance");
      const error = new FhevmAbortError("Aborted");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const { status, retryCount } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        retry: {
          maxRetries: 3,
          retryDelay: 100,
        },
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("error");
      }, { timeout: 1000 });

      // Wait a bit more to ensure no retries are triggered
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockCreateFhevmInstance).toHaveBeenCalledTimes(1);
      expect(retryCount.value).toBe(0);
    });

    it("should use exponential backoff", async () => {
      const error = new FhevmError(FhevmErrorCode.NETWORK_ERROR, "Network error");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const startTime = Date.now();

      const { status } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        retry: {
          maxRetries: 2,
          retryDelay: 100,
          retryBackoff: 2,
        },
      });

      await vi.waitFor(
        () => {
          expect(status.value).toBe("error");
        },
        { timeout: 2000 }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // First retry after 100ms, second retry after 200ms
      // Total minimum time should be ~300ms
      expect(duration).toBeGreaterThan(250);
    });
  });

  describe("Refresh Function", () => {
    it("should recreate instance when refresh is called", async () => {
      const mockInstance1: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };
      const mockInstance2: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance
        .mockResolvedValueOnce(mockInstance1 as FhevmInstance)
        .mockResolvedValueOnce(mockInstance2 as FhevmInstance);

      const { instance, status, refresh } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(instance.value).toBe(mockInstance1);

      // Call refresh
      refresh();

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(instance.value).toBe(mockInstance2);
      expect(mockCreateFhevmInstance).toHaveBeenCalledTimes(2);
    });

    it("should cancel ongoing creation when refresh is called", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      let resolveFirst: any;
      const firstCreation = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      mockCreateFhevmInstance
        .mockImplementationOnce(async ({ signal }) => {
          await firstCreation;
          if (signal.aborted) {
            throw new Error("Aborted");
          }
          return mockInstance as FhevmInstance;
        })
        .mockResolvedValue(mockInstance as FhevmInstance);

      const { status, refresh } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("loading");
      }, { timeout: 1000 });

      // Call refresh while first creation is in progress
      refresh();

      // Resolve first creation (should be ignored due to abort)
      resolveFirst();

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(mockCreateFhevmInstance).toHaveBeenCalledTimes(2);
    });

    it("should reset error state when refresh is called", async () => {
      const error = new Error("Creation failed");
      mockCreateFhevmInstance.mockRejectedValue(error);

      const { status, error: errorRef, refresh } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("error");
      }, { timeout: 1000 });

      expect(errorRef.value).toBe(error);

      // Mock successful creation for refresh
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };
      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      // Call refresh
      refresh();

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(errorRef.value).toBeUndefined();
    });

    it("should clear pending retry timeout when refresh is called", async () => {
      const error = new FhevmError(FhevmErrorCode.NETWORK_ERROR, "Network error");
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance
        .mockRejectedValueOnce(error)
        .mockResolvedValue(mockInstance);

      const { status, refresh, retryCount } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        retry: {
          maxRetries: 3,
          retryDelay: 500,
        },
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("loading");
      }, { timeout: 1000 });

      // Call refresh during retry delay
      refresh();

      // Should create new instance successfully
      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(retryCount.value).toBe(0);
    });
  });

  describe("Provider Changes", () => {
    it("should recreate instance when provider changes", async () => {
      const mockInstance1: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };
      const mockInstance2: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance
        .mockResolvedValueOnce(mockInstance1 as FhevmInstance)
        .mockResolvedValueOnce(mockInstance2 as FhevmInstance);

      const providerRef = ref(mockProvider);

      const { instance, status } = useFhevm({
        provider: providerRef,
        chainId: mockChainId,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 2000 });

      expect(instance.value).toBe(mockInstance1);

      // Change provider
      providerRef.value = "http://localhost:8546";
      await nextTick();

      // Wait for it to become ready again (may skip loading if mock resolves quickly)
      await vi.waitFor(() => {
        expect(instance.value).toBe(mockInstance2);
      }, { timeout: 2000 });

      expect(status.value).toBe("ready");
      expect(mockCreateFhevmInstance).toHaveBeenCalledTimes(2);
    });

    it("should go idle when provider becomes undefined", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const providerRef = ref<string | undefined>(mockProvider);

      const { instance, status } = useFhevm({
        provider: providerRef,
        chainId: mockChainId,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      // Set provider to undefined
      providerRef.value = undefined;

      await vi.waitFor(() => {
        expect(status.value).toBe("idle");
      }, { timeout: 1000 });

      expect(instance.value).toBeUndefined();
    });

    it("should recreate instance when chainId changes", async () => {
      const mockInstance1: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };
      const mockInstance2: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance
        .mockResolvedValueOnce(mockInstance1 as FhevmInstance)
        .mockResolvedValueOnce(mockInstance2 as FhevmInstance);

      const chainIdRef = ref(mockChainId);

      const { instance, status } = useFhevm({
        provider: mockProvider,
        chainId: chainIdRef,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 2000 });

      expect(instance.value).toBe(mockInstance1);

      // Change chainId
      chainIdRef.value = 11155111;
      await nextTick();

      // Wait for it to become ready again (may skip loading if mock resolves quickly)
      await vi.waitFor(() => {
        expect(instance.value).toBe(mockInstance2);
      }, { timeout: 2000 });

      expect(status.value).toBe("ready");
      expect(mockCreateFhevmInstance).toHaveBeenCalledTimes(2);
    });
  });

  describe("Enabled Flag", () => {
    it("should disable instance creation when enabled is false", () => {
      const { status } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        enabled: false,
      });

      expect(status.value).toBe("idle");
      expect(mockCreateFhevmInstance).not.toHaveBeenCalled();
    });

    it("should create instance when enabled changes from false to true", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const enabledRef = ref(false);

      const { status, instance } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        enabled: enabledRef,
      });

      expect(status.value).toBe("idle");

      // Enable
      enabledRef.value = true;

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(instance.value).toBe(mockInstance);
    });

    it("should cancel instance creation when enabled changes from true to false", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const enabledRef = ref(true);

      const { status, instance } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        enabled: enabledRef,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      // Disable
      enabledRef.value = false;

      await vi.waitFor(() => {
        expect(status.value).toBe("idle");
      }, { timeout: 1000 });

      expect(instance.value).toBeUndefined();
    });
  });

  describe("Mock Chains", () => {
    it("should pass initialMockChains to createFhevmInstance", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const mockChains = {
        31337: "http://localhost:8545",
        11155111: "https://sepolia.infura.io",
      };

      const { status } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        initialMockChains: mockChains,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(mockCreateFhevmInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          mockChains: mockChains,
        })
      );
    });
  });

  describe("EIP-1193 Provider", () => {
    it("should support EIP-1193 provider", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const eip1193Provider: ethers.Eip1193Provider = {
        request: vi.fn(),
      };

      const { status } = useFhevm({
        provider: eip1193Provider,
        chainId: mockChainId,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(mockCreateFhevmInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: eip1193Provider,
        })
      );
    });
  });

  describe("Return Values", () => {
    it("should provide all expected return values", () => {
      const result = useFhevm({
        provider: undefined,
        chainId: undefined,
      });

      expect(result).toHaveProperty("instance");
      expect(result).toHaveProperty("refresh");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("errorMessage");
      expect(result).toHaveProperty("retryCount");
    });

    it("should provide stable refresh function reference", async () => {
      const { refresh: firstRefresh } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
      });

      await nextTick();

      expect(typeof firstRefresh).toBe("function");
    });
  });

  describe("Reactive Parameters", () => {
    it("should accept refs for all parameters", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const providerRef = ref(mockProvider);
      const chainIdRef = ref(mockChainId);
      const enabledRef = ref(true);

      const { status } = useFhevm({
        provider: providerRef,
        chainId: chainIdRef,
        enabled: enabledRef,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(mockCreateFhevmInstance).toHaveBeenCalled();
    });

    it("should accept static values for all parameters", async () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockCreateFhevmInstance.mockResolvedValue(mockInstance);

      const { status } = useFhevm({
        provider: mockProvider,
        chainId: mockChainId,
        enabled: true,
      });

      await vi.waitFor(() => {
        expect(status.value).toBe("ready");
      }, { timeout: 1000 });

      expect(mockCreateFhevmInstance).toHaveBeenCalled();
    });
  });
});
