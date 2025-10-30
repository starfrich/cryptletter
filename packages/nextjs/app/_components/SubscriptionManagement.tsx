"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SubscriptionStatus } from "../../components/cryptletter/SubscriptionStatus";
import { useDeployedContractInfo } from "../../hooks/helper";
import type { AllowedChainIds } from "../../utils/helper/networks";
import { useAccount, useReadContract } from "wagmi";

interface SubscriptionInfo {
  creatorAddress: string;
  creatorName: string;
  isActive: boolean;
  expiresAt: bigint;
  subscribedAt: bigint;
  monthlyPrice: bigint;
}

export function SubscriptionManagement() {
  const { address: userAddress, chain } = useAccount();
  const chainId = chain?.id as AllowedChainIds | undefined;
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "Cryptletter",
    chainId,
  });

  // Get all creators
  const { data: creatorCount } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getCreatorCount",
    query: {
      enabled: Boolean(contractInfo?.address),
    },
  });

  const { data: creatorAddresses } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getCreators",
    args: [BigInt(0), BigInt(100)], // Get up to 100 creators
    query: {
      enabled: Boolean(contractInfo?.address && creatorCount),
    },
  });

  // Fetch subscriptions for user
  useEffect(() => {
    if (!creatorAddresses || !contractInfo?.address || !userAddress) return;

    const fetchSubscriptions = async () => {
      setIsLoading(true);
      try {
        const addresses = creatorAddresses as string[];
        const subs: any[] = [];

        // Check subscription status for each creator
        // In production, you'd want to index this off-chain
        for (const creatorAddr of addresses) {
          try {
            // This would need to be done with proper contract reads
            // For now, we'll add all creators and let the component handle it
            subs.push({ creatorAddress: creatorAddr });
          } catch (error) {
            console.error(`Error checking subscription for ${creatorAddr}:`, error);
          }
        }

        setSubscriptions(subs);
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, [creatorAddresses, contractInfo?.address, userAddress]);

  if (!userAddress) {
    return (
      <div className="alert alert-warning">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>Please connect your wallet to view your subscriptions</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12 card bg-base-200">
        <div className="card-body">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold mb-2">No Subscriptions Yet</h3>
          <p className="opacity-70 mb-4">Start by subscribing to your favorite creators!</p>
          <Link href="/" className="btn btn-primary">
            Discover Creators
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Show empty state if no subscriptions are being displayed */}
      {!isLoading && subscriptions.length > 0 && activeSubscriptions.length === 0 && (
        <div className="text-center py-12 card bg-base-200">
          <div className="card-body">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold mb-2">No Subscriptions Yet</h3>
            <p className="opacity-70 mb-4">Start by subscribing to your favorite creators!</p>
            <Link href="/" className="btn btn-primary">
              Discover Creators
            </Link>
          </div>
        </div>
      )}

      {/* Expiring Soon Warning */}
      {expiringSubscriptions.length > 0 && (
        <div className="alert alert-warning shadow-lg">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current flex-shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="font-bold">
                {expiringSubscriptions.length} {expiringSubscriptions.length === 1 ? "subscription" : "subscriptions"}{" "}
                expiring soon!
              </h3>
              <div className="text-sm">
                {expiringSubscriptions.map((sub, idx) => (
                  <span key={sub.creatorAddress}>
                    {sub.creatorName}
                    {idx < expiringSubscriptions.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Subscriptions Count */}
      {activeSubscriptions.length > 0 && (
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block w-8 h-8 stroke-current"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="stat-title">Active Subscriptions</div>
            <div className="stat-value text-primary">{activeSubscriptions.length}</div>
            <div className="stat-desc">
              {expiringSubscriptions.length > 0 && `${expiringSubscriptions.length} expiring soon`}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subscriptions.map(sub => (
          <SubscriptionStatusWrapper
            key={sub.creatorAddress}
            creatorAddress={sub.creatorAddress}
            userAddress={userAddress}
            contractInfo={contractInfo}
            onSubscriptionLoad={info => {
              if (info.isActive) {
                setActiveSubscriptions(prev => {
                  const exists = prev.find(s => s.creatorAddress === info.creatorAddress);
                  if (exists) return prev;
                  return [...prev, info];
                });

                // Check if expiring within 7 days
                const now = Math.floor(Date.now() / 1000);
                const expiresAt = Number(info.expiresAt);
                const daysUntilExpiry = (expiresAt - now) / (24 * 60 * 60);

                if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
                  setExpiringSubscriptions(prev => {
                    const exists = prev.find(s => s.creatorAddress === info.creatorAddress);
                    if (exists) return prev;
                    return [...prev, info];
                  });
                }
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Wrapper to fetch individual subscription data
function SubscriptionStatusWrapper({
  creatorAddress,
  userAddress,
  contractInfo,
  onSubscriptionLoad,
}: {
  creatorAddress: string;
  userAddress: string;
  contractInfo: any;
  onSubscriptionLoad?: (info: SubscriptionInfo) => void;
}) {
  const { data: creatorData } = useReadContract({
    address: contractInfo?.address as `0x${string}`,
    abi: contractInfo?.abi,
    functionName: "getCreator",
    args: [creatorAddress as `0x${string}`],
    query: {
      enabled: Boolean(contractInfo?.address && creatorAddress),
    },
  });

  const { data: subscriptionData } = useReadContract({
    address: contractInfo?.address as `0x${string}`,
    abi: contractInfo?.abi,
    functionName: "getSubscriptionStatus",
    args: [userAddress as `0x${string}`, creatorAddress as `0x${string}`],
    query: {
      enabled: Boolean(contractInfo?.address && userAddress && creatorAddress),
    },
  });

  // Extract data (hooks must be called before any returns)
  const creatorArray = creatorData
    ? Array.isArray(creatorData)
      ? creatorData
      : Object.values(creatorData as any)
    : null;
  const name = creatorArray ? (creatorArray[0] as string) : "";
  const monthlyPrice = creatorArray ? (creatorArray[2] as bigint) : BigInt(0);

  const subscriptionArray = subscriptionData
    ? Array.isArray(subscriptionData)
      ? subscriptionData
      : Object.values(subscriptionData as any)
    : null;
  const isActive = subscriptionArray ? (subscriptionArray[0] as boolean) : false;
  const expiresAt = subscriptionArray ? (subscriptionArray[1] as bigint) : BigInt(0);
  const subscribedAt = subscriptionArray ? (subscriptionArray[2] as bigint) : BigInt(0);
  const hasAccess = subscriptionArray && subscriptionArray.length > 3 ? (subscriptionArray[3] as boolean) : false;

  // Notify parent component about this subscription (must be before any returns)
  useEffect(() => {
    // Notify if user has access OR had a subscription (to show in the list)
    const shouldShow = hasAccess || subscribedAt !== BigInt(0);

    if (onSubscriptionLoad && shouldShow && creatorData && subscriptionData) {
      onSubscriptionLoad({
        creatorAddress,
        creatorName: name,
        isActive,
        expiresAt,
        subscribedAt,
        monthlyPrice,
      });
    }
  }, [
    onSubscriptionLoad,
    hasAccess,
    isActive,
    creatorAddress,
    name,
    expiresAt,
    subscribedAt,
    monthlyPrice,
    creatorData,
    subscriptionData,
  ]);

  // Early returns after all hooks
  if (!creatorData || !subscriptionData) return null;

  // Only show if user has access or had a subscription
  if (!hasAccess && subscribedAt === BigInt(0)) return null;

  return (
    <SubscriptionStatus
      creatorAddress={creatorAddress}
      creatorName={name}
      isActive={isActive}
      expiresAt={expiresAt}
      subscribedAt={subscribedAt}
      monthlyPrice={monthlyPrice}
    />
  );
}
