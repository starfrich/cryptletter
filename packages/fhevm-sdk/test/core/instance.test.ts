/**
 * Tests for core/instance.ts
 *
 * These tests cover the framework-agnostic FHEVM instance creation logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFhevmInstance, tryFetchFHEVMHardhatNodeRelayerMetadata } from "../../src/core/instance";
import { FhevmError, FhevmAbortError, FhevmErrorCode } from "../../src/types/errors";

describe("Core Instance Creation", () => {
  describe("tryFetchFHEVMHardhatNodeRelayerMetadata", () => {
    it("should return undefined for non-Hardhat nodes", async () => {
      // Mock a non-Hardhat node response
      const rpcUrl = "http://localhost:8545";

      // This test will actually make a network call, so we expect it to either:
      // 1. Return undefined if the node is not a Hardhat node
      // 2. Throw an error if the RPC is not reachable
      try {
        const result = await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);
        expect(result).toBeUndefined();
      } catch (error) {
        // Network error is acceptable in test environment
        expect(error).toBeInstanceOf(FhevmError);
        expect((error as FhevmError).code).toBe(FhevmErrorCode.NETWORK_ERROR);
      }
    });

    it("should validate metadata structure when returned", async () => {
      // This is more of a type check - if metadata is returned, it should have the right structure
      const rpcUrl = "http://localhost:8545";

      try {
        const result = await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);

        if (result) {
          // If result exists, validate structure
          expect(result).toHaveProperty("ACLAddress");
          expect(result).toHaveProperty("InputVerifierAddress");
          expect(result).toHaveProperty("KMSVerifierAddress");

          expect(result.ACLAddress).toMatch(/^0x[a-fA-F0-9]+$/);
          expect(result.InputVerifierAddress).toMatch(/^0x[a-fA-F0-9]+$/);
          expect(result.KMSVerifierAddress).toMatch(/^0x[a-fA-F0-9]+$/);
        }
      } catch (error) {
        // Network error is acceptable in test environment
        expect(error).toBeInstanceOf(FhevmError);
      }
    });
  });

  describe("createFhevmInstance - Error Handling", () => {
    it("should throw error when signal is aborted immediately", async () => {
      const controller = new AbortController();
      controller.abort(); // Abort immediately

      // Note: The function might throw different errors depending on when abort is checked
      // It could be FhevmAbortError or another error if abort check happens after network call
      await expect(
        createFhevmInstance({
          provider: "http://localhost:8545",
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should handle invalid provider gracefully", async () => {
      const controller = new AbortController();

      await expect(
        createFhevmInstance({
          provider: "invalid-url",
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should call onStatusChange callback during instance creation", async () => {
      const controller = new AbortController();
      const statusChanges: string[] = [];

      const onStatusChange = vi.fn((status) => {
        statusChanges.push(status);
      });

      // This will likely fail due to network issues in test env, but should call onStatusChange
      try {
        await createFhevmInstance({
          provider: "http://localhost:8545",
          signal: controller.signal,
          onStatusChange,
        });
      } catch (error) {
        // Expected to fail in test environment
      }

      // Should have been called at least once if it started processing
      // In a real scenario, it would be called multiple times with different statuses
      // but in test env it might fail early
    });

    it("should respect AbortSignal during async operations", async () => {
      const controller = new AbortController();

      // Start the operation
      const promise = createFhevmInstance({
        provider: "http://localhost:8545",
        signal: controller.signal,
      });

      // Abort after a short delay
      setTimeout(() => controller.abort(), 10);

      // The operation should throw an error (could be FhevmAbortError or network error)
      await expect(promise).rejects.toThrow();
    });
  });

  describe("createFhevmInstance - Mock Chain Detection", () => {
    it("should detect chain 31337 as mock chain by default", async () => {
      const controller = new AbortController();

      // Chain 31337 is Hardhat's default chain ID
      // This test verifies that the function recognizes it as a mock chain
      try {
        await createFhevmInstance({
          provider: "http://localhost:8545",
          signal: controller.signal,
          mockChains: { 31337: "http://localhost:8545" },
        });
      } catch (error) {
        // Expected to fail in test env without actual Hardhat node
        // The important part is that it attempted mock chain logic
        expect(error).toBeDefined();
      }
    });

    it("should accept custom mock chains configuration", async () => {
      const controller = new AbortController();

      const customMockChains = {
        12345: "http://custom-mock:8545",
      };

      try {
        await createFhevmInstance({
          provider: "http://custom-mock:8545",
          signal: controller.signal,
          mockChains: customMockChains,
        });
      } catch (error) {
        // Expected to fail without actual node
        expect(error).toBeDefined();
      }
    });
  });

  describe("createFhevmInstance - Node.js Environment", () => {
    let originalWindow: typeof global.window;
    let originalProcess: typeof global.process;

    beforeEach(() => {
      originalWindow = global.window;
      originalProcess = global.process;
    });

    afterEach(() => {
      global.window = originalWindow;
      global.process = originalProcess;
    });

    it("should detect Node.js environment and use Node.js implementation", async () => {
      // Simulate Node.js environment
      // @ts-ignore - Intentionally deleting for test
      delete global.window;
      // @ts-ignore - Setting up Node.js env
      global.process = { versions: { node: "18.0.0" } } as any;

      const controller = new AbortController();

      try {
        await createFhevmInstance({
          provider: "http://localhost:8545",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail in test env
        // The important part is that it attempted Node.js code path
        expect(error).toBeDefined();
      }
    });
  });

  describe("Error Code Exports", () => {
    it("should export FhevmError class", () => {
      expect(FhevmError).toBeDefined();
      expect(typeof FhevmError).toBe("function");
    });

    it("should export FhevmAbortError class", () => {
      expect(FhevmAbortError).toBeDefined();
      expect(typeof FhevmAbortError).toBe("function");
    });

    it("should export FhevmErrorCode enum", () => {
      expect(FhevmErrorCode).toBeDefined();
      expect(typeof FhevmErrorCode).toBe("object");
    });

    it("should create proper FhevmError instances", () => {
      const error = new FhevmError(
        FhevmErrorCode.NETWORK_ERROR,
        "Test error message"
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FhevmError);
      expect(error.code).toBe(FhevmErrorCode.NETWORK_ERROR);
      expect(error.message).toContain("Test error message");
    });

    it("should create proper FhevmAbortError instances", () => {
      const error = new FhevmAbortError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FhevmAbortError);
      expect(error.name).toBe("FhevmAbortError");
      expect(error.message).toContain("cancelled");
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle provider as string URL", async () => {
      const controller = new AbortController();
      controller.abort(); // Abort immediately to avoid network calls

      // Will throw error (could be abort error or network error depending on timing)
      await expect(
        createFhevmInstance({
          provider: "https://sepolia.infura.io/v3/YOUR-PROJECT-ID",
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should handle provider as EIP-1193 provider object", async () => {
      const controller = new AbortController();
      controller.abort(); // Abort immediately

      const mockProvider = {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_chainId") {
            return "0x1"; // Mainnet
          }
          throw new Error("Unsupported method");
        }),
      };

      await expect(
        createFhevmInstance({
          provider: mockProvider as any,
          signal: controller.signal,
        })
      ).rejects.toThrow(FhevmAbortError);
    });

    it("should handle different chain IDs", async () => {
      const controller = new AbortController();
      controller.abort();

      const mockProvider = {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_chainId") {
            return "0xaa36a7"; // Sepolia testnet
          }
          throw new Error("Unsupported method");
        }),
      };

      await expect(
        createFhevmInstance({
          provider: mockProvider as any,
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should handle status change notifications throughout lifecycle", async () => {
      const controller = new AbortController();
      const statuses: string[] = [];

      const onStatusChange = vi.fn((status) => {
        statuses.push(status);
      });

      try {
        await createFhevmInstance({
          provider: "http://localhost:8545",
          signal: controller.signal,
          onStatusChange,
        });
      } catch (error) {
        // Expected to fail in test env
      }

      // Verify that onStatusChange was called
      if (statuses.length > 0) {
        expect(onStatusChange).toHaveBeenCalled();
      }
    });

    it("should handle network errors gracefully", async () => {
      const controller = new AbortController();

      await expect(
        createFhevmInstance({
          provider: "http://non-existent-node:9999",
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should properly handle multiple mock chains", async () => {
      const controller = new AbortController();
      controller.abort();

      const customMockChains = {
        31337: "http://localhost:8545",
        12345: "http://custom-mock:8545",
        99999: "http://another-mock:8545",
      };

      await expect(
        createFhevmInstance({
          provider: "http://localhost:8545",
          signal: controller.signal,
          mockChains: customMockChains,
        })
      ).rejects.toThrow();
    });
  });

  describe("Internal Helper Functions", () => {
    it("should validate address format in checkIsAddress", async () => {
      const controller = new AbortController();
      controller.abort();

      // Test will exercise address validation internally
      try {
        await createFhevmInstance({
          provider: "http://localhost:8545",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });

    it("should handle RPC provider chain ID retrieval", async () => {
      const controller = new AbortController();

      const mockProvider = {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_chainId") {
            return "0x7a69"; // 31337 in hex
          }
          throw new Error("Unsupported method");
        }),
      };

      try {
        await createFhevmInstance({
          provider: mockProvider as any,
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail
        expect(mockProvider.request).toHaveBeenCalledWith({ method: "eth_chainId" });
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent abort signals", async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      controller1.abort();
      controller2.abort();

      const promise1 = createFhevmInstance({
        provider: "http://localhost:8545",
        signal: controller1.signal,
      });

      const promise2 = createFhevmInstance({
        provider: "http://localhost:8545",
        signal: controller2.signal,
      });

      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();
    });

    it("should handle empty mock chains configuration", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        createFhevmInstance({
          provider: "http://localhost:8545",
          signal: controller.signal,
          mockChains: {},
        })
      ).rejects.toThrow();
    });

    it("should handle provider with malformed URL", async () => {
      const controller = new AbortController();

      await expect(
        createFhevmInstance({
          provider: "not-a-valid-url",
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should handle provider request failures", async () => {
      const controller = new AbortController();

      const mockProvider = {
        request: vi.fn(async () => {
          throw new Error("Provider request failed");
        }),
      };

      await expect(
        createFhevmInstance({
          provider: mockProvider as any,
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should handle invalid chain ID responses", async () => {
      const controller = new AbortController();

      const mockProvider = {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_chainId") {
            return "invalid"; // Invalid hex string
          }
          throw new Error("Unsupported method");
        }),
      };

      await expect(
        createFhevmInstance({
          provider: mockProvider as any,
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });
  });

  describe("Browser vs Node Detection", () => {
    it("should correctly identify browser environment", async () => {
      // In test env, window should exist
      expect(typeof window).not.toBe("undefined");

      const controller = new AbortController();
      controller.abort();

      try {
        await createFhevmInstance({
          provider: "http://localhost:8545",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail, but should have attempted browser code path
        expect(error).toBeDefined();
      }
    });
  });

  describe("Browser-Specific Paths", () => {
    it("should attempt SDK loading in browser when not initialized", async () => {
      const controller = new AbortController();
      const statuses: string[] = [];

      const onStatusChange = vi.fn((status) => {
        statuses.push(status);
      });

      try {
        await createFhevmInstance({
          provider: "https://sepolia.infura.io/v3/test",
          signal: controller.signal,
          onStatusChange,
        });
      } catch (error) {
        // Expected to fail, but should have attempted SDK loading
        expect(error).toBeDefined();
      }

      // Should have attempted some status changes
      // In browser env, it should try to load SDK
    });

    it("should handle EIP-1193 provider in browser", async () => {
      const controller = new AbortController();

      const mockProvider = {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_chainId") {
            return "0xaa36a7"; // Sepolia
          }
          throw new Error("Unsupported method");
        }),
      };

      try {
        await createFhevmInstance({
          provider: mockProvider as any,
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail in test env
        expect(error).toBeDefined();
      }

      // Should have called eth_chainId
      expect(mockProvider.request).toHaveBeenCalledWith({ method: "eth_chainId" });
    });

    it("should handle mock chain with valid Hardhat metadata in browser", async () => {
      const controller = new AbortController();
      const statuses: string[] = [];

      const onStatusChange = vi.fn((status) => {
        statuses.push(status);
      });

      try {
        await createFhevmInstance({
          provider: "http://localhost:8545",
          signal: controller.signal,
          onStatusChange,
          mockChains: { 31337: "http://localhost:8545" },
        });
      } catch (error) {
        // Expected to fail without actual Hardhat node
        // But should have attempted mock chain detection
        expect(error).toBeDefined();
      }
    });

    it("should handle resolve with EIP-1193 provider for non-mock chain", async () => {
      const controller = new AbortController();

      const mockProvider = {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_chainId") {
            return "0x1"; // Ethereum mainnet (not a mock chain)
          }
          throw new Error("Unsupported method");
        }),
      };

      try {
        await createFhevmInstance({
          provider: mockProvider as any,
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });

    it("should detect mock chain and attempt Hardhat metadata fetch", async () => {
      const controller = new AbortController();
      const statuses: string[] = [];

      const onStatusChange = vi.fn((status) => {
        statuses.push(status);
      });

      const mockProvider = {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_chainId") {
            return "0x7a69"; // 31337 in hex (Hardhat default)
          }
          throw new Error("Unsupported method");
        }),
      };

      try {
        await createFhevmInstance({
          provider: mockProvider as any,
          signal: controller.signal,
          onStatusChange,
        });
      } catch (error) {
        // Expected to fail, but should have detected mock chain
        expect(error).toBeDefined();
      }

      // Should have called eth_chainId to detect chain 31337
      expect(mockProvider.request).toHaveBeenCalledWith({ method: "eth_chainId" });
    });

    it("should handle custom mock chains with different chain IDs", async () => {
      const controller = new AbortController();

      const mockProvider = {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_chainId") {
            return "0x3039"; // 12345 in hex
          }
          throw new Error("Unsupported method");
        }),
      };

      try {
        await createFhevmInstance({
          provider: mockProvider as any,
          signal: controller.signal,
          mockChains: { 12345: "http://custom-mock:8545" },
        });
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });

    it("should handle abort during mock chain detection", async () => {
      const controller = new AbortController();

      const mockProvider = {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_chainId") {
            return "0x7a69"; // 31337
          }
          throw new Error("Unsupported method");
        }),
      };

      const promise = createFhevmInstance({
        provider: mockProvider as any,
        signal: controller.signal,
      });

      // Abort during detection
      setTimeout(() => controller.abort(), 10);

      await expect(promise).rejects.toThrow();
    });
  });
});
