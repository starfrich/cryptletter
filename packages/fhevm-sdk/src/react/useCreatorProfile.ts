/**
 * useCreatorProfile - React Hook for Creator Profile Management
 *
 * Provides focused functionality for managing creator profiles:
 * - Fetch creator data
 * - Update profile information
 * - Manage pricing
 * - Track subscriber stats
 * - Auto-refresh capabilities
 */

import { useState, useEffect, useCallback } from "react";
import type { CreatorProfile } from "../core/cryptletter";
import { useCryptletter, type UseCryptletterConfig } from "./useCryptletter";

/**
 * Hook configuration
 */
export interface UseCreatorProfileConfig extends UseCryptletterConfig {
  creatorAddress?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

/**
 * Hook return type
 */
export interface UseCreatorProfileReturn {
  // Profile data
  profile: CreatorProfile | null;
  isLoading: boolean;
  error: Error | null;

  // Actions
  refreshProfile: () => Promise<void>;
  updateProfile: (name: string, bio: string) => Promise<string>;
  updatePrice: (newPriceWei: bigint) => Promise<string>;
  registerAsCreator: (
    name: string,
    bio: string,
    monthlyPriceWei: bigint
  ) => Promise<string>;

  // Stats
  monthlyPriceEth: string | null;
  subscriberCount: number;
  isRegistered: boolean;
}

/**
 * useCreatorProfile Hook
 *
 * Specialized hook for creator profile management with auto-refresh support.
 *
 * @example
 * ```tsx
 * const {
 *   profile,
 *   updateProfile,
 *   updatePrice,
 *   isLoading,
 *   monthlyPriceEth
 * } = useCreatorProfile({
 *   contractAddress: "0x...",
 *   contractABI: [...],
 *   ipfsJWT: "your-jwt",
 *   provider,
 *   signer,
 *   creatorAddress: "0x...",
 *   autoRefresh: true,
 *   refreshInterval: 30000 // 30 seconds
 * });
 *
 * // Update profile
 * await updateProfile("New Name", "New bio");
 * ```
 */
export function useCreatorProfile(
  config: UseCreatorProfileConfig
): UseCreatorProfileReturn {
  const {
    getCreator,
    updateProfile: updateProfileBase,
    updatePrice: updatePriceBase,
    registerAsCreator: registerAsCreatorBase,
  } = useCryptletter(config);

  // State
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch profile data
  const refreshProfile = useCallback(async () => {
    if (!config.creatorAddress) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    // Don't try to fetch if contract address is not ready
    if (!config.contractAddress) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getCreator(config.creatorAddress);
      setProfile(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch creator profile");
      setError(error);
      console.error("Failed to fetch creator profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [config.creatorAddress, config.contractAddress, getCreator]);

  // Auto-refresh effect
  useEffect(() => {
    // Initial fetch
    refreshProfile();

    // Setup auto-refresh if enabled
    if (config.autoRefresh && config.refreshInterval) {
      const intervalId = setInterval(refreshProfile, config.refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [config.autoRefresh, config.refreshInterval, refreshProfile]);

  // Update profile wrapper
  const updateProfile = useCallback(
    async (name: string, bio: string): Promise<string> => {
      try {
        const txHash = await updateProfileBase(name, bio);
        // Refresh profile after update
        await refreshProfile();
        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update profile");
        setError(error);
        throw error;
      }
    },
    [updateProfileBase, refreshProfile]
  );

  // Update price wrapper
  const updatePrice = useCallback(
    async (newPriceWei: bigint): Promise<string> => {
      try {
        const txHash = await updatePriceBase(newPriceWei);
        // Refresh profile after update
        await refreshProfile();
        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update price");
        setError(error);
        throw error;
      }
    },
    [updatePriceBase, refreshProfile]
  );

  // Register as creator wrapper
  const registerAsCreator = useCallback(
    async (name: string, bio: string, monthlyPriceWei: bigint): Promise<string> => {
      try {
        const txHash = await registerAsCreatorBase(name, bio, monthlyPriceWei);
        // Refresh profile after registration
        await refreshProfile();
        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to register as creator");
        setError(error);
        throw error;
      }
    },
    [registerAsCreatorBase, refreshProfile]
  );

  // Computed values
  const monthlyPriceEth = profile
    ? (Number(profile.monthlyPrice) / 1e18).toFixed(4)
    : null;

  const subscriberCount = profile ? Number(profile.subscriberCount) : 0;
  const isRegistered = profile?.isActive || false;

  return {
    // Profile data
    profile,
    isLoading,
    error,

    // Actions
    refreshProfile,
    updateProfile,
    updatePrice,
    registerAsCreator,

    // Stats
    monthlyPriceEth,
    subscriberCount,
    isRegistered,
  };
}
