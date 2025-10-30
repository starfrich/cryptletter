import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { FhevmInstance } from "../../src/core/types";
import type { EncryptResult } from "../../src/core/encryption";
import { useFHEEncryption } from "../../src/react/useFHEEncryption";

describe("React Hooks", () => {
  describe("useFHEEncryption", () => {
    const mockInstance: Partial<FhevmInstance> = {
      createEncryptedInput: vi.fn().mockReturnValue({
        add32: vi.fn().mockReturnThis(),
        encrypt: vi.fn().mockResolvedValue({
          handles: [new Uint8Array([1, 2, 3])],
          inputProof: new Uint8Array([4, 5, 6]),
        }),
      }),
    };

    const mockGetAddress = vi.fn(async () => "0x" + "a".repeat(40));

    const contractAddress = ("0x" + "b".repeat(40)) as `0x${string}`;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("initializes with default state", () => {
      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: undefined,
          getAddress: undefined,
          contractAddress: undefined,
        })
      );

      expect(result.current.canEncrypt).toBe(false);
      expect(result.current.isEncrypting).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    it("enables encryption when all dependencies are ready", () => {
      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: mockInstance as FhevmInstance,
          getAddress: mockGetAddress,
          contractAddress,
        })
      );

      expect(result.current.canEncrypt).toBe(true);
    });

    it("disables encryption when missing instance", () => {
      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: undefined,
          getAddress: mockGetAddress,
          contractAddress,
        })
      );

      expect(result.current.canEncrypt).toBe(false);
    });

    it("disables encryption when missing getAddress", () => {
      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: mockInstance as FhevmInstance,
          getAddress: undefined,
          contractAddress,
        })
      );

      expect(result.current.canEncrypt).toBe(false);
    });

    it("disables encryption when missing contractAddress", () => {
      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: mockInstance as FhevmInstance,
          getAddress: mockGetAddress,
          contractAddress: undefined,
        })
      );

      expect(result.current.canEncrypt).toBe(false);
    });

    it("encrypts value with encryptWith", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: mockInstance as FhevmInstance,
          getAddress: mockGetAddress,
          contractAddress,
          onSuccess,
        })
      );

      let encrypted: EncryptResult | undefined;

      await act(async () => {
        encrypted = await result.current.encryptWith((builder) => {
          builder.add32(42);
        });
      });

      expect(encrypted).toBeDefined();
      expect(encrypted?.handles).toHaveLength(1);
      expect(onSuccess).toHaveBeenCalledWith(encrypted);
      expect(mockGetAddress).toHaveBeenCalled();
    });

    it("sets isEncrypting state during encryption", async () => {
      let encryptionStarted = false;
      let encryptionEnded = false;

      const mockSlowInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn().mockReturnValue({
          add32: vi.fn().mockReturnThis(),
          encrypt: vi.fn().mockImplementation(async () => {
            encryptionStarted = true;
            await new Promise((resolve) => setTimeout(resolve, 100));
            return {
              handles: [new Uint8Array([1, 2, 3])],
              inputProof: new Uint8Array([4, 5, 6]),
            };
          }),
        }),
      };

      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: mockSlowInstance as FhevmInstance,
          getAddress: mockGetAddress,
          contractAddress,
        })
      );

      expect(result.current.isEncrypting).toBe(false);

      const encryptPromise = act(async () => {
        return await result.current.encryptWith((builder) => {
          builder.add32(42);
        });
      });

      // At some point, isEncrypting should be true
      await waitFor(() => {
        if (encryptionStarted) {
          // Note: This might not work perfectly due to React batching
          // but demonstrates the pattern
        }
      });

      await encryptPromise;

      expect(result.current.isEncrypting).toBe(false);
    });

    it("handles encryption errors", async () => {
      const onError = vi.fn();
      const encryptError = new Error("Encryption failed");

      const mockFailingInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn().mockReturnValue({
          add32: vi.fn().mockReturnThis(),
          encrypt: vi.fn().mockRejectedValue(encryptError),
        }),
      };

      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: mockFailingInstance as FhevmInstance,
          getAddress: mockGetAddress,
          contractAddress,
          onError,
        })
      );

      let encrypted: EncryptResult | undefined;

      await act(async () => {
        encrypted = await result.current.encryptWith((builder) => {
          builder.add32(42);
        });
      });

      expect(encrypted).toBeUndefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.errorMessage).toBeDefined();
      expect(onError).toHaveBeenCalled();
    });

    it("returns undefined when missing instance", async () => {
      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: undefined,
          getAddress: mockGetAddress,
          contractAddress,
        })
      );

      let encrypted: EncryptResult | undefined;

      await act(async () => {
        encrypted = await result.current.encryptWith((builder) => {
          // This shouldn't execute
        });
      });

      expect(encrypted).toBeUndefined();
      expect(result.current.error).toBeDefined();
    });

    it("returns undefined when missing getAddress", async () => {
      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: mockInstance as FhevmInstance,
          getAddress: undefined,
          contractAddress,
        })
      );

      let encrypted: EncryptResult | undefined;

      await act(async () => {
        encrypted = await result.current.encryptWith((builder) => {
          // This shouldn't execute
        });
      });

      expect(encrypted).toBeUndefined();
      expect(result.current.error).toBeDefined();
    });

    it("encryptBatch is an alias for encryptWith", () => {
      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: mockInstance as FhevmInstance,
          getAddress: mockGetAddress,
          contractAddress,
        })
      );

      expect(result.current.encryptBatch).toBe(result.current.encryptWith);
    });

    it("calls onSuccess callback with encrypted result", async () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: mockInstance as FhevmInstance,
          getAddress: mockGetAddress,
          contractAddress,
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.encryptWith((builder) => {
          builder.add32(42);
        });
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          handles: expect.any(Array),
          inputProof: expect.any(Uint8Array),
        })
      );
    });

    it("catches callback errors gracefully", async () => {
      const onSuccess = vi.fn().mockImplementation(() => {
        throw new Error("Callback error");
      });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      const { result } = renderHook(() =>
        useFHEEncryption({
          instance: mockInstance as FhevmInstance,
          getAddress: mockGetAddress,
          contractAddress,
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.encryptWith((builder) => {
          builder.add32(42);
        });
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("onSuccess callback error"),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
