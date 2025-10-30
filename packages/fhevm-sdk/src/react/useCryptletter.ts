/**
 * useCryptletter - Main React Hook for Cryptletter
 *
 * Provides a comprehensive interface for all Cryptletter operations:
 * - Creator functions (register, update profile, publish)
 * - Subscriber functions (subscribe, renew, cancel)
 * - Content access (fetch, decrypt, check access)
 * - Queries (get creator, subscription status, newsletters)
 */

import { useState, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import {
  CryptletterCore,
  type CryptletterConfig,
  type PublishOptions,
  type PublishResult,
  type FetchResult,
  type SubscriptionStatus,
  type CreatorProfile,
  type NewsletterMetadata,
} from "../core/cryptletter";
import { useFhevmInstance } from "./useFhevmInstance";

/**
 * Hook configuration
 */
export interface UseCryptletterConfig {
  contractAddress: string;
  contractABI: any[];
  ipfsJWT: string;
  ipfsGateway?: string;
  provider: ethers.Provider;
  signer?: ethers.Signer;
}

/**
 * Hook return type
 */
export interface UseCryptletterReturn {
  // Creator functions
  registerAsCreator: (
    name: string,
    bio: string,
    monthlyPriceWei: bigint
  ) => Promise<string>;
  updateProfile: (name: string, bio: string) => Promise<string>;
  updatePrice: (newPriceWei: bigint) => Promise<string>;
  publishNewsletter: (options: PublishOptions) => Promise<PublishResult>;

  // Subscriber functions
  subscribe: (creatorAddress: string, paymentWei: bigint) => Promise<string>;
  renewSubscription: (creatorAddress: string, paymentWei: bigint) => Promise<string>;
  cancelSubscription: (creatorAddress: string) => Promise<string>;

  // Content access
  getEncryptedKey: (postId: number) => Promise<string>;
  decryptNewsletterContent: (postId: number, decryptedAESKey: string) => Promise<FetchResult>;
  checkAccess: (postId: number, userAddress?: string) => Promise<boolean>;

  // Queries
  getCreator: (creatorAddress: string) => Promise<CreatorProfile>;
  getSubscriptionStatus: (
    subscriberAddress: string,
    creatorAddress: string
  ) => Promise<SubscriptionStatus>;
  listNewsletters: (creatorAddress: string, limit?: number) => Promise<NewsletterMetadata[]>;
  getNewsletterMetadata: (postId: number) => Promise<NewsletterMetadata>;
  getCreators: (offset?: number, limit?: number) => Promise<string[]>;
  getCreatorCount: () => Promise<number>;

  // Status
  isPublishing: boolean;
  isFetching: boolean;
  isLoading: boolean;
  error: Error | null;

  // SDK instance (for advanced usage)
  sdk: CryptletterCore | null;
}

/**
 * Main Cryptletter React Hook
 *
 * @example
 * ```tsx
 * const {
 *   publishNewsletter,
 *   subscribe,
 *   fetchNewsletter,
 *   isPublishing,
 *   error
 * } = useCryptletter({
 *   contractAddress: "0x...",
 *   contractABI: [...],
 *   ipfsJWT: "your-jwt",
 *   provider,
 *   signer
 * });
 *
 * // Publish a newsletter
 * const result = await publishNewsletter({
 *   title: "My First Newsletter",
 *   content: "Hello world!",
 *   author: "Alice",
 *   isPublic: false
 * });
 * ```
 */
export function useCryptletter(config: UseCryptletterConfig): UseCryptletterReturn {
  const fhevmInstance = useFhevmInstance();

  // State
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize SDK
  const sdk = useMemo(() => {
    if (!config.contractAddress || !config.provider) {
      return null;
    }

    try {
      const sdkConfig: CryptletterConfig = {
        contractAddress: config.contractAddress,
        contractABI: config.contractABI,
        ipfsConfig: {
          jwt: config.ipfsJWT,
          gateway: config.ipfsGateway,
        },
        provider: config.provider,
        signer: config.signer,
      };

      return new CryptletterCore(sdkConfig);
    } catch (err) {
      console.error("Failed to initialize Cryptletter SDK:", err);
      setError(err instanceof Error ? err : new Error("SDK initialization failed"));
      return null;
    }
  }, [
    config.contractAddress,
    config.contractABI,
    config.ipfsJWT,
    config.ipfsGateway,
    config.provider,
    config.signer,
  ]);

  // Creator Functions

  const registerAsCreator = useCallback(
    async (name: string, bio: string, monthlyPriceWei: bigint): Promise<string> => {
      if (!sdk) throw new Error("SDK not initialized");
      setIsLoading(true);
      setError(null);

      try {
        const txHash = await sdk.registerAsCreator(name, bio, monthlyPriceWei);
        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to register as creator");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk]
  );

  const updateProfile = useCallback(
    async (name: string, bio: string): Promise<string> => {
      if (!sdk) throw new Error("SDK not initialized");
      setIsLoading(true);
      setError(null);

      try {
        const txHash = await sdk.updateCreatorProfile(name, bio);
        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update profile");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk]
  );

  const updatePrice = useCallback(
    async (newPriceWei: bigint): Promise<string> => {
      if (!sdk) throw new Error("SDK not initialized");
      setIsLoading(true);
      setError(null);

      try {
        const txHash = await sdk.updateCreatorPrice(newPriceWei);
        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update price");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk]
  );

  const publishNewsletter = useCallback(
    async (options: PublishOptions): Promise<PublishResult> => {
      if (!sdk) throw new Error("SDK not initialized");
      if (!fhevmInstance) throw new Error("FHEVM instance not initialized");

      setIsPublishing(true);
      setError(null);

      try {
        const result = await sdk.publishEncryptedNewsletter(options, fhevmInstance);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to publish newsletter");
        setError(error);
        throw error;
      } finally {
        setIsPublishing(false);
      }
    },
    [sdk, fhevmInstance]
  );

  // Subscriber Functions

  const subscribe = useCallback(
    async (creatorAddress: string, paymentWei: bigint): Promise<string> => {
      if (!sdk) throw new Error("SDK not initialized");
      setIsLoading(true);
      setError(null);

      try {
        const txHash = await sdk.subscribeToCreator(creatorAddress, paymentWei);
        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to subscribe");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk]
  );

  const renewSubscription = useCallback(
    async (creatorAddress: string, paymentWei: bigint): Promise<string> => {
      if (!sdk) throw new Error("SDK not initialized");
      setIsLoading(true);
      setError(null);

      try {
        const txHash = await sdk.renewSubscription(creatorAddress, paymentWei);
        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to renew subscription");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk]
  );

  const cancelSubscription = useCallback(
    async (creatorAddress: string): Promise<string> => {
      if (!sdk) throw new Error("SDK not initialized");
      setIsLoading(true);
      setError(null);

      try {
        const txHash = await sdk.cancelSubscription(creatorAddress);
        return txHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to cancel subscription");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk]
  );

  // Content Access Functions

  const getEncryptedKey = useCallback(
    async (postId: number): Promise<string> => {
      if (!sdk) throw new Error("SDK not initialized");
      setError(null);

      try {
        return await sdk.getEncryptedKey(postId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to get encrypted key");
        setError(error);
        throw error;
      }
    },
    [sdk]
  );

  const decryptNewsletterContent = useCallback(
    async (postId: number, decryptedAESKey: string): Promise<FetchResult> => {
      if (!sdk) throw new Error("SDK not initialized");

      setIsFetching(true);
      setError(null);

      try {
        const result = await sdk.decryptNewsletterContent(postId, decryptedAESKey);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to decrypt newsletter");
        setError(error);
        throw error;
      } finally {
        setIsFetching(false);
      }
    },
    [sdk]
  );

  const checkAccess = useCallback(
    async (postId: number, userAddress?: string): Promise<boolean> => {
      if (!sdk) throw new Error("SDK not initialized");
      setError(null);

      try {
        return await sdk.checkNewsletterAccess(postId, userAddress);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to check access");
        setError(error);
        throw error;
      }
    },
    [sdk]
  );

  // Query Functions

  const getCreator = useCallback(
    async (creatorAddress: string): Promise<CreatorProfile> => {
      if (!sdk) throw new Error("SDK not initialized");
      setError(null);

      try {
        return await sdk.getCreator(creatorAddress);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to get creator");
        setError(error);
        throw error;
      }
    },
    [sdk]
  );

  const getSubscriptionStatus = useCallback(
    async (
      subscriberAddress: string,
      creatorAddress: string
    ): Promise<SubscriptionStatus> => {
      if (!sdk) throw new Error("SDK not initialized");
      setError(null);

      try {
        return await sdk.getSubscriptionStatus(subscriberAddress, creatorAddress);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to get subscription status");
        setError(error);
        throw error;
      }
    },
    [sdk]
  );

  const listNewsletters = useCallback(
    async (creatorAddress: string, limit?: number): Promise<NewsletterMetadata[]> => {
      if (!sdk) throw new Error("SDK not initialized");
      setError(null);

      try {
        return await sdk.listCreatorNewsletters(creatorAddress, limit);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to list newsletters");
        setError(error);
        throw error;
      }
    },
    [sdk]
  );

  const getNewsletterMetadata = useCallback(
    async (postId: number): Promise<NewsletterMetadata> => {
      if (!sdk) throw new Error("SDK not initialized");
      setError(null);

      try {
        return await sdk.getNewsletterMetadata(postId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to get newsletter metadata");
        setError(error);
        throw error;
      }
    },
    [sdk]
  );

  const getCreators = useCallback(
    async (offset?: number, limit?: number): Promise<string[]> => {
      if (!sdk) throw new Error("SDK not initialized");
      setError(null);

      try {
        return await sdk.getCreators(offset, limit);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to get creators");
        setError(error);
        throw error;
      }
    },
    [sdk]
  );

  const getCreatorCount = useCallback(async (): Promise<number> => {
    if (!sdk) throw new Error("SDK not initialized");
    setError(null);

    try {
      return await sdk.getCreatorCount();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to get creator count");
      setError(error);
      throw error;
    }
  }, [sdk]);

  return {
    // Creator functions
    registerAsCreator,
    updateProfile,
    updatePrice,
    publishNewsletter,

    // Subscriber functions
    subscribe,
    renewSubscription,
    cancelSubscription,

    // Content access
    getEncryptedKey,
    decryptNewsletterContent,
    checkAccess,

    // Queries
    getCreator,
    getSubscriptionStatus,
    listNewsletters,
    getNewsletterMetadata,
    getCreators,
    getCreatorCount,

    // Status
    isPublishing,
    isFetching,
    isLoading,
    error,

    // SDK instance
    sdk,
  };
}
