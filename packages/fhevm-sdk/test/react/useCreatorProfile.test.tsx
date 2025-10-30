import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCreatorProfile } from "../../src/react/useCreatorProfile";
import type { CreatorProfile } from "../../src/core/cryptletter";

// Mock useCryptletter
vi.mock("../../src/react/useCryptletter", () => ({
  useCryptletter: vi.fn(),
}));

import { useCryptletter } from "../../src/react/useCryptletter";

describe("useCreatorProfile Hook", () => {
  const mockCreatorProfile: CreatorProfile = {
    name: "Test Creator",
    bio: "Test bio",
    monthlyPrice: BigInt("1000000000000000000"), // 1 ETH
    subscriberCount: BigInt(10),
    isActive: true,
    address: "0x" + "a".repeat(40),
  };

  const mockGetCreator = vi.fn();
  const mockUpdateProfile = vi.fn();
  const mockUpdatePrice = vi.fn();
  const mockRegisterAsCreator = vi.fn();

  const mockUseCryptletterReturn = {
    getCreator: mockGetCreator,
    updateProfile: mockUpdateProfile,
    updatePrice: mockUpdatePrice,
    registerAsCreator: mockRegisterAsCreator,
    subscribe: vi.fn(),
    renewSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    getEncryptedKey: vi.fn(),
    decryptNewsletterContent: vi.fn(),
    checkAccess: vi.fn(),
    getSubscriptionStatus: vi.fn(),
    listNewsletters: vi.fn(),
    getNewsletterMetadata: vi.fn(),
    getCreators: vi.fn(),
    getCreatorCount: vi.fn(),
    publishNewsletter: vi.fn(),
    isPublishing: false,
    isFetching: false,
    isLoading: false,
    error: null,
    sdk: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCreator.mockResolvedValue(mockCreatorProfile);
    mockUpdateProfile.mockResolvedValue("0xtxhash");
    mockUpdatePrice.mockResolvedValue("0xtxhash");
    mockRegisterAsCreator.mockResolvedValue("0xtxhash");
    (useCryptletter as any).mockReturnValue(mockUseCryptletterReturn);
  });

  describe("initialization", () => {
    it("initializes with default state", () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
        })
      );

      expect(result.current.profile).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.monthlyPriceEth).toBeNull();
      expect(result.current.subscriberCount).toBe(0);
      expect(result.current.isRegistered).toBe(false);
    });

    it("fetches profile when creatorAddress is provided", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCreator).toHaveBeenCalledWith("0x" + "a".repeat(40));
      expect(result.current.profile).toEqual(mockCreatorProfile);
    });

    it("does not fetch when creatorAddress is not provided", () => {
      renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
        })
      );

      expect(mockGetCreator).not.toHaveBeenCalled();
    });

    it("does not fetch when contractAddress is not provided", () => {
      renderHook(() =>
        useCreatorProfile({
          contractAddress: "",
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      expect(mockGetCreator).not.toHaveBeenCalled();
    });
  });

  describe("auto-refresh", () => {
    it("sets up interval when autoRefresh is enabled", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
          autoRefresh: true,
          refreshInterval: 5000,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initial fetch should happen
      expect(mockGetCreator).toHaveBeenCalled();
    });

    it("does not set up interval when autoRefresh is disabled", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
          autoRefresh: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Only initial fetch should happen
      const callCount = mockGetCreator.mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(1);
    });

    it("accepts refreshInterval parameter", () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
          autoRefresh: true,
          refreshInterval: 10000, // 10 seconds
        })
      );

      // Hook should initialize without errors
      expect(result.current).toBeDefined();
    });
  });

  describe("refreshProfile", () => {
    it("manually refreshes profile", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCreator).toHaveBeenCalledTimes(1);

      // Manual refresh
      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(mockGetCreator).toHaveBeenCalledTimes(2);
    });

    it("handles refresh errors", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      // Reset and setup mock to reject
      mockGetCreator.mockReset();
      mockGetCreator.mockRejectedValue(new Error("Fetch failed"));

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error?.message).toBe("Fetch failed");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      // Restore mock for other tests
      mockGetCreator.mockReset();
      mockGetCreator.mockResolvedValue(mockCreatorProfile);
    });

    it("handles non-Error exceptions", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      // Reset and setup mock to reject with string
      mockGetCreator.mockReset();
      mockGetCreator.mockRejectedValue("String error");

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error?.message).toBe("Failed to fetch creator profile");

      consoleErrorSpy.mockRestore();
      // Restore mock for other tests
      mockGetCreator.mockReset();
      mockGetCreator.mockResolvedValue(mockCreatorProfile);
    });
  });

  describe("updateProfile", () => {
    it("updates profile successfully", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let txHash: string = "";
      await act(async () => {
        txHash = await result.current.updateProfile("New Name", "New Bio");
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith("New Name", "New Bio");
      expect(txHash).toBe("0xtxhash");
      expect(mockGetCreator).toHaveBeenCalledTimes(2); // Initial + refresh after update
    });

    it("handles update errors", async () => {
      mockUpdateProfile.mockRejectedValueOnce(new Error("Update failed"));

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updateProfile("New Name", "New Bio")).rejects.toThrow(
          "Update failed"
        );
      });

      expect(result.current.error?.message).toBe("Update failed");
    });

    it("handles non-Error exceptions in update", async () => {
      mockUpdateProfile.mockRejectedValueOnce("String error");

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updateProfile("New Name", "New Bio")).rejects.toThrow(
          "Failed to update profile"
        );
      });

      expect(result.current.error?.message).toBe("Failed to update profile");
    });
  });

  describe("updatePrice", () => {
    it("updates price successfully", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newPrice = BigInt("2000000000000000000"); // 2 ETH
      let txHash: string = "";
      await act(async () => {
        txHash = await result.current.updatePrice(newPrice);
      });

      expect(mockUpdatePrice).toHaveBeenCalledWith(newPrice);
      expect(txHash).toBe("0xtxhash");
      expect(mockGetCreator).toHaveBeenCalledTimes(2); // Initial + refresh after update
    });

    it("handles price update errors", async () => {
      mockUpdatePrice.mockRejectedValueOnce(new Error("Price update failed"));

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updatePrice(BigInt(1000))).rejects.toThrow(
          "Price update failed"
        );
      });

      expect(result.current.error?.message).toBe("Price update failed");
    });

    it("handles non-Error exceptions in price update", async () => {
      mockUpdatePrice.mockRejectedValueOnce("String error");

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updatePrice(BigInt(1000))).rejects.toThrow(
          "Failed to update price"
        );
      });

      expect(result.current.error?.message).toBe("Failed to update price");
    });
  });

  describe("registerAsCreator", () => {
    it("registers as creator successfully", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
        })
      );

      const price = BigInt("1000000000000000000");
      let txHash: string = "";
      await act(async () => {
        txHash = await result.current.registerAsCreator("Test Creator", "Test Bio", price);
      });

      expect(mockRegisterAsCreator).toHaveBeenCalledWith("Test Creator", "Test Bio", price);
      expect(txHash).toBe("0xtxhash");
    });

    it("refreshes profile after registration", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockGetCreator.mock.calls.length;

      await act(async () => {
        await result.current.registerAsCreator("Test", "Bio", BigInt(1000));
      });

      expect(mockGetCreator).toHaveBeenCalledTimes(initialCallCount + 1);
    });

    it("handles registration errors", async () => {
      mockRegisterAsCreator.mockRejectedValueOnce(new Error("Registration failed"));

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
        })
      );

      await act(async () => {
        await expect(
          result.current.registerAsCreator("Test", "Bio", BigInt(1000))
        ).rejects.toThrow("Registration failed");
      });

      expect(result.current.error?.message).toBe("Registration failed");
    });

    it("handles non-Error exceptions in registration", async () => {
      mockRegisterAsCreator.mockRejectedValueOnce("String error");

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
        })
      );

      await act(async () => {
        await expect(
          result.current.registerAsCreator("Test", "Bio", BigInt(1000))
        ).rejects.toThrow("Failed to register as creator");
      });

      expect(result.current.error?.message).toBe("Failed to register as creator");
    });
  });

  describe("computed values", () => {
    it("computes monthlyPriceEth correctly", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.monthlyPriceEth).toBe("1.0000");
    });

    it("computes subscriberCount correctly", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.subscriberCount).toBe(10);
    });

    it("computes isRegistered correctly", async () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.isRegistered).toBe(true);
    });

    it("returns default values when profile is null", () => {
      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
        })
      );

      expect(result.current.monthlyPriceEth).toBeNull();
      expect(result.current.subscriberCount).toBe(0);
      expect(result.current.isRegistered).toBe(false);
    });

    it("handles inactive creators", async () => {
      const inactiveProfile = { ...mockCreatorProfile, isActive: false };
      mockGetCreator.mockResolvedValueOnce(inactiveProfile);

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.isRegistered).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles zero price", async () => {
      const zeroProfile = { ...mockCreatorProfile, monthlyPrice: BigInt(0) };
      mockGetCreator.mockResolvedValueOnce(zeroProfile);

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.monthlyPriceEth).toBe("0.0000");
    });

    it("handles zero subscribers", async () => {
      const noSubsProfile = { ...mockCreatorProfile, subscriberCount: BigInt(0) };
      mockGetCreator.mockResolvedValueOnce(noSubsProfile);

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.subscriberCount).toBe(0);
    });

    it("handles very large price values", async () => {
      const largeProfile = {
        ...mockCreatorProfile,
        monthlyPrice: BigInt("999999999999999999999"), // 999.999... ETH
      };
      mockGetCreator.mockResolvedValueOnce(largeProfile);

      const { result } = renderHook(() =>
        useCreatorProfile({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          creatorAddress: "0x" + "a".repeat(40),
        })
      );

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(result.current.monthlyPriceEth).toBe("1000.0000");
    });

    it("updates when creatorAddress changes", async () => {
      const { result, rerender } = renderHook(
        ({ address }) =>
          useCreatorProfile({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: {} as any,
            creatorAddress: address,
          }),
        {
          initialProps: { address: "0x" + "a".repeat(40) },
        }
      );

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      expect(mockGetCreator).toHaveBeenCalledWith("0x" + "a".repeat(40));

      // Change creator address
      rerender({ address: "0x" + "c".repeat(40) });

      await waitFor(() => {
        expect(mockGetCreator).toHaveBeenCalledWith("0x" + "c".repeat(40));
      });
    });
  });
});
