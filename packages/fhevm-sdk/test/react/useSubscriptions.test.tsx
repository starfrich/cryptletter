import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSubscriptions } from "../../src/react/useSubscriptions";
import type { SubscriptionStatus, CreatorProfile } from "../../src/core/cryptletter";

// Mock useCryptletter
vi.mock("../../src/react/useCryptletter", () => ({
  useCryptletter: vi.fn(),
}));

import { useCryptletter } from "../../src/react/useCryptletter";

describe("useSubscriptions Hook", () => {
  const mockCreatorProfile: CreatorProfile = {
    name: "Test Creator",
    bio: "Test bio",
    monthlyPrice: BigInt("1000000000000000000"), // 1 ETH
    subscriberCount: BigInt(10),
    isActive: true,
    address: "0x" + "a".repeat(40),
  };

  const mockActiveSubscription: SubscriptionStatus = {
    isActive: true,
    expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86400 * 10), // 10 days from now
    daysRemaining: 10,
  };

  const mockExpiringSubscription: SubscriptionStatus = {
    isActive: true,
    expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86400 * 5), // 5 days from now
    daysRemaining: 5,
  };

  const mockExpiredSubscription: SubscriptionStatus = {
    isActive: false,
    expiresAt: BigInt(Math.floor(Date.now() / 1000) - 86400), // 1 day ago
    daysRemaining: 0,
  };

  const mockSubscribe = vi.fn();
  const mockRenewSubscription = vi.fn();
  const mockCancelSubscription = vi.fn();
  const mockGetSubscriptionStatus = vi.fn();
  const mockGetCreator = vi.fn();

  const mockUseCryptletterReturn = {
    subscribe: mockSubscribe,
    renewSubscription: mockRenewSubscription,
    cancelSubscription: mockCancelSubscription,
    getSubscriptionStatus: mockGetSubscriptionStatus,
    getCreator: mockGetCreator,
    updateProfile: vi.fn(),
    updatePrice: vi.fn(),
    registerAsCreator: vi.fn(),
    getEncryptedKey: vi.fn(),
    decryptNewsletterContent: vi.fn(),
    checkAccess: vi.fn(),
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
    mockSubscribe.mockResolvedValue("0xtxhash");
    mockRenewSubscription.mockResolvedValue("0xtxhash");
    mockCancelSubscription.mockResolvedValue("0xtxhash");
    mockGetSubscriptionStatus.mockResolvedValue(mockActiveSubscription);
    mockGetCreator.mockResolvedValue(mockCreatorProfile);
    (useCryptletter as any).mockReturnValue(mockUseCryptletterReturn);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("initialization", () => {
    it("initializes with default state", () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      expect(result.current.subscriptions.size).toBe(0);
      expect(result.current.activeSubscriptions).toEqual([]);
      expect(result.current.expiringSubscriptions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("initializes without subscriberAddress", () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
        })
      );

      expect(result.current.subscriptions.size).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("subscribe", () => {
    it("subscribes to a creator successfully", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      let txHash: string = "";
      await act(async () => {
        txHash = await result.current.subscribe("0x" + "a".repeat(40));
      });

      expect(mockGetCreator).toHaveBeenCalledWith("0x" + "a".repeat(40));
      expect(mockSubscribe).toHaveBeenCalledWith(
        "0x" + "a".repeat(40),
        mockCreatorProfile.monthlyPrice
      );
      expect(mockGetSubscriptionStatus).toHaveBeenCalledWith(
        "0x" + "c".repeat(40),
        "0x" + "a".repeat(40)
      );
      expect(txHash).toBe("0xtxhash");
      expect(result.current.subscriptions.size).toBe(1);
    });

    it("rejects subscription to inactive creator", async () => {
      const inactiveCreator = { ...mockCreatorProfile, isActive: false };
      mockGetCreator.mockResolvedValueOnce(inactiveCreator);

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await expect(result.current.subscribe("0x" + "a".repeat(40))).rejects.toThrow(
          "Creator is not active"
        );
      });

      expect(result.current.error?.message).toBe("Creator is not active");
      expect(mockSubscribe).not.toHaveBeenCalled();
    });

    it("handles subscribe errors", async () => {
      mockSubscribe.mockRejectedValueOnce(new Error("Transaction failed"));

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await expect(result.current.subscribe("0x" + "a".repeat(40))).rejects.toThrow(
          "Transaction failed"
        );
      });

      expect(result.current.error?.message).toBe("Transaction failed");
    });

    it("handles non-Error exceptions in subscribe", async () => {
      mockSubscribe.mockRejectedValueOnce("String error");

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await expect(result.current.subscribe("0x" + "a".repeat(40))).rejects.toThrow(
          "Failed to subscribe"
        );
      });

      expect(result.current.error?.message).toBe("Failed to subscribe");
    });
  });

  describe("renewSubscription", () => {
    it("renews subscription successfully", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      let txHash: string = "";
      await act(async () => {
        txHash = await result.current.renewSubscription("0x" + "a".repeat(40));
      });

      expect(mockGetCreator).toHaveBeenCalledWith("0x" + "a".repeat(40));
      expect(mockRenewSubscription).toHaveBeenCalledWith(
        "0x" + "a".repeat(40),
        mockCreatorProfile.monthlyPrice
      );
      expect(mockGetSubscriptionStatus).toHaveBeenCalledWith(
        "0x" + "c".repeat(40),
        "0x" + "a".repeat(40)
      );
      expect(txHash).toBe("0xtxhash");
    });

    it("rejects renewal for inactive creator", async () => {
      const inactiveCreator = { ...mockCreatorProfile, isActive: false };
      mockGetCreator.mockResolvedValueOnce(inactiveCreator);

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await expect(result.current.renewSubscription("0x" + "a".repeat(40))).rejects.toThrow(
          "Creator is not active"
        );
      });

      expect(result.current.error?.message).toBe("Creator is not active");
      expect(mockRenewSubscription).not.toHaveBeenCalled();
    });

    it("handles renew errors", async () => {
      mockRenewSubscription.mockRejectedValueOnce(new Error("Renewal failed"));

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await expect(result.current.renewSubscription("0x" + "a".repeat(40))).rejects.toThrow(
          "Renewal failed"
        );
      });

      expect(result.current.error?.message).toBe("Renewal failed");
    });

    it("handles non-Error exceptions in renew", async () => {
      mockRenewSubscription.mockRejectedValueOnce("String error");

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await expect(result.current.renewSubscription("0x" + "a".repeat(40))).rejects.toThrow(
          "Failed to renew subscription"
        );
      });

      expect(result.current.error?.message).toBe("Failed to renew subscription");
    });
  });

  describe("cancelSubscription", () => {
    it("cancels subscription successfully", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      let txHash: string = "";
      await act(async () => {
        txHash = await result.current.cancelSubscription("0x" + "a".repeat(40));
      });

      expect(mockCancelSubscription).toHaveBeenCalledWith("0x" + "a".repeat(40));
      expect(mockGetSubscriptionStatus).toHaveBeenCalledWith(
        "0x" + "c".repeat(40),
        "0x" + "a".repeat(40)
      );
      expect(txHash).toBe("0xtxhash");
    });

    it("handles cancel errors", async () => {
      mockCancelSubscription.mockRejectedValueOnce(new Error("Cancel failed"));

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await expect(result.current.cancelSubscription("0x" + "a".repeat(40))).rejects.toThrow(
          "Cancel failed"
        );
      });

      expect(result.current.error?.message).toBe("Cancel failed");
    });

    it("handles non-Error exceptions in cancel", async () => {
      mockCancelSubscription.mockRejectedValueOnce("String error");

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await expect(result.current.cancelSubscription("0x" + "a".repeat(40))).rejects.toThrow(
          "Failed to cancel subscription"
        );
      });

      expect(result.current.error?.message).toBe("Failed to cancel subscription");
    });
  });

  describe("getSubscriptionStatus", () => {
    it("gets subscription status successfully", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      let status: SubscriptionStatus | undefined;
      await act(async () => {
        status = await result.current.getSubscriptionStatus("0x" + "a".repeat(40));
      });

      expect(mockGetSubscriptionStatus).toHaveBeenCalledWith(
        "0x" + "c".repeat(40),
        "0x" + "a".repeat(40)
      );
      expect(status).toEqual(mockActiveSubscription);
    });

    it("throws error when subscriberAddress is not configured", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
        })
      );

      await act(async () => {
        await expect(result.current.getSubscriptionStatus("0x" + "a".repeat(40))).rejects.toThrow(
          "Subscriber address not configured"
        );
      });
    });
  });

  describe("checkSubscriptionStatus", () => {
    it("checks and updates subscription status", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.checkSubscriptionStatus("0x" + "a".repeat(40));
      });

      expect(mockGetSubscriptionStatus).toHaveBeenCalledWith(
        "0x" + "c".repeat(40),
        "0x" + "a".repeat(40)
      );
      expect(mockGetCreator).toHaveBeenCalledWith("0x" + "a".repeat(40));
      expect(result.current.subscriptions.size).toBe(1);

      const subscription = result.current.subscriptions.get("0x" + "a".repeat(40));
      expect(subscription).toBeDefined();
      expect(subscription?.status).toEqual(mockActiveSubscription);
      expect(subscription?.creatorProfile).toEqual(mockCreatorProfile);
    });

    it("does nothing when subscriberAddress is not provided", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
        })
      );

      await act(async () => {
        await result.current.checkSubscriptionStatus("0x" + "a".repeat(40));
      });

      expect(mockGetSubscriptionStatus).not.toHaveBeenCalled();
      expect(mockGetCreator).not.toHaveBeenCalled();
    });

    it("handles errors and throws them", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();
      mockGetSubscriptionStatus.mockRejectedValueOnce(new Error("Fetch failed"));

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await expect(
          result.current.checkSubscriptionStatus("0x" + "a".repeat(40))
        ).rejects.toThrow("Fetch failed");
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("handles getCreator failure gracefully", async () => {
      mockGetCreator.mockRejectedValueOnce(new Error("Profile fetch failed"));

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.checkSubscriptionStatus("0x" + "a".repeat(40));
      });

      const subscription = result.current.subscriptions.get("0x" + "a".repeat(40));
      expect(subscription?.creatorProfile).toBeNull();
      expect(subscription?.status).toEqual(mockActiveSubscription);
    });
  });

  describe("trackCreator and untrackCreator", () => {
    it("tracks a creator", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
      });

      expect(result.current.subscriptions.size).toBe(1);
      expect(result.current.subscriptions.has("0x" + "a".repeat(40))).toBe(true);
    });

    it("untracks a creator", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
      });

      expect(result.current.subscriptions.size).toBe(1);

      act(() => {
        result.current.untrackCreator("0x" + "a".repeat(40));
      });

      expect(result.current.subscriptions.size).toBe(0);
      expect(result.current.subscriptions.has("0x" + "a".repeat(40))).toBe(false);
    });
  });

  describe("refreshAll", () => {
    it("refreshes all tracked subscriptions", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      // Track multiple creators
      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
        await result.current.trackCreator("0x" + "d".repeat(40));
      });

      expect(result.current.subscriptions.size).toBe(2);

      // Clear mock calls
      mockGetSubscriptionStatus.mockClear();
      mockGetCreator.mockClear();

      // Refresh all
      await act(async () => {
        await result.current.refreshAll();
      });

      expect(mockGetSubscriptionStatus).toHaveBeenCalledTimes(2);
      expect(mockGetCreator).toHaveBeenCalledTimes(2);
    });

    it("does nothing when no subscriptions are tracked", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.refreshAll();
      });

      expect(mockGetSubscriptionStatus).not.toHaveBeenCalled();
    });

    it("does nothing when subscriberAddress is not provided", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
        })
      );

      await act(async () => {
        await result.current.refreshAll();
      });

      expect(mockGetSubscriptionStatus).not.toHaveBeenCalled();
    });

    it("handles errors during refresh", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      // First track the creator with successful status
      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
      });

      // Clear the mock and set up rejection
      mockGetSubscriptionStatus.mockClear();
      mockGetCreator.mockClear();
      mockGetSubscriptionStatus.mockRejectedValue(new Error("Refresh failed"));

      // Now refresh should fail
      await act(async () => {
        await result.current.refreshAll();
      });

      expect(result.current.error?.message).toBe("Refresh failed");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      mockGetSubscriptionStatus.mockResolvedValue(mockActiveSubscription);
    });

    it("handles non-Error exceptions during refresh", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      // First track the creator with successful status
      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
      });

      // Clear the mock and set up rejection
      mockGetSubscriptionStatus.mockClear();
      mockGetCreator.mockClear();
      mockGetSubscriptionStatus.mockRejectedValue("String error");

      // Now refresh should fail
      await act(async () => {
        await result.current.refreshAll();
      });

      expect(result.current.error?.message).toBe("Failed to refresh subscriptions");

      consoleErrorSpy.mockRestore();
      mockGetSubscriptionStatus.mockResolvedValue(mockActiveSubscription);
    });
  });

  describe("computed values", () => {
    it("computes activeSubscriptions correctly", async () => {
      mockGetSubscriptionStatus
        .mockResolvedValueOnce(mockActiveSubscription)
        .mockResolvedValueOnce(mockExpiredSubscription);

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
        await result.current.trackCreator("0x" + "d".repeat(40));
      });

      expect(result.current.activeSubscriptions).toHaveLength(1);
      expect(result.current.activeSubscriptions[0].creatorAddress).toBe("0x" + "a".repeat(40));
    });

    it("computes expiringSubscriptions correctly", async () => {
      mockGetSubscriptionStatus
        .mockResolvedValueOnce(mockExpiringSubscription)
        .mockResolvedValueOnce(mockActiveSubscription);

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
        await result.current.trackCreator("0x" + "d".repeat(40));
      });

      expect(result.current.expiringSubscriptions).toHaveLength(1);
      expect(result.current.expiringSubscriptions[0].creatorAddress).toBe("0x" + "a".repeat(40));
      expect(result.current.expiringSubscriptions[0].isExpiringSoon).toBe(true);
    });

    it("identifies subscriptions expiring in exactly 7 days as expiring", async () => {
      const sevenDaysSubscription: SubscriptionStatus = {
        isActive: true,
        expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7),
        daysRemaining: 7,
      };

      mockGetSubscriptionStatus.mockResolvedValueOnce(sevenDaysSubscription);

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
      });

      expect(result.current.expiringSubscriptions).toHaveLength(1);
      expect(result.current.expiringSubscriptions[0].isExpiringSoon).toBe(true);
    });

    it("does not mark inactive subscriptions as expiring", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      mockGetSubscriptionStatus.mockResolvedValueOnce(mockExpiredSubscription);

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
      });

      expect(result.current.expiringSubscriptions).toHaveLength(0);
      const subscription = result.current.subscriptions.get("0x" + "a".repeat(40));
      expect(subscription?.isExpiringSoon).toBe(false);
    });
  });

  describe("auto-refresh", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("sets up auto-refresh interval when enabled", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
          autoRefresh: true,
          refreshInterval: 5000,
        })
      );

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
      });

      const initialCallCount = mockGetSubscriptionStatus.mock.calls.length;

      // Fast-forward time and trigger the interval
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Wait for promises to resolve
      await act(async () => {
        await Promise.resolve();
      });

      // Verify the interval triggered a refresh
      expect(mockGetSubscriptionStatus.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it("does not set up interval when autoRefresh is disabled", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
          autoRefresh: false,
        })
      );

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
      });

      const initialCallCount = mockGetSubscriptionStatus.mock.calls.length;

      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockGetSubscriptionStatus.mock.calls.length).toBe(initialCallCount);
    });

    it("does not set up interval when no subscriptions tracked", async () => {
      renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
          autoRefresh: true,
          refreshInterval: 5000,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockGetSubscriptionStatus).not.toHaveBeenCalled();
    });

    it("cleans up interval on unmount", async () => {
      const { unmount } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
          autoRefresh: true,
          refreshInterval: 5000,
        })
      );

      unmount();

      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      // Should not call after unmount
      expect(mockGetSubscriptionStatus).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("handles zero days remaining", async () => {
      const zeroDaysSubscription: SubscriptionStatus = {
        isActive: true,
        expiresAt: BigInt(Math.floor(Date.now() / 1000)),
        daysRemaining: 0,
      };

      mockGetSubscriptionStatus.mockResolvedValueOnce(zeroDaysSubscription);

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
      });

      const subscription = result.current.subscriptions.get("0x" + "a".repeat(40));
      expect(subscription?.isExpiringSoon).toBe(false);
    });

    it("handles multiple subscriptions with mixed statuses", async () => {
      mockGetSubscriptionStatus
        .mockResolvedValueOnce(mockActiveSubscription)
        .mockResolvedValueOnce(mockExpiringSubscription)
        .mockResolvedValueOnce(mockExpiredSubscription);

      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
        await result.current.trackCreator("0x" + "d".repeat(40));
        await result.current.trackCreator("0x" + "e".repeat(40));
      });

      expect(result.current.subscriptions.size).toBe(3);
      expect(result.current.activeSubscriptions).toHaveLength(2);
      expect(result.current.expiringSubscriptions).toHaveLength(1);
    });

    it("updates existing subscription when checked again", async () => {
      const { result } = renderHook(() =>
        useSubscriptions({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: {} as any,
          subscriberAddress: "0x" + "c".repeat(40),
        })
      );

      await act(async () => {
        await result.current.trackCreator("0x" + "a".repeat(40));
      });

      expect(result.current.subscriptions.size).toBe(1);

      // Update status
      mockGetSubscriptionStatus.mockResolvedValueOnce(mockExpiredSubscription);

      await act(async () => {
        await result.current.checkSubscriptionStatus("0x" + "a".repeat(40));
      });

      expect(result.current.subscriptions.size).toBe(1);
      const subscription = result.current.subscriptions.get("0x" + "a".repeat(40));
      expect(subscription?.status.isActive).toBe(false);
    });
  });
});
