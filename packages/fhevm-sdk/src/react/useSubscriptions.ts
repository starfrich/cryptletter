/**
 * useSubscriptions - React Hook for Subscription Management
 *
 * Provides focused functionality for managing subscriptions:
 * - Subscribe to creators
 * - Renew subscriptions
 * - Cancel subscriptions
 * - Check subscription status
 * - Track multiple subscriptions
 */

import { useState, useEffect, useCallback } from "react";
import type { SubscriptionStatus, CreatorProfile } from "../core/cryptletter";
import { useCryptletter, type UseCryptletterConfig } from "./useCryptletter";

/**
 * Subscription info (enhanced status with creator data)
 */
export interface SubscriptionInfo {
  creatorAddress: string;
  creatorProfile: CreatorProfile | null;
  status: SubscriptionStatus;
  isExpiringSoon: boolean; // Less than 7 days remaining
}

/**
 * Hook configuration
 */
export interface UseSubscriptionsConfig extends UseCryptletterConfig {
  subscriberAddress?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

/**
 * Hook return type
 */
export interface UseSubscriptionsReturn {
  // Subscription management
  subscribe: (creatorAddress: string) => Promise<string>;
  renewSubscription: (creatorAddress: string) => Promise<string>;
  cancelSubscription: (creatorAddress: string) => Promise<string>;

  // Subscription queries
  getSubscriptionStatus: (creatorAddress: string) => Promise<SubscriptionStatus>;
  checkSubscriptionStatus: (creatorAddress: string) => Promise<void>;

  // Tracked subscriptions
  subscriptions: Map<string, SubscriptionInfo>;
  activeSubscriptions: SubscriptionInfo[];
  expiringSubscriptions: SubscriptionInfo[];

  // State
  isLoading: boolean;
  error: Error | null;

  // Actions
  refreshAll: () => Promise<void>;
  trackCreator: (creatorAddress: string) => Promise<void>;
  untrackCreator: (creatorAddress: string) => void;
}

/**
 * useSubscriptions Hook
 *
 * Specialized hook for subscription management with auto-refresh and tracking.
 *
 * @example
 * ```tsx
 * const {
 *   subscribe,
 *   renewSubscription,
 *   activeSubscriptions,
 *   expiringSubscriptions,
 *   isLoading
 * } = useSubscriptions({
 *   contractAddress: "0x...",
 *   contractABI: [...],
 *   ipfsJWT: "your-jwt",
 *   provider,
 *   signer,
 *   subscriberAddress: "0x...",
 *   autoRefresh: true,
 *   refreshInterval: 60000 // 1 minute
 * });
 *
 * // Subscribe to a creator
 * await subscribe("0xCreatorAddress");
 *
 * // Check expiring subscriptions
 * if (expiringSubscriptions.length > 0) {
 *   console.log("You have subscriptions expiring soon!");
 * }
 * ```
 */
export function useSubscriptions(
  config: UseSubscriptionsConfig
): UseSubscriptionsReturn {
  const {
    subscribe: subscribeBase,
    renewSubscription: renewSubscriptionBase,
    cancelSubscription: cancelSubscriptionBase,
    getSubscriptionStatus: getSubscriptionStatusBase,
    getCreator,
  } = useCryptletter(config);

  // State
  const [subscriptions, setSubscriptions] = useState<Map<string, SubscriptionInfo>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch subscription status for a creator
  const checkSubscriptionStatus = useCallback(
    async (creatorAddress: string): Promise<void> => {
      if (!config.subscriberAddress) return;

      try {
        const [status, profile] = await Promise.all([
          getSubscriptionStatusBase(config.subscriberAddress, creatorAddress),
          getCreator(creatorAddress).catch(() => null),
        ]);

        const daysRemaining = status.daysRemaining;
        const isExpiringSoon = status.isActive && daysRemaining > 0 && daysRemaining <= 7;

        const info: SubscriptionInfo = {
          creatorAddress,
          creatorProfile: profile,
          status,
          isExpiringSoon,
        };

        setSubscriptions((prev) => {
          const updated = new Map(prev);
          updated.set(creatorAddress, info);
          return updated;
        });
      } catch (err) {
        console.error(`Failed to fetch subscription status for ${creatorAddress}:`, err);
        throw err;
      }
    },
    [config.subscriberAddress, getSubscriptionStatusBase, getCreator]
  );

  // Subscribe wrapper
  const subscribe = useCallback(
    async (creatorAddress: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        // Get creator profile to determine price
        const creator = await getCreator(creatorAddress);
        if (!creator.isActive) {
          throw new Error("Creator is not active");
        }

        // Subscribe with the creator's monthly price
        const txHash = await subscribeBase(creatorAddress, creator.monthlyPrice);

        // Track this creator and refresh status
        await checkSubscriptionStatus(creatorAddress);

        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to subscribe");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [subscribeBase, getCreator, checkSubscriptionStatus]
  );

  // Renew subscription wrapper
  const renewSubscription = useCallback(
    async (creatorAddress: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        // Get creator profile to determine price
        const creator = await getCreator(creatorAddress);
        if (!creator.isActive) {
          throw new Error("Creator is not active");
        }

        // Renew with the creator's current monthly price
        const txHash = await renewSubscriptionBase(creatorAddress, creator.monthlyPrice);

        // Refresh status
        await checkSubscriptionStatus(creatorAddress);

        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to renew subscription");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [renewSubscriptionBase, getCreator, checkSubscriptionStatus]
  );

  // Cancel subscription wrapper
  const cancelSubscription = useCallback(
    async (creatorAddress: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const txHash = await cancelSubscriptionBase(creatorAddress);

        // Refresh status
        await checkSubscriptionStatus(creatorAddress);

        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to cancel subscription");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [cancelSubscriptionBase, checkSubscriptionStatus]
  );

  // Get subscription status
  const getSubscriptionStatus = useCallback(
    async (creatorAddress: string): Promise<SubscriptionStatus> => {
      if (!config.subscriberAddress) {
        throw new Error("Subscriber address not configured");
      }

      return await getSubscriptionStatusBase(config.subscriberAddress, creatorAddress);
    },
    [config.subscriberAddress, getSubscriptionStatusBase]
  );

  // Track a creator
  const trackCreator = useCallback(
    async (creatorAddress: string): Promise<void> => {
      await checkSubscriptionStatus(creatorAddress);
    },
    [checkSubscriptionStatus]
  );

  // Untrack a creator
  const untrackCreator = useCallback((creatorAddress: string): void => {
    setSubscriptions((prev) => {
      const updated = new Map(prev);
      updated.delete(creatorAddress);
      return updated;
    });
  }, []);

  // Refresh all tracked subscriptions
  const refreshAll = useCallback(async (): Promise<void> => {
    if (!config.subscriberAddress || subscriptions.size === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const addresses = Array.from(subscriptions.keys());
      await Promise.all(addresses.map((addr) => checkSubscriptionStatus(addr)));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to refresh subscriptions");
      setError(error);
      console.error("Failed to refresh subscriptions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [config.subscriberAddress, subscriptions, checkSubscriptionStatus]);

  // Auto-refresh effect
  useEffect(() => {
    if (config.autoRefresh && config.refreshInterval && subscriptions.size > 0) {
      const intervalId = setInterval(refreshAll, config.refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [config.autoRefresh, config.refreshInterval, subscriptions.size, refreshAll]);

  // Computed values
  const activeSubscriptions = Array.from(subscriptions.values()).filter(
    (sub) => sub.status.isActive
  );

  const expiringSubscriptions = activeSubscriptions.filter((sub) => sub.isExpiringSoon);

  return {
    // Subscription management
    subscribe,
    renewSubscription,
    cancelSubscription,

    // Subscription queries
    getSubscriptionStatus,
    checkSubscriptionStatus,

    // Tracked subscriptions
    subscriptions,
    activeSubscriptions,
    expiringSubscriptions,

    // State
    isLoading,
    error,

    // Actions
    refreshAll,
    trackCreator,
    untrackCreator,
  };
}
