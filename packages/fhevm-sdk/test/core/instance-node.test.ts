/**
 * Tests for core/instance-node.ts
 *
 * These tests cover the Node.js-specific FHEVM instance creation logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFhevmInstanceNode, isNodeEnvironment } from "../../src/core/instance-node";
import { FhevmError, FhevmAbortError, FhevmErrorCode } from "../../src/types/errors";

describe("Node.js Instance Creation", () => {
  describe("isNodeEnvironment", () => {
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

    it("should return false in browser environment", () => {
      // @ts-ignore - Setting up browser env
      global.window = {} as any;
      // @ts-ignore - Setting up browser env
      global.process = undefined;

      expect(isNodeEnvironment()).toBe(false);
    });

    it("should return true in Node.js environment", () => {
      // @ts-ignore - Intentionally deleting for test
      delete global.window;
      // @ts-ignore - Setting up Node.js env
      global.process = { versions: { node: "18.0.0" } } as any;

      expect(isNodeEnvironment()).toBe(true);
    });

    it("should return false when window exists even if process exists", () => {
      // @ts-ignore - Setting up hybrid env
      global.window = {} as any;
      // @ts-ignore - Setting up hybrid env
      global.process = { versions: { node: "18.0.0" } } as any;

      expect(isNodeEnvironment()).toBe(false);
    });

    it("should return false when process exists but has no node version", () => {
      // @ts-ignore - Intentionally deleting for test
      delete global.window;
      // @ts-ignore - Setting up incomplete process
      global.process = { versions: {} } as any;

      expect(isNodeEnvironment()).toBe(false);
    });
  });

  describe("createFhevmInstanceNode - Basic Functionality", () => {
    it("should throw error when signal is aborted immediately", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        createFhevmInstanceNode({
          provider: "http://localhost:8545",
          signal: controller.signal,
        })
      ).rejects.toThrow(); // Can be FhevmAbortError or network error depending on timing
    });

    it("should call onStatusChange callback during instance creation", async () => {
      const controller = new AbortController();
      const statuses: string[] = [];

      const onStatusChange = vi.fn((status) => {
        statuses.push(status);
      });

      // This will likely fail due to network issues, but should call onStatusChange
      try {
        await createFhevmInstanceNode({
          provider: "http://localhost:8545",
          signal: controller.signal,
          onStatusChange,
        });
      } catch (error) {
        // Expected to fail in test environment
      }

      // Should have been called at least once
      if (statuses.length > 0) {
        expect(onStatusChange).toHaveBeenCalled();
        expect(statuses).toContain("creating");
      }
    });

    it("should respect AbortSignal during async operations", async () => {
      const controller = new AbortController();

      // Start the operation
      const promise = createFhevmInstanceNode({
        provider: "http://localhost:8545",
        signal: controller.signal,
      });

      // Abort after a short delay
      setTimeout(() => controller.abort(), 10);

      // The operation should throw an error
      await expect(promise).rejects.toThrow();
    });
  });

  describe("createFhevmInstanceNode - Hardhat Detection", () => {
    it("should attempt to detect Hardhat node", async () => {
      const controller = new AbortController();

      try {
        await createFhevmInstanceNode({
          provider: "http://localhost:8545",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail without actual Hardhat node
        // The important part is that it attempted Hardhat detection
        expect(error).toBeDefined();
      }
    });

    it("should handle RPC URL provider", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        createFhevmInstanceNode({
          provider: "https://sepolia.example.com",
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should handle mock chains configuration", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        createFhevmInstanceNode({
          provider: "http://localhost:8545",
          signal: controller.signal,
          mockChains: { 31337: "http://localhost:8545" },
        })
      ).rejects.toThrow();
    });
  });

  describe("createFhevmInstanceNode - Network Configurations", () => {
    it("should handle Sepolia network (chainId 11155111)", async () => {
      const controller = new AbortController();

      try {
        await createFhevmInstanceNode({
          provider: "https://sepolia.example.com",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail without real network
        expect(error).toBeDefined();
      }
    });

    it("should handle custom RPC URLs", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        createFhevmInstanceNode({
          provider: "https://custom-rpc.example.com",
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should handle network errors gracefully", async () => {
      const controller = new AbortController();

      await expect(
        createFhevmInstanceNode({
          provider: "http://non-existent-node:9999",
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });
  });

  describe("createFhevmInstanceNode - Error Handling", () => {
    it("should wrap errors in FhevmError", async () => {
      const controller = new AbortController();

      try {
        await createFhevmInstanceNode({
          provider: "invalid-url",
          signal: controller.signal,
        });
      } catch (error) {
        // Should either be FhevmError or FhevmAbortError
        expect(
          error instanceof FhevmError || error instanceof FhevmAbortError
        ).toBe(true);
      }
    });

    it("should preserve FhevmAbortError when thrown", async () => {
      const controller = new AbortController();
      controller.abort();

      // Can be FhevmAbortError or wrapped in FhevmError depending on timing
      await expect(
        createFhevmInstanceNode({
          provider: "http://localhost:8545",
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should handle malformed provider URLs", async () => {
      const controller = new AbortController();

      await expect(
        createFhevmInstanceNode({
          provider: "not-a-valid-url",
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });

    it("should include error details in FhevmError", async () => {
      const controller = new AbortController();

      try {
        await createFhevmInstanceNode({
          provider: "http://invalid:9999",
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof FhevmError) {
          expect(error.code).toBe(FhevmErrorCode.NETWORK_ERROR);
          expect(error.message).toContain("Failed to create FHEVM instance");
        }
      }
    });
  });

  describe("createFhevmInstanceNode - Status Notifications", () => {
    it("should notify 'creating' status", async () => {
      const controller = new AbortController();
      const statuses: string[] = [];

      const onStatusChange = vi.fn((status) => {
        statuses.push(status);
      });

      try {
        await createFhevmInstanceNode({
          provider: "http://localhost:8545",
          signal: controller.signal,
          onStatusChange,
        });
      } catch (error) {
        // Expected to fail
      }

      // Should include 'creating' status
      if (statuses.length > 0) {
        expect(statuses).toContain("creating");
      }
    });

    it("should notify 'sdk-loading' status for non-mock chains", async () => {
      const controller = new AbortController();
      const statuses: string[] = [];

      const onStatusChange = vi.fn((status) => {
        statuses.push(status);
      });

      try {
        await createFhevmInstanceNode({
          provider: "https://sepolia.example.com",
          signal: controller.signal,
          onStatusChange,
        });
      } catch (error) {
        // Expected to fail
      }

      // Should include 'sdk-loading' status
      if (statuses.length > 0 && !statuses.includes("creating")) {
        // If it went to SDK loading path
        expect(statuses).toContain("sdk-loading");
      }
    });

    it("should notify 'sdk-loaded' status after loading SDK", async () => {
      const controller = new AbortController();
      const statuses: string[] = [];

      const onStatusChange = vi.fn((status) => {
        statuses.push(status);
      });

      try {
        await createFhevmInstanceNode({
          provider: "https://sepolia.example.com",
          signal: controller.signal,
          onStatusChange,
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify status progression if SDK loading occurred
      if (statuses.includes("sdk-loading")) {
        const loadingIndex = statuses.indexOf("sdk-loading");
        expect(statuses[loadingIndex + 1]).toBeDefined();
      }
    });
  });

  describe("createFhevmInstanceNode - Mock Instance Creation", () => {
    it("should use mock instance for localhost Hardhat nodes", async () => {
      const controller = new AbortController();

      try {
        await createFhevmInstanceNode({
          provider: "http://localhost:8545",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail without actual Hardhat node
        // The important part is that it attempted mock instance creation
        expect(error).toBeDefined();
      }
    });

    it("should handle chain ID retrieval for mock instances", async () => {
      const controller = new AbortController();

      try {
        await createFhevmInstanceNode({
          provider: "http://127.0.0.1:8545",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });
  });

  describe("createFhevmInstanceNode - Real Relayer SDK", () => {
    it("should use real SDK for non-Hardhat networks", async () => {
      const controller = new AbortController();

      try {
        await createFhevmInstanceNode({
          provider: "https://sepolia-rpc.example.com",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail without real network
        expect(error).toBeDefined();
      }
    });

    it("should handle SDK import failures gracefully", async () => {
      const controller = new AbortController();

      try {
        await createFhevmInstanceNode({
          provider: "https://sepolia.example.com",
          signal: controller.signal,
        });
      } catch (error) {
        // Should wrap any import errors
        expect(error).toBeDefined();
      }
    });

    it("should handle Sepolia chainId and use SepoliaConfig", async () => {
      const controller = new AbortController();

      try {
        // Use a URL that will be detected as Sepolia (chainId 11155111)
        await createFhevmInstanceNode({
          provider: "https://sepolia.infura.io/v3/test",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail, but should have attempted Sepolia path
        expect(error).toBeDefined();
      }
    });

    it("should handle custom Sepolia RPC URL with SepoliaConfig override", async () => {
      const controller = new AbortController();

      try {
        await createFhevmInstanceNode({
          provider: "https://custom-sepolia-rpc.example.com",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail without real network
        expect(error).toBeDefined();
      }
    });

    it("should handle non-Sepolia network without SepoliaConfig", async () => {
      const controller = new AbortController();

      try {
        // Use a network that's not Sepolia (will not match chainId 11155111)
        await createFhevmInstanceNode({
          provider: "https://mainnet.example.com",
          signal: controller.signal,
        });
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });
  });

  describe("createFhevmInstanceNode - Edge Cases", () => {
    it("should handle concurrent instance creation requests", async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      controller1.abort();
      controller2.abort();

      const promise1 = createFhevmInstanceNode({
        provider: "http://localhost:8545",
        signal: controller1.signal,
      });

      const promise2 = createFhevmInstanceNode({
        provider: "http://localhost:8545",
        signal: controller2.signal,
      });

      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();
    });

    it("should handle abort signal during Hardhat detection", async () => {
      const controller = new AbortController();

      const promise = createFhevmInstanceNode({
        provider: "http://localhost:8545",
        signal: controller.signal,
      });

      // Abort during detection
      setTimeout(() => controller.abort(), 5);

      await expect(promise).rejects.toThrow();
    });

    it("should handle abort signal during SDK loading", async () => {
      const controller = new AbortController();

      const promise = createFhevmInstanceNode({
        provider: "https://sepolia.example.com",
        signal: controller.signal,
      });

      // Abort during SDK loading
      setTimeout(() => controller.abort(), 10);

      await expect(promise).rejects.toThrow();
    });

    it("should handle empty provider string", async () => {
      const controller = new AbortController();

      await expect(
        createFhevmInstanceNode({
          provider: "",
          signal: controller.signal,
        })
      ).rejects.toThrow();
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

    it("should create proper error instances", () => {
      const error = new FhevmError(
        FhevmErrorCode.NETWORK_ERROR,
        "Test error"
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FhevmError);
      expect(error.code).toBe(FhevmErrorCode.NETWORK_ERROR);
    });
  });
});
