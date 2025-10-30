"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useDeployedContractInfo } from "../../hooks/helper";
import type { AllowedChainIds } from "../../utils/helper/networks";
import { notification } from "../../utils/helper/notification";
import { type CreatorRegistrationFormData, creatorRegistrationSchema } from "../../utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { formatEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

export function CreatorDashboardView() {
  const { address: userAddress, chain } = useAccount();
  const chainId = chain?.id as AllowedChainIds | undefined;

  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "Cryptletter",
    chainId,
  });

  // Get creator details
  const { data: creatorData } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getCreator",
    args: [userAddress as `0x${string}`],
    query: {
      enabled: Boolean(contractInfo?.address && userAddress),
    },
  });

  // Get post counter to calculate total posts
  const { data: postCounter } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "postCounter",
    query: {
      enabled: Boolean(contractInfo?.address),
    },
  });

  // Count posts belonging to this creator
  const [myPostsCount, setMyPostsCount] = React.useState(0);
  const [isCountingPosts, setIsCountingPosts] = React.useState(false);

  React.useEffect(() => {
    if (!contractInfo?.address || !postCounter || !userAddress || !chain) return;

    const countMyPosts = async () => {
      setIsCountingPosts(true);
      try {
        const totalPosts = Number(postCounter);
        let count = 0;

        // Iterate through all posts and count those belonging to this creator
        // Note: This is inefficient for large datasets. In production, use The Graph or similar indexer.
        const { createPublicClient, http } = await import("viem");

        const publicClient = createPublicClient({
          chain: chain, // Use current chain from wagmi
          transport: http(),
        });

        for (let i = 0; i < totalPosts; i++) {
          try {
            const newsletter = await publicClient.readContract({
              address: contractInfo.address as `0x${string}`,
              abi: contractInfo.abi,
              functionName: "newsletters",
              args: [BigInt(i)],
            });

            const creator = Array.isArray(newsletter) ? newsletter[6] : (newsletter as any)?.creator;

            if (creator?.toLowerCase() === userAddress.toLowerCase()) {
              count++;
            }
          } catch {
            // Skip this post if there's an error (might not exist or be deleted)
            continue;
          }
        }

        setMyPostsCount(count);
      } catch (error) {
        console.error("Error counting posts:", error);
        setMyPostsCount(0);
      } finally {
        setIsCountingPosts(false);
      }
    };

    countMyPosts();
  }, [contractInfo?.address, contractInfo?.abi, postCounter, userAddress, chain]);

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
        <span>Please connect your wallet to access the dashboard</span>
      </div>
    );
  }

  // Handle both array and object responses from contract
  const dataArray = creatorData ? (Array.isArray(creatorData) ? creatorData : Object.values(creatorData as any)) : null;
  const isRegistered = dataArray ? dataArray[4] : false;

  if (!isRegistered) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body p-6 md:p-8">
            {/* Header Section - Simplified */}
            <div className="text-center mb-6">
              <div className="inline-block p-3 bg-primary/10 rounded-xl mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Become a Creator</h2>
              <p className="text-sm opacity-70">
                Register your creator profile and start publishing encrypted content today.
              </p>
            </div>

            <div className="divider my-4"></div>

            <RegisterCreatorForm contractInfo={contractInfo} />
          </div>
        </div>
      </div>
    );
  }

  const [name, bio, monthlyPrice, subscriberCount] = dataArray as [string, string, bigint, bigint, boolean];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="opacity-70">Welcome back, {name}!</p>
        </div>
        <Link href={`/creator/${userAddress}`}>
          <button className="btn btn-ghost btn-sm">View Public Profile</button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-primary text-primary-content shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-4xl">{Number(subscriberCount)}</h3>
            <p className="opacity-80">Subscribers</p>
          </div>
        </div>

        <div className="card bg-secondary text-secondary-content shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-4xl">
              {isCountingPosts ? <span className="loading loading-spinner loading-md"></span> : myPostsCount}
            </h3>
            <p className="opacity-80">My Posts</p>
          </div>
        </div>

        <div className="card bg-accent text-accent-content shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-2xl">{formatEther(monthlyPrice)} ETH</h3>
            <p className="opacity-80">Monthly Price</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/dashboard/publish">
              <button className="btn btn-primary w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Publish New Newsletter
              </button>
            </Link>

            <Link href={`/creator/${userAddress}`}>
              <button className="btn btn-ghost w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View My Posts
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-4">Profile Information</h2>
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Name:</span> {name}
            </div>
            <div>
              <span className="font-semibold">Bio:</span> {bio}
            </div>
            <div>
              <span className="font-semibold">Monthly Price:</span> {formatEther(monthlyPrice)} ETH
            </div>
          </div>
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-ghost btn-sm" disabled>
              Edit Profile (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Register Creator Form Component
function RegisterCreatorForm({ contractInfo }: { contractInfo: any }) {
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isValid },
  } = useForm<CreatorRegistrationFormData>({
    resolver: zodResolver(creatorRegistrationSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      bio: "",
      price: "0.01",
    },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Track toast IDs for cleanup
  const [pendingToastId, setPendingToastId] = React.useState<string | null>(null);
  const [confirmingToastId, setConfirmingToastId] = React.useState<string | null>(null);

  // Show pending transaction toast
  useEffect(() => {
    if (isPending) {
      // Remove any existing toasts
      if (pendingToastId) notification.remove(pendingToastId);
      if (confirmingToastId) notification.remove(confirmingToastId);

      const toastId = notification.loading("Please confirm the transaction in your wallet...");
      setPendingToastId(toastId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  // Show confirming transaction toast
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

  // Auto-refresh page after successful registration
  useEffect(() => {
    if (isConfirmed) {
      // Remove all previous toasts
      if (pendingToastId) notification.remove(pendingToastId);
      if (confirmingToastId) notification.remove(confirmingToastId);

      notification.success(
        <div>
          <p className="font-bold">Registration successful!</p>
          <p className="text-sm opacity-80">Welcome to Cryptletter. Redirecting...</p>
        </div>,
        { duration: 3000 },
      );
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isConfirmed, pendingToastId, confirmingToastId]);

  // Show error toast when transaction fails
  useEffect(() => {
    if (error) {
      // Remove all previous toasts
      if (pendingToastId) notification.remove(pendingToastId);
      if (confirmingToastId) notification.remove(confirmingToastId);

      notification.error(
        <div>
          <p className="font-bold">Transaction failed</p>
          <p className="text-sm opacity-80">Please try again or check your wallet connection</p>
        </div>,
        { duration: 5000 },
      );
    }
  }, [error, pendingToastId, confirmingToastId]);

  const handleSubmit = handleFormSubmit((data: CreatorRegistrationFormData) => {
    if (!contractInfo?.address) {
      notification.error("Contract not found. Please check your connection.");
      return;
    }

    try {
      const priceWei = BigInt(parseFloat(data.price) * 1e18);

      writeContract({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        functionName: "registerCreator",
        args: [data.name, data.bio, priceWei],
      });
    } catch (error) {
      console.error("Registration error:", error);
      notification.error(error instanceof Error ? error.message : "Failed to prepare transaction");
    }
  });

  if (isConfirmed) {
    return (
      <div className="alert alert-success shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">Registration Successful!</h3>
            <p className="text-sm mt-1">Welcome to Cryptletter. Redirecting to your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Input */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Creator Name *</span>
          <span className="label-text-alt text-xs opacity-70">Max 50 characters</span>
        </label>
        <input
          type="text"
          placeholder="e.g., Jane Doe or TechInsights"
          className={`input input-bordered w-full focus:input-primary focus:border-primary transition-colors ${errors.name ? "input-error" : ""}`}
          disabled={isPending || isConfirming}
          {...register("name")}
        />
        {errors.name && <span className="text-error text-xs mt-1">{errors.name.message}</span>}
      </div>

      {/* Bio Input */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Bio *</span>
          <span className="label-text-alt text-xs opacity-70">Max 500 characters</span>
        </label>
        <textarea
          placeholder="I write about technology, privacy, and the future of decentralized content..."
          className={`textarea textarea-bordered w-full focus:textarea-primary focus:border-primary resize-none transition-colors ${errors.bio ? "textarea-error" : ""}`}
          rows={4}
          disabled={isPending || isConfirming}
          {...register("bio")}
        />
        {errors.bio && <span className="text-error text-xs mt-1">{errors.bio.message}</span>}
      </div>

      {/* Price Input */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Monthly Subscription Price *</span>
          <span className="label-text-alt text-xs opacity-70">Minimum: 0.001 ETH (~$3 USD)</span>
        </label>
        <div className="join w-full">
          <input
            type="number"
            placeholder="0.01"
            step="0.001"
            className={`input input-bordered join-item flex-1 focus:input-primary focus:border-primary transition-colors ${errors.price ? "input-error" : ""}`}
            disabled={isPending || isConfirming}
            {...register("price")}
          />
          <span className="join-item bg-base-300 px-4 flex items-center text-sm font-medium border border-base-300">
            ETH
          </span>
        </div>
        {errors.price && <span className="text-error text-xs mt-1">{errors.price.message}</span>}
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error shadow-lg">
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
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-bold">Transaction Failed</h3>
            <div className="text-xs">Please try again or check your wallet connection.</div>
          </div>
        </div>
      )}

      {/* Transaction Info */}
      {(isPending || isConfirming) && (
        <div className="alert alert-info shadow-lg">
          <div className="flex items-center gap-3 w-full">
            <span className="loading loading-spinner loading-sm"></span>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">
                {isConfirming ? "Confirming Transaction..." : "Preparing Transaction..."}
              </h4>
              <p className="text-xs mt-1 opacity-80">
                {isConfirming ? "Waiting for blockchain confirmation..." : "Please confirm in your wallet"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          className="btn btn-primary btn-lg w-full gap-3"
          disabled={isPending || isConfirming || !isValid}
        >
          {isPending || isConfirming ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              <span>{isConfirming ? "Confirming..." : "Preparing..."}</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">Register as Creator</span>
            </>
          )}
        </button>

        {/* Info Note */}
        <div className="text-center mt-4">
          <p className="text-xs opacity-70">Registration is permanent and requires a blockchain transaction</p>
        </div>
      </div>
    </form>
  );
}
