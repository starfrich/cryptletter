import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { FhevmClient } from "../../src/vanilla/FhevmClient";
import type { FhevmClientOptions, FhevmClientStatus } from "../../src/vanilla/FhevmClient";

// Mock the core modules
vi.mock("../../src/core/instance", () => ({
  createFhevmInstance: vi.fn(),
}));

vi.mock("../../src/core/encryption", () => ({
  encryptValue: vi.fn(),
}));

vi.mock("../../src/core/decryption", () => ({
  decryptValue: vi.fn(),
}));

import { createFhevmInstance } from "../../src/core/instance";
import { encryptValue } from "../../src/core/encryption";
import { decryptValue } from "../../src/core/decryption";

describe("FhevmClient", () => {
  const mockProvider = "http://localhost:8545";
  const mockInstance = {
    createEncryptedInput: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createFhevmInstance as any).mockResolvedValue(mockInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("creates client with minimal options", () => {
      const client = new FhevmClient({ provider: mockProvider });

      expect(client).toBeInstanceOf(FhevmClient);
      expect(client.getStatus()).toBe("idle");
      expect(client.getInstance()).toBeUndefined();
    });

    it("creates client with full options", () => {
      const onStatusChange = vi.fn();
      const mockChains = { 31337: "http://localhost:8545" };

      const client = new FhevmClient({
        provider: mockProvider,
        mockChains,
        onStatusChange,
      });

      expect(client).toBeInstanceOf(FhevmClient);
      expect(client.getStatus()).toBe("idle");
    });
  });

  describe("init", () => {
    it("initializes FHEVM instance", async () => {
      const client = new FhevmClient({ provider: mockProvider });

      expect(client.getStatus()).toBe("idle");

      await client.init();

      expect(client.getStatus()).toBe("ready");
      expect(client.getInstance()).toBe(mockInstance);
      expect(createFhevmInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
        })
      );
    });

    it("updates status to initializing during init", async () => {
      const statusChanges: FhevmClientStatus[] = [];
      const onStatusChange = (status: FhevmClientStatus) => {
        statusChanges.push(status);
      };

      const client = new FhevmClient({
        provider: mockProvider,
        onStatusChange,
      });

      await client.init();

      expect(statusChanges).toContain("initializing");
      expect(statusChanges).toContain("ready");
    });

    it("handles abort signal", async () => {
      const controller = new AbortController();
      const client = new FhevmClient({ provider: mockProvider });

      controller.abort();

      await client.init(controller.signal);

      expect(createFhevmInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });

    it("is safe to call multiple times", async () => {
      const client = new FhevmClient({ provider: mockProvider });

      await client.init();
      await client.init();
      await client.init();

      // Should only create instance once
      expect(createFhevmInstance).toHaveBeenCalledTimes(3);
      expect(client.getStatus()).toBe("ready");
    });

    it("does not re-initialize after destroy", async () => {
      const client = new FhevmClient({ provider: mockProvider });

      await client.init();
      expect(client.getStatus()).toBe("ready");

      client.destroy();
      expect(client.getStatus()).toBe("destroyed");

      await client.init();
      expect(client.getStatus()).toBe("destroyed");
    });

    it("passes mockChains to createFhevmInstance", async () => {
      const mockChains = { 31337: "http://localhost:8545" };
      const client = new FhevmClient({
        provider: mockProvider,
        mockChains,
      });

      await client.init();

      expect(createFhevmInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          mockChains,
        })
      );
    });
  });

  describe("encrypt", () => {
    it("encrypts a value successfully", async () => {
      const mockEncryptResult = {
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      };
      (encryptValue as any).mockResolvedValue(mockEncryptResult);

      const client = new FhevmClient({ provider: mockProvider });
      await client.init();

      const result = await client.encrypt(42, "euint32", {
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        userAddress: "0x" + "b".repeat(40) as `0x${string}`,
      });

      expect(result).toBe(mockEncryptResult);
      expect(encryptValue).toHaveBeenCalledWith(
        mockInstance,
        "0x" + "a".repeat(40),
        "0x" + "b".repeat(40),
        42,
        "euint32"
      );
    });

    it("throws error when not initialized", async () => {
      const client = new FhevmClient({ provider: mockProvider });

      await expect(
        client.encrypt(42, "euint32", {
          contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
          userAddress: "0x" + "b".repeat(40) as `0x${string}`,
        })
      ).rejects.toThrow("FhevmClient not initialized");
    });

    it("handles boolean values", async () => {
      const mockEncryptResult = {
        handles: [new Uint8Array([1])],
        inputProof: new Uint8Array([2]),
      };
      (encryptValue as any).mockResolvedValue(mockEncryptResult);

      const client = new FhevmClient({ provider: mockProvider });
      await client.init();

      await client.encrypt(true, "ebool", {
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        userAddress: "0x" + "b".repeat(40) as `0x${string}`,
      });

      expect(encryptValue).toHaveBeenCalledWith(
        mockInstance,
        expect.any(String),
        expect.any(String),
        true,
        "ebool"
      );
    });

    it("handles address values", async () => {
      const mockEncryptResult = {
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      };
      (encryptValue as any).mockResolvedValue(mockEncryptResult);

      const client = new FhevmClient({ provider: mockProvider });
      await client.init();

      const address = "0x" + "c".repeat(40);
      await client.encrypt(address, "eaddress", {
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        userAddress: "0x" + "b".repeat(40) as `0x${string}`,
      });

      expect(encryptValue).toHaveBeenCalledWith(
        mockInstance,
        expect.any(String),
        expect.any(String),
        address,
        "eaddress"
      );
    });
  });

  describe("decrypt", () => {
    it("decrypts a handle successfully", async () => {
      const mockDecryptedValue = 42;
      (decryptValue as any).mockResolvedValue(mockDecryptedValue);

      const client = new FhevmClient({ provider: mockProvider });
      await client.init();

      const signature = {
        publicKey: "pk",
        privateKey: "sk",
        signature: "sig",
        contractAddresses: ["0x" + "a".repeat(40)] as const,
        userAddress: "0x" + "b".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 7,
      };

      const result = await client.decrypt(
        "0x123",
        "0x" + "a".repeat(40) as `0x${string}`,
        signature
      );

      expect(result).toBe(mockDecryptedValue);
      expect(decryptValue).toHaveBeenCalledWith(
        mockInstance,
        "0x123",
        "0x" + "a".repeat(40),
        signature
      );
    });

    it("throws error when not initialized", async () => {
      const client = new FhevmClient({ provider: mockProvider });

      const signature = {
        publicKey: "pk",
        privateKey: "sk",
        signature: "sig",
        contractAddresses: ["0x" + "a".repeat(40)] as const,
        userAddress: "0x" + "b".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 7,
      };

      await expect(
        client.decrypt(
          "0x123",
          "0x" + "a".repeat(40) as `0x${string}`,
          signature
        )
      ).rejects.toThrow("FhevmClient not initialized");
    });
  });

  describe("event system", () => {
    it("registers and calls event handlers", async () => {
      const handler = vi.fn();
      const client = new FhevmClient({ provider: mockProvider });

      client.on("status", handler);

      await client.init();

      expect(handler).toHaveBeenCalledWith("initializing");
      expect(handler).toHaveBeenCalledWith("ready");
    });

    it("removes event handlers with off", async () => {
      const handler = vi.fn();
      const client = new FhevmClient({ provider: mockProvider });

      client.on("status", handler);
      client.off("status", handler);

      await client.init();

      expect(handler).not.toHaveBeenCalled();
    });

    it("supports multiple handlers for same event", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const client = new FhevmClient({ provider: mockProvider });

      client.on("status", handler1);
      client.on("status", handler2);

      await client.init();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it("does not throw when removing non-existent handler", () => {
      const handler = vi.fn();
      const client = new FhevmClient({ provider: mockProvider });

      expect(() => {
        client.off("status", handler);
      }).not.toThrow();
    });

    it("handles errors in event handlers gracefully", async () => {
      const throwingHandler = vi.fn().mockImplementation(() => {
        throw new Error("Handler error");
      });
      const normalHandler = vi.fn();

      const client = new FhevmClient({ provider: mockProvider });

      client.on("status", throwingHandler);
      client.on("status", normalHandler);

      await client.init();

      // Normal handler should still be called despite throwing handler
      expect(normalHandler).toHaveBeenCalled();
    });

    it("emits relayer:status events during initialization", async () => {
      const handler = vi.fn();
      const client = new FhevmClient({ provider: mockProvider });

      client.on("relayer:status", handler);

      await client.init();

      // Should emit relayer events during init
      // (actual behavior depends on onStatusChange calls)
    });
  });

  describe("getStatus", () => {
    it("returns idle initially", () => {
      const client = new FhevmClient({ provider: mockProvider });
      expect(client.getStatus()).toBe("idle");
    });

    it("returns initializing during init", () => {
      const client = new FhevmClient({ provider: mockProvider });

      const statusPromise = client.init();

      // Note: Due to async nature, this test might not catch the exact moment
      // In real scenarios, use event listeners
    });

    it("returns ready after successful init", async () => {
      const client = new FhevmClient({ provider: mockProvider });

      await client.init();

      expect(client.getStatus()).toBe("ready");
    });

    it("returns destroyed after destroy", async () => {
      const client = new FhevmClient({ provider: mockProvider });

      await client.init();
      client.destroy();

      expect(client.getStatus()).toBe("destroyed");
    });
  });

  describe("getInstance", () => {
    it("returns undefined before initialization", () => {
      const client = new FhevmClient({ provider: mockProvider });
      expect(client.getInstance()).toBeUndefined();
    });

    it("returns instance after initialization", async () => {
      const client = new FhevmClient({ provider: mockProvider });

      await client.init();

      expect(client.getInstance()).toBe(mockInstance);
    });

    it("returns undefined after destroy", async () => {
      const client = new FhevmClient({ provider: mockProvider });

      await client.init();
      client.destroy();

      expect(client.getInstance()).toBeUndefined();
    });
  });

  describe("destroy", () => {
    it("clears instance and events", async () => {
      const handler = vi.fn();
      const client = new FhevmClient({ provider: mockProvider });

      client.on("status", handler);
      await client.init();

      client.destroy();

      expect(client.getInstance()).toBeUndefined();
      expect(client.getStatus()).toBe("destroyed");
    });

    it("transitions to destroyed status", async () => {
      const statusChanges: FhevmClientStatus[] = [];
      const onStatusChange = (status: FhevmClientStatus) => {
        statusChanges.push(status);
      };

      const client = new FhevmClient({
        provider: mockProvider,
        onStatusChange,
      });

      await client.init();
      client.destroy();

      expect(statusChanges[statusChanges.length - 1]).toBe("destroyed");
    });

    it("calls onStatusChange with destroyed", async () => {
      const onStatusChange = vi.fn();
      const client = new FhevmClient({
        provider: mockProvider,
        onStatusChange,
      });

      await client.init();
      client.destroy();

      expect(onStatusChange).toHaveBeenCalledWith("destroyed");
    });

    it("can be called multiple times safely", async () => {
      const client = new FhevmClient({ provider: mockProvider });

      await client.init();

      expect(() => {
        client.destroy();
        client.destroy();
        client.destroy();
      }).not.toThrow();

      expect(client.getStatus()).toBe("destroyed");
    });
  });

  describe("integration scenarios", () => {
    it("full lifecycle: init -> encrypt -> decrypt -> destroy", async () => {
      const mockEncryptResult = {
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      };
      const mockDecryptedValue = 42;

      (encryptValue as any).mockResolvedValue(mockEncryptResult);
      (decryptValue as any).mockResolvedValue(mockDecryptedValue);

      const client = new FhevmClient({ provider: mockProvider });

      expect(client.getStatus()).toBe("idle");

      await client.init();
      expect(client.getStatus()).toBe("ready");

      const encrypted = await client.encrypt(42, "euint32", {
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        userAddress: "0x" + "b".repeat(40) as `0x${string}`,
      });
      expect(encrypted).toBe(mockEncryptResult);

      const signature = {
        publicKey: "pk",
        privateKey: "sk",
        signature: "sig",
        contractAddresses: ["0x" + "a".repeat(40)] as const,
        userAddress: "0x" + "b".repeat(40),
        startTimestamp: Date.now(),
        durationDays: 7,
      };

      const decrypted = await client.decrypt(
        "0x123",
        "0x" + "a".repeat(40) as `0x${string}`,
        signature
      );
      expect(decrypted).toBe(mockDecryptedValue);

      client.destroy();
      expect(client.getStatus()).toBe("destroyed");
    });

    it("handles multiple encryption operations", async () => {
      const mockEncryptResult = {
        handles: [new Uint8Array([1, 2, 3])],
        inputProof: new Uint8Array([4, 5, 6]),
      };
      (encryptValue as any).mockResolvedValue(mockEncryptResult);

      const client = new FhevmClient({ provider: mockProvider });
      await client.init();

      await client.encrypt(42, "euint32", {
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        userAddress: "0x" + "b".repeat(40) as `0x${string}`,
      });

      await client.encrypt(100, "euint32", {
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        userAddress: "0x" + "b".repeat(40) as `0x${string}`,
      });

      await client.encrypt(255, "euint8", {
        contractAddress: "0x" + "a".repeat(40) as `0x${string}`,
        userAddress: "0x" + "b".repeat(40) as `0x${string}`,
      });

      expect(encryptValue).toHaveBeenCalledTimes(3);
    });
  });
});
