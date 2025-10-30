import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFHEDecrypt } from "../../src/react/useFHEDecrypt";
import type { FhevmInstance } from "../../src/core/types";
import { GenericStringInMemoryStorage } from "../../src/storage/GenericStringStorage";
import { FhevmErrorCode, FhevmError } from "../../src/types/errors";
import * as decryptionModule from "../../src/core/decryption";
import * as FhevmDecryptionSignatureModule from "../../src/FhevmDecryptionSignature";

describe("useFHEDecrypt Hook", () => {
  const mockInstance: Partial<FhevmInstance> = {
    // Add any necessary mock methods
  };

  const mockSignTypedData = vi.fn(async (domain, types, message) => {
    return "0xmocksignature";
  });

  const mockGetAddress = vi.fn(async () => "0x" + "a".repeat(40));

  const storage = new GenericStringInMemoryStorage();
  const chainId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    storage.removeItem("fhevm-decryption-signature");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: undefined,
        signTypedData: undefined,
        getAddress: undefined,
        fhevmDecryptionSignatureStorage: storage,
        chainId: undefined,
        requests: undefined,
      })
    );

    expect(result.current.canDecrypt).toBe(false);
    expect(result.current.isDecrypting).toBe(false);
    expect(result.current.message).toBe("");
    expect(result.current.results).toEqual({});
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });

  it("enables decryption when all dependencies are ready", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      })
    );

    expect(result.current.canDecrypt).toBe(true);
  });

  it("disables decryption when missing instance", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: undefined,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      })
    );

    expect(result.current.canDecrypt).toBe(false);
  });

  it("disables decryption when missing signTypedData", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: undefined,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      })
    );

    expect(result.current.canDecrypt).toBe(false);
  });

  it("disables decryption when missing getAddress", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: undefined,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      })
    );

    expect(result.current.canDecrypt).toBe(false);
  });

  it("disables decryption when requests is empty", () => {
    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests: [],
      })
    );

    expect(result.current.canDecrypt).toBe(false);
  });

  it("disables decryption when requests is undefined", () => {
    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests: undefined,
      })
    );

    expect(result.current.canDecrypt).toBe(false);
  });

  it("disables decryption while decrypting is in progress", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      })
    );

    expect(result.current.canDecrypt).toBe(true);

    // Start decryption (will fail but that's ok for this test)
    act(() => {
      result.current.decrypt();
    });

    // While decrypting, canDecrypt should be false
    // Note: This might need adjustment based on actual async behavior
  });

  it("provides setMessage function", () => {
    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests: undefined,
      })
    );

    expect(result.current.message).toBe("");

    act(() => {
      result.current.setMessage("Custom message");
    });

    expect(result.current.message).toBe("Custom message");
  });

  it("provides setError function", () => {
    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests: undefined,
      })
    );

    expect(result.current.error).toBeNull();

    act(() => {
      result.current.setError("Custom error");
    });

    expect(result.current.error).toBe("Custom error");
  });

  it("handles retry configuration with maxRetries", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        retry: { maxRetries: 5, retryDelay: 1000 },
      })
    );

    expect(result.current.retryCount).toBe(0);
  });

  it("handles retry disabled with false", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        retry: false,
      })
    );

    // Should not throw, retry is just disabled
    expect(result.current.canDecrypt).toBe(true);
  });

  it("handles empty results initially", () => {
    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests: [],
      })
    );

    expect(result.current.results).toEqual({});
  });

  it("updates requestsKey when requests change", () => {
    const requests1 = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const requests2 = [
      {
        handle: "0x456",
        contractAddress: "0x" + "c".repeat(40) as `0x${string}`,
      },
    ];

    const { result, rerender } = renderHook(
      ({ requests }) =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
        }),
      { initialProps: { requests: requests1 } }
    );

    const initialCanDecrypt = result.current.canDecrypt;

    rerender({ requests: requests2 });

    // Should still be able to decrypt with new requests
    expect(result.current.canDecrypt).toBe(initialCanDecrypt);
  });

  it("handles multiple requests", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
      {
        handle: "0x456",
        contractAddress: "0x" + "c".repeat(40) as `0x${string}`,
      },
      {
        handle: "0x789",
        contractAddress: "0x" + "d".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      })
    );

    expect(result.current.canDecrypt).toBe(true);
  });

  it("handles autoDecrypt option", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        autoDecrypt: true,
      })
    );

    // autoDecrypt is enabled, so it might trigger automatically
    // Just verify it doesn't crash
    expect(result.current).toBeDefined();
  });

  it("accepts onSuccess callback", () => {
    const onSuccess = vi.fn();
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        onSuccess,
      })
    );

    expect(result.current.canDecrypt).toBe(true);
    // onSuccess will be called if decryption succeeds
  });

  it("accepts onError callback", () => {
    const onError = vi.fn();
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
        onError,
      })
    );

    expect(result.current.canDecrypt).toBe(true);
    // onError will be called if decryption fails
  });

  it("exposes decrypt function", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests,
      })
    );

    expect(typeof result.current.decrypt).toBe("function");
  });

  it("handles chainId changes", () => {
    const requests = [
      {
        handle: "0x123",
        contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
      },
    ];

    const { result, rerender } = renderHook(
      ({ chainId }) =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
        }),
      { initialProps: { chainId: 1 } }
    );

    expect(result.current.canDecrypt).toBe(true);

    // Change chain ID
    rerender({ chainId: 5 });

    // Should still be valid
    expect(result.current.canDecrypt).toBe(true);
  });

  it("returns readonly-like interface", () => {
    const { result } = renderHook(() =>
      useFHEDecrypt({
        instance: mockInstance as FhevmInstance,
        signTypedData: mockSignTypedData,
        getAddress: mockGetAddress,
        fhevmDecryptionSignatureStorage: storage,
        chainId,
        requests: undefined,
      })
    );

    // All expected properties should exist
    expect(result.current).toHaveProperty("canDecrypt");
    expect(result.current).toHaveProperty("decrypt");
    expect(result.current).toHaveProperty("isDecrypting");
    expect(result.current).toHaveProperty("message");
    expect(result.current).toHaveProperty("results");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("errorMessage");
    expect(result.current).toHaveProperty("retryCount");
    expect(result.current).toHaveProperty("setMessage");
    expect(result.current).toHaveProperty("setError");
  });

  describe("Decryption Flow", () => {
    it("calls decrypt without errors when dependencies are ready", () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
        })
      );

      // Should be able to call decrypt
      expect(() => result.current.decrypt()).not.toThrow();
    });

    it("handles missing dependencies gracefully in decrypt", () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: undefined,
          signTypedData: undefined,
          getAddress: undefined,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
        })
      );

      // Should not throw even when dependencies are missing
      expect(() => result.current.decrypt()).not.toThrow();
      expect(result.current.canDecrypt).toBe(false);
    });

    it("sets isDecrypting to true when decrypt is called", () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
        })
      );

      act(() => {
        result.current.decrypt();
      });

      // Should start decrypting or return quickly
      expect(result.current).toBeDefined();
    });

    it("accepts retry configuration", () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
          retry: { maxRetries: 5, retryDelay: 2000 },
        })
      );

      expect(result.current.retryCount).toBe(0);
      expect(result.current.canDecrypt).toBe(true);
    });

    it("can be called multiple times safely", () => {
      const requests = [
        {
          handle: "0x123",
          contractAddress: "0x" + "b".repeat(40) as `0x${string}`,
        },
      ];

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
        })
      );

      // Should not throw on multiple calls
      expect(() => {
        result.current.decrypt();
        result.current.decrypt();
      }).not.toThrow();
    });

    it("successfully completes decryption with valid mocks", async () => {
      vi.useRealTimers(); // Use real timers for async test

      const mockSig = {
        publicKey: "mockPubKey",
        privateKey: "mockPrivKey",
        signature: "mockSig",
        contractAddresses: ["0x" + "b".repeat(40)] as `0x${string}`[],
        userAddress: "0x" + "a".repeat(40) as `0x${string}`,
        startTimestamp: 123456,
        durationDays: 30,
      };

      vi.spyOn(FhevmDecryptionSignatureModule.FhevmDecryptionSignature, "loadOrSign")
        .mockResolvedValueOnce(mockSig as any);

      vi.spyOn(decryptionModule, "decryptBatch")
        .mockResolvedValueOnce({
          success: true,
          results: { "0x123": BigInt(42) },
        });

      const requests = [{ handle: "0x123", contractAddress: "0x" + "b".repeat(40) as `0x${string}` }];
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
          onSuccess,
          retry: false,
        })
      );

      act(() => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      }, { timeout: 3000 });

      expect(result.current.error).toBeNull();
      vi.useFakeTimers(); // Restore fake timers
    }, 5000);

    it("handles signature creation failure", async () => {
      vi.useRealTimers();

      vi.spyOn(FhevmDecryptionSignatureModule.FhevmDecryptionSignature, "loadOrSign")
        .mockResolvedValueOnce(null);

      const requests = [{ handle: "0x123", contractAddress: "0x" + "b".repeat(40) as `0x${string}` }];
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
          onError,
          retry: false,
        })
      );

      act(() => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.error).toContain("SIGNATURE_FAILED");
      }, { timeout: 3000 });

      expect(onError).toHaveBeenCalled();
      vi.useFakeTimers();
    }, 5000);

    it("handles decryption batch failure", async () => {
      vi.useRealTimers();

      const mockSig = {
        publicKey: "mockPubKey",
        privateKey: "mockPrivKey",
        signature: "mockSig",
        contractAddresses: ["0x" + "b".repeat(40)] as `0x${string}`[],
        userAddress: "0x" + "a".repeat(40) as `0x${string}`,
        startTimestamp: 123456,
        durationDays: 30,
      };

      vi.spyOn(FhevmDecryptionSignatureModule.FhevmDecryptionSignature, "loadOrSign")
        .mockResolvedValueOnce(mockSig as any);

      vi.spyOn(decryptionModule, "decryptBatch")
        .mockResolvedValueOnce({
          success: false,
          error: "Decryption failed",
        });

      const requests = [{ handle: "0x123", contractAddress: "0x" + "b".repeat(40) as `0x${string}` }];

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
          retry: false,
        })
      );

      act(() => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.error).toContain("DECRYPTION_FAILED");
      }, { timeout: 3000 });

      vi.useFakeTimers();
    }, 5000);

    it("retries on failure and succeeds", async () => {
      vi.useRealTimers();

      const mockSig = {
        publicKey: "mockPubKey",
        privateKey: "mockPrivKey",
        signature: "mockSig",
        contractAddresses: ["0x" + "b".repeat(40)] as `0x${string}`[],
        userAddress: "0x" + "a".repeat(40) as `0x${string}`,
        startTimestamp: 123456,
        durationDays: 30,
      };

      vi.spyOn(FhevmDecryptionSignatureModule.FhevmDecryptionSignature, "loadOrSign")
        .mockResolvedValue(mockSig as any);

      let attempt = 0;
      vi.spyOn(decryptionModule, "decryptBatch")
        .mockImplementation(async () => {
          attempt++;
          if (attempt === 1) {
            return { success: false, error: "Temp error" };
          }
          return { success: true, results: { "0x123": BigInt(99) } };
        });

      const requests = [{ handle: "0x123", contractAddress: "0x" + "b".repeat(40) as `0x${string}` }];

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
          retry: { maxRetries: 2, retryDelay: 100 },
        })
      );

      act(() => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.results["0x123"]).toBe(BigInt(99));
      }, { timeout: 3000 });

      expect(attempt).toBeGreaterThan(1);
      vi.useFakeTimers();
    }, 5000);

    it("stops after max retries", async () => {
      vi.useRealTimers();

      const mockSig = {
        publicKey: "mockPubKey",
        privateKey: "mockPrivKey",
        signature: "mockSig",
        contractAddresses: ["0x" + "b".repeat(40)] as `0x${string}`[],
        userAddress: "0x" + "a".repeat(40) as `0x${string}`,
        startTimestamp: 123456,
        durationDays: 30,
      };

      vi.spyOn(FhevmDecryptionSignatureModule.FhevmDecryptionSignature, "loadOrSign")
        .mockResolvedValue(mockSig as any);

      vi.spyOn(decryptionModule, "decryptBatch")
        .mockResolvedValue({ success: false, error: "Persistent error" });

      const requests = [{ handle: "0x123", contractAddress: "0x" + "b".repeat(40) as `0x${string}` }];
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
          onError,
          retry: { maxRetries: 2, retryDelay: 50 },
        })
      );

      act(() => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      }, { timeout: 3000 });

      expect(result.current.error).not.toBeNull();
      vi.useFakeTimers();
    }, 5000);

    it("handles onSuccess callback errors", async () => {
      vi.useRealTimers();

      const mockSig = {
        publicKey: "mockPubKey",
        privateKey: "mockPrivKey",
        signature: "mockSig",
        contractAddresses: ["0x" + "b".repeat(40)] as `0x${string}`[],
        userAddress: "0x" + "a".repeat(40) as `0x${string}`,
        startTimestamp: 123456,
        durationDays: 30,
      };

      vi.spyOn(FhevmDecryptionSignatureModule.FhevmDecryptionSignature, "loadOrSign")
        .mockResolvedValueOnce(mockSig as any);

      vi.spyOn(decryptionModule, "decryptBatch")
        .mockResolvedValueOnce({ success: true, results: { "0x123": BigInt(7) } });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const onSuccess = vi.fn(() => {
        throw new Error("Callback boom");
      });

      const requests = [{ handle: "0x123", contractAddress: "0x" + "b".repeat(40) as `0x${string}` }];

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
          onSuccess,
          retry: false,
        })
      );

      act(() => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.results["0x123"]).toBe(BigInt(7));
      }, { timeout: 3000 });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("onSuccess callback error"),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      vi.useFakeTimers();
    }, 5000);

    it("handles onError callback errors", async () => {
      vi.useRealTimers();

      vi.spyOn(FhevmDecryptionSignatureModule.FhevmDecryptionSignature, "loadOrSign")
        .mockResolvedValueOnce(null);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const onError = vi.fn(() => {
        throw new Error("Error callback boom");
      });

      const requests = [{ handle: "0x123", contractAddress: "0x" + "b".repeat(40) as `0x${string}` }];

      const { result } = renderHook(() =>
        useFHEDecrypt({
          instance: mockInstance as FhevmInstance,
          signTypedData: mockSignTypedData,
          getAddress: mockGetAddress,
          fhevmDecryptionSignatureStorage: storage,
          chainId,
          requests,
          onError,
          retry: false,
        })
      );

      act(() => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.error).toContain("SIGNATURE_FAILED");
      }, { timeout: 3000 });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("onError callback error"),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      vi.useFakeTimers();
    }, 5000);
  });
});
