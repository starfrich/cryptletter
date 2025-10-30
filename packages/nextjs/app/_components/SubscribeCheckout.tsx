"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Address } from "../../components/helper";
import { useDeployedContractInfo } from "../../hooks/helper";
import type { AllowedChainIds } from "../../utils/helper/networks";
import { notification } from "../../utils/helper/notification";
import { formatEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

interface SubscribeCheckoutProps {
  creatorAddress: string;
}

export function SubscribeCheckout({ creatorAddress }: SubscribeCheckoutProps) {
  const { address: userAddress, chain } = useAccount();
  const chainId = chain?.id as AllowedChainIds | undefined;
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "Cryptletter",
    chainId,
  });

  // Get creator details
  const { data: creatorData } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getCreator",
    args: [creatorAddress as `0x${string}`],
    query: {
      enabled: Boolean(contractInfo?.address && creatorAddress),
    },
  });

  // Get subscription status
  const { data: subscriptionData } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getSubscriptionStatus",
    args: [userAddress as `0x${string}`, creatorAddress as `0x${string}`],
    query: {
      enabled: Boolean(contractInfo?.address && userAddress && creatorAddress),
      refetchInterval: 5000,
    },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle both array and object responses from contract - extract early to avoid conditional hook calls
  const creatorArray = creatorData
    ? Array.isArray(creatorData)
      ? creatorData
      : Object.values(creatorData as any)
    : null;
  const [name, bio, monthlyPrice, subscriberCount, isActive] = creatorArray || ["", "", BigInt(0), BigInt(0), false];

  // Track toast IDs for cleanup
  const [pendingToastId, setPendingToastId] = useState<string | null>(null);
  const [confirmingToastId, setConfirmingToastId] = useState<string | null>(null);

  // Show loading toast during transaction
  useEffect(() => {
    if (isPending) {
      // Remove any existing toasts
      if (pendingToastId) notification.remove(pendingToastId);
      if (confirmingToastId) notification.remove(confirmingToastId);

      const toastId = notification.loading("Please confirm the subscription in your wallet...");
      setPendingToastId(toastId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  // Show confirming toast
  useEffect(() => {
    if (isConfirming) {
      // Remove pending toast
      if (pendingToastId) notification.remove(pendingToastId);
      if (confirmingToastId) notification.remove(confirmingToastId);

      const toastId = notification.info("Waiting for blockchain confirmation...", { duration: 10000 });
      setConfirmingToastId(toastId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirming]);

  // Show success toast when subscription is confirmed
  useEffect(() => {
    if (isConfirmed && name) {
      // Remove all previous toasts
      if (pendingToastId) notification.remove(pendingToastId);
      if (confirmingToastId) notification.remove(confirmingToastId);

      notification.success(
        <div>
          <p className="font-bold">Subscription successful!</p>
          <p className="text-sm opacity-80">You are now subscribed to {name}</p>
        </div>,
        { duration: 5000 },
      );
    }
  }, [isConfirmed, name, pendingToastId, confirmingToastId]);

  // Show error toast when transaction fails
  useEffect(() => {
    if (error) {
      // Remove all previous toasts
      if (pendingToastId) notification.remove(pendingToastId);
      if (confirmingToastId) notification.remove(confirmingToastId);

      notification.error(
        <div>
          <p className="font-bold">Subscription failed</p>
          <p className="text-sm opacity-80">Please try again or check your wallet</p>
        </div>,
        { duration: 5000 },
      );
    }
  }, [error, pendingToastId, confirmingToastId]);

  if (!creatorData) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="skeleton h-8 w-3/4 mb-4"></div>
          <div className="skeleton h-4 w-full mb-2"></div>
          <div className="skeleton h-4 w-full mb-4"></div>
          <div className="skeleton h-12 w-full"></div>
        </div>
      </div>
    );
  }

  const subscriptionArray = subscriptionData
    ? Array.isArray(subscriptionData)
      ? subscriptionData
      : Object.values(subscriptionData as any)
    : null;
  const subIsActive = subscriptionArray ? subscriptionArray[0] : false;
  const subHasAccess = subscriptionArray && subscriptionArray.length > 3 ? subscriptionArray[3] : false;

  if (!isActive) {
    return (
      <div className="alert alert-error">
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
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>This creator is not active</span>
      </div>
    );
  }

  const handleSubscribe = async () => {
    if (!contractInfo?.address || !userAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    setIsProcessing(true);
    try {
      writeContract({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        functionName: "subscribe",
        args: [creatorAddress as `0x${string}`],
        value: monthlyPrice,
      });
    } catch (error) {
      console.error("Subscription failed:", error);
      notification.error(error instanceof Error ? error.message : "Failed to prepare subscription");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isConfirmed) {
    return (
      <div className="card bg-success text-success-content shadow-xl">
        <div className="card-body text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="card-title justify-center text-2xl">Subscription Successful!</h2>
          <p>You are now subscribed to {name}</p>
          <div className="card-actions justify-center mt-4">
            <Link href={`/creator/${creatorAddress}`}>
              <button className="btn btn-primary">View Content</button>
            </Link>
            <Link href="/subscriptions">
              <button className="btn btn-ghost">My Subscriptions</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-3xl mb-4">Subscribe to {name}</h2>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Address address={creatorAddress} size="sm" />
          </div>
          <p className="opacity-80">{bio}</p>
        </div>

        <div className="divider"></div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Monthly Subscription</span>
            <span className="text-2xl font-bold">{formatEther(monthlyPrice)} ETH</span>
          </div>

          <div className="flex justify-between items-center text-sm opacity-70">
            <span>Duration</span>
            <span>30 days</span>
          </div>

          <div className="flex justify-between items-center text-sm opacity-70">
            <span>Current Subscribers</span>
            <span>{Number(subscriberCount)} subscribers</span>
          </div>

          {subHasAccess && (
            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span className="text-sm">
                {subIsActive
                  ? "You already have an active subscription. This will extend your access by 30 days."
                  : "You have a cancelled subscription that's still valid. This will reactivate and extend your access by 30 days."}
              </span>
            </div>
          )}
        </div>

        <div className="divider"></div>

        <div className="card-actions justify-end mt-4">
          <Link href={`/creator/${creatorAddress}`}>
            <button className="btn btn-ghost">Cancel</button>
          </Link>
          <button
            className="btn btn-primary"
            onClick={handleSubscribe}
            disabled={!userAddress || isPending || isConfirming || isProcessing}
          >
            {isPending || isConfirming ? (
              <>
                <span className="loading loading-spinner"></span>
                Processing...
              </>
            ) : (
              `Subscribe for ${formatEther(monthlyPrice)} ETH`
            )}
          </button>
        </div>

        {hash && !isConfirmed && (
          <div className="alert alert-info mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span className="text-sm">Transaction submitted. Waiting for confirmation...</span>
          </div>
        )}
      </div>
    </div>
  );
}
