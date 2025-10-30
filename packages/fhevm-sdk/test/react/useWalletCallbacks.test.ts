import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWalletCallbacks } from "../../src/react/useWalletCallbacks";
import { ethers } from "ethers";

describe("useWalletCallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("custom callbacks", () => {
    it("should return custom callbacks when provided", () => {
      const mockSignTypedData = vi.fn(async () => "0xsignature");
      const mockGetAddress = vi.fn(async () => "0x" + "a".repeat(40));
      const mockSendTransaction = vi.fn(async () => "0xtxhash");

      const customCallbacks = {
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        sendTransaction: mockSendTransaction,
      };

      const { result } = renderHook(() =>
        useWalletCallbacks({ callbacks: customCallbacks })
      );

      expect(result.current.signTypedData).toBe(mockSignTypedData);
      expect(result.current.getAddress).toBe(mockGetAddress);
      expect(result.current.sendTransaction).toBe(mockSendTransaction);
    });

    it("should handle partial custom callbacks", () => {
      const mockSignTypedData = vi.fn(async () => "0xsignature");
      const mockGetAddress = vi.fn(async () => "0x" + "a".repeat(40));

      const customCallbacks = {
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
      };

      const { result } = renderHook(() =>
        useWalletCallbacks({ callbacks: customCallbacks as any })
      );

      expect(result.current.signTypedData).toBe(mockSignTypedData);
      expect(result.current.getAddress).toBe(mockGetAddress);
      expect(result.current.sendTransaction).toBeUndefined();
    });

    it("should memoize custom callbacks correctly", () => {
      const mockSignTypedData = vi.fn(async () => "0xsignature");
      const mockGetAddress = vi.fn(async () => "0x" + "a".repeat(40));

      const customCallbacks = {
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
      };

      const { result, rerender } = renderHook(() =>
        useWalletCallbacks({ callbacks: customCallbacks as any })
      );

      const firstRenderCallbacks = result.current;

      rerender();

      expect(result.current).toBe(firstRenderCallbacks);
    });
  });

  describe("ethers signer integration", () => {
    it("should create callbacks from ethers signer", async () => {
      const mockSignTypedData = vi.fn(async () => "0xsignature");
      const mockGetAddress = vi.fn(async () => "0x" + "a".repeat(40));
      const mockSendTransaction = vi.fn(async () => ({ hash: "0xtxhash" }));

      const mockSigner = {
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        sendTransaction: mockSendTransaction,
      } as unknown as ethers.JsonRpcSigner;

      const { result } = renderHook(() =>
        useWalletCallbacks({ ethersSigner: mockSigner })
      );

      expect(result.current.signTypedData).toBeDefined();
      expect(result.current.getAddress).toBeDefined();
      expect(result.current.sendTransaction).toBeDefined();

      // Test signTypedData
      const domain = { name: "Test" };
      const types = { Test: [] };
      const message = { data: "test" };

      await result.current.signTypedData!(domain, types, message);
      expect(mockSignTypedData).toHaveBeenCalledWith(domain, types, message);

      // Test getAddress
      await result.current.getAddress!();
      expect(mockGetAddress).toHaveBeenCalled();

      // Test sendTransaction
      const tx = { to: "0x" + "b".repeat(40), value: "0x0" };
      const txHash = await result.current.sendTransaction!(tx);
      expect(mockSendTransaction).toHaveBeenCalledWith(tx);
      expect(txHash).toBe("0xtxhash");
    });

    it("should throw error when ethers signer not available for signTypedData", async () => {
      const { result } = renderHook(() =>
        useWalletCallbacks({ ethersSigner: undefined })
      );

      expect(result.current.signTypedData).toBeUndefined();
    });

    it("should return undefined callbacks when signer is removed", () => {
      const mockSigner = {
        signTypedData: vi.fn(async () => "0xsignature"),
        getAddress: vi.fn(async () => "0x" + "a".repeat(40)),
        sendTransaction: vi.fn(async () => ({ hash: "0xtxhash" })),
      } as unknown as ethers.JsonRpcSigner;

      const { result, rerender } = renderHook(
        ({ signer }) => useWalletCallbacks({ ethersSigner: signer }),
        { initialProps: { signer: mockSigner } }
      );

      expect(result.current.signTypedData).toBeDefined();
      expect(result.current.getAddress).toBeDefined();
      expect(result.current.sendTransaction).toBeDefined();

      // Remove signer
      rerender({ signer: undefined });

      // Callbacks should now be undefined
      expect(result.current.signTypedData).toBeUndefined();
      expect(result.current.getAddress).toBeUndefined();
      expect(result.current.sendTransaction).toBeUndefined();
    });

    it("should memoize ethers callbacks correctly", () => {
      const mockSigner = {
        signTypedData: vi.fn(async () => "0xsignature"),
        getAddress: vi.fn(async () => "0x" + "a".repeat(40)),
        sendTransaction: vi.fn(async () => ({ hash: "0xtxhash" })),
      } as unknown as ethers.JsonRpcSigner;

      const { result, rerender } = renderHook(() =>
        useWalletCallbacks({ ethersSigner: mockSigner })
      );

      const firstRenderCallbacks = result.current;

      rerender();

      expect(result.current).toBe(firstRenderCallbacks);
    });

    it("should update callbacks when signer changes", () => {
      const mockSigner1 = {
        signTypedData: vi.fn(async () => "0xsignature1"),
        getAddress: vi.fn(async () => "0x" + "a".repeat(40)),
        sendTransaction: vi.fn(async () => ({ hash: "0xtxhash1" })),
      } as unknown as ethers.JsonRpcSigner;

      const mockSigner2 = {
        signTypedData: vi.fn(async () => "0xsignature2"),
        getAddress: vi.fn(async () => "0x" + "b".repeat(40)),
        sendTransaction: vi.fn(async () => ({ hash: "0xtxhash2" })),
      } as unknown as ethers.JsonRpcSigner;

      const { result, rerender } = renderHook(
        ({ signer }) => useWalletCallbacks({ ethersSigner: signer }),
        { initialProps: { signer: mockSigner1 } }
      );

      const firstCallbacks = result.current;

      rerender({ signer: mockSigner2 });

      expect(result.current).not.toBe(firstCallbacks);
    });
  });

  describe("callback priority", () => {
    it("should prioritize custom callbacks over ethers signer", () => {
      const mockCustomSignTypedData = vi.fn(async () => "0xcustomsignature");
      const mockCustomGetAddress = vi.fn(async () => "0x" + "c".repeat(40));

      const mockEthersSignTypedData = vi.fn(async () => "0xetherssignature");
      const mockEthersGetAddress = vi.fn(async () => "0x" + "d".repeat(40));

      const customCallbacks = {
        signTypedData: mockCustomSignTypedData,
        getAddress: mockCustomGetAddress,
      };

      const mockSigner = {
        signTypedData: mockEthersSignTypedData,
        getAddress: mockEthersGetAddress,
        sendTransaction: vi.fn(async () => ({ hash: "0xtxhash" })),
      } as unknown as ethers.JsonRpcSigner;

      const { result } = renderHook(() =>
        useWalletCallbacks({
          callbacks: customCallbacks as any,
          ethersSigner: mockSigner,
        })
      );

      expect(result.current.signTypedData).toBe(mockCustomSignTypedData);
      expect(result.current.getAddress).toBe(mockCustomGetAddress);
    });
  });

  describe("empty state", () => {
    it("should return empty object when no callbacks or signer provided", () => {
      const { result } = renderHook(() => useWalletCallbacks({}));

      expect(result.current.signTypedData).toBeUndefined();
      expect(result.current.getAddress).toBeUndefined();
      expect(result.current.sendTransaction).toBeUndefined();
    });

    it("should return empty object when ethersSigner is undefined", () => {
      const { result } = renderHook(() =>
        useWalletCallbacks({ ethersSigner: undefined })
      );

      expect(result.current.signTypedData).toBeUndefined();
      expect(result.current.getAddress).toBeUndefined();
      expect(result.current.sendTransaction).toBeUndefined();
    });
  });
});
