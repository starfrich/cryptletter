"use client";

import { useState } from "react";
import Link from "next/link";
import { useDeployedContractInfo } from "../../hooks/helper";
import type { AllowedChainIds } from "../../utils/helper/networks";
import { formatDistanceToNow } from "date-fns";
import { formatEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

interface SubscriptionStatusProps {
  creatorAddress: string;
  creatorName: string;
  isActive: boolean;
  expiresAt?: bigint;
  subscribedAt?: bigint;
  monthlyPrice?: bigint;
  showActions?: boolean;
}

export function SubscriptionStatus({
  creatorAddress,
  creatorName,
  isActive,
  expiresAt,
  subscribedAt,
  monthlyPrice = BigInt(0),
  showActions = true,
}: SubscriptionStatusProps) {
  const { chain } = useAccount();
  const chainId = chain?.id as AllowedChainIds | undefined;
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "Cryptletter",
    chainId,
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const now = Date.now();
  const expiryTimestamp = expiresAt ? Number(expiresAt) * 1000 : 0;
  const isExpired = expiryTimestamp > 0 && expiryTimestamp < now;
  const timeUntilExpiry = expiryTimestamp > 0 ? formatDistanceToNow(expiryTimestamp, { addSuffix: true }) : "";

  // Calculate days remaining for warning indicator
  const daysRemaining = expiryTimestamp > 0 ? Math.floor((expiryTimestamp - now) / (1000 * 60 * 60 * 24)) : 0;
  const isExpiringSoon = isActive && !isExpired && daysRemaining > 0 && daysRemaining <= 7;

  // Determine card style based on status
  let cardStyle = "bg-base-200";
  if (isActive && !isExpired) {
    if (isExpiringSoon) {
      cardStyle = "bg-warning text-warning-content";
    } else {
      cardStyle = "bg-success text-success-content";
    }
  }

  const handleRenew = async () => {
    if (!contractInfo?.address) return;

    try {
      writeContract({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        functionName: "renewSubscription",
        args: [creatorAddress as `0x${string}`],
        value: monthlyPrice,
      });
    } catch (error) {
      console.error("Renew failed:", error);
    }
  };

  const handleCancel = async () => {
    if (!contractInfo?.address) return;

    try {
      writeContract({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        functionName: "cancelSubscription",
        args: [creatorAddress as `0x${string}`],
      });
    } catch (error) {
      console.error("Cancel failed:", error);
    }
  };

  // Close modals and refresh when transaction is confirmed
  if (isConfirmed && (showRenewModal || showCancelModal)) {
    setShowRenewModal(false);
    setShowCancelModal(false);
    // Reload to refresh subscription status
    setTimeout(() => window.location.reload(), 1000);
  }

  return (
    <div className={`card shadow-lg ${cardStyle}`}>
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{creatorName}</h3>
            <p className="text-sm opacity-70 font-mono truncate">{creatorAddress.slice(0, 10)}...</p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <div
              className={`badge ${
                isActive && !isExpired ? "badge-outline" : !isActive && !isExpired ? "badge-warning" : "badge-error"
              }`}
            >
              {isActive && !isExpired ? "Active" : !isActive && !isExpired ? "Cancelled" : "Inactive"}
            </div>
            {isExpiringSoon && (
              <div className="badge badge-warning badge-sm">
                {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
              </div>
            )}
          </div>
        </div>

        {expiresAt && !isExpired && (
          <div className="mt-2 space-y-1">
            {!isActive && (
              <div className="alert alert-warning mb-2 py-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-5 w-5"
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
                <span className="text-xs">Cancelled - Access remains until expiry</span>
              </div>
            )}
            <div className="text-sm">
              <span className="opacity-80">Expires: </span>
              <span className={`font-medium ${isExpired ? "text-error" : ""}`}>{timeUntilExpiry}</span>
            </div>
            {subscribedAt && (
              <div className="text-sm opacity-80">
                Subscribed: {formatDistanceToNow(Number(subscribedAt) * 1000, { addSuffix: true })}
              </div>
            )}
            {monthlyPrice > 0 && <div className="text-sm opacity-80">Price: {formatEther(monthlyPrice)} ETH/month</div>}
          </div>
        )}

        {showActions && (
          <div className="card-actions justify-end mt-4 gap-2">
            {!isExpired ? (
              <>
                <Link href={`/creator/${creatorAddress}`}>
                  <button className="btn btn-sm btn-outline">View Content</button>
                </Link>
                {isActive ? (
                  <>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setShowRenewModal(true)}
                      disabled={isPending || isConfirming}
                    >
                      Renew
                    </button>
                    <button
                      className="btn btn-sm btn-ghost btn-error"
                      onClick={() => setShowCancelModal(true)}
                      disabled={isPending || isConfirming}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <Link href={`/subscribe/${creatorAddress}`}>
                    <button className="btn btn-sm btn-primary">Resubscribe</button>
                  </Link>
                )}
              </>
            ) : (
              <Link href={`/subscribe/${creatorAddress}`}>
                <button className="btn btn-sm btn-primary">Subscribe</button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Renew Modal */}
      <dialog className={`modal ${showRenewModal ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Renew Subscription</h3>
          <p className="py-4">
            Renew your subscription to <strong>{creatorName}</strong> for another 30 days?
          </p>
          <div className="alert alert-info mb-4">
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
            <div>
              <div className="text-sm">Price: {formatEther(monthlyPrice)} ETH</div>
              <div className="text-sm">Your subscription will be extended by 30 days</div>
            </div>
          </div>

          {isConfirmed && (
            <div className="alert alert-success mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Subscription renewed successfully!</span>
            </div>
          )}

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => setShowRenewModal(false)}
              disabled={isPending || isConfirming}
            >
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={handleRenew}
              disabled={isPending || isConfirming || isConfirmed}
            >
              {isPending || isConfirming ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Processing...
                </>
              ) : (
                `Renew for ${formatEther(monthlyPrice)} ETH`
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={() => setShowRenewModal(false)}>
          <button>close</button>
        </form>
      </dialog>

      {/* Cancel Modal */}
      <dialog className={`modal ${showCancelModal ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Cancel Subscription</h3>
          <p className="py-4">
            Are you sure you want to cancel your subscription to <strong>{creatorName}</strong>?
          </p>
          <div className="alert alert-warning mb-4">
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
            <div>
              <div className="text-sm font-semibold">Important:</div>
              <div className="text-sm">You will still have access to content until {timeUntilExpiry}</div>
              <div className="text-sm">No refunds will be issued</div>
            </div>
          </div>

          {isConfirmed && (
            <div className="alert alert-success mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Subscription cancelled. Access remains until expiry.</span>
            </div>
          )}

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => setShowCancelModal(false)}
              disabled={isPending || isConfirming}
            >
              Keep Subscription
            </button>
            <button
              className="btn btn-error"
              onClick={handleCancel}
              disabled={isPending || isConfirming || isConfirmed}
            >
              {isPending || isConfirming ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Processing...
                </>
              ) : (
                "Confirm Cancel"
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={() => setShowCancelModal(false)}>
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}
