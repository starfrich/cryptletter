"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type NewsletterContent, NewsletterEditor } from "../../components/cryptletter/NewsletterEditor";
import { NewsletterViewer } from "../../components/cryptletter/NewsletterViewer";
import { useDeployedContractInfo, useRetryableOperation } from "../../hooks/helper";
import { useEthersProvider } from "../../hooks/helper/useEthersProvider";
import { useEthersSigner } from "../../hooks/helper/useEthersSigner";
import type { AllowedChainIds } from "../../utils/helper/networks";
import { notification } from "../../utils/helper/notification";
import { useCryptletter } from "@fhevm-sdk/react";
import { useAccount, useReadContract } from "wagmi";

export function PublishEditor() {
  const router = useRouter();
  const { address: userAddress, chain } = useAccount();
  const chainId = chain?.id as AllowedChainIds | undefined;
  const provider = useEthersProvider();
  const signer = useEthersSigner();

  const [content, setContent] = useState<NewsletterContent>({ title: "", contentHtml: "", contentJson: null });
  const [isPublic, setIsPublic] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishedPostId, setPublishedPostId] = useState<bigint | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { execute: executeWithRetry, isRetrying, retryCount } = useRetryableOperation();

  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "Cryptletter",
    chainId,
  });

  // Initialize Cryptletter SDK
  const ipfsJWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";
  const ipfsGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY
    ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}`
    : undefined;
  const cryptletter = useCryptletter({
    contractAddress: contractInfo?.address || "",
    contractABI: (contractInfo?.abi as any) || [],
    ipfsJWT,
    ipfsGateway,
    provider: provider as any,
    signer: signer as any,
  });

  // Check if user is a registered creator using wagmi
  const { data: creatorData, isLoading: isLoadingCreator } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getCreator",
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: Boolean(contractInfo?.address && userAddress),
    },
  });

  // Extract creator data
  const creatorArray = creatorData
    ? Array.isArray(creatorData)
      ? creatorData
      : Object.values(creatorData as any)
    : null;
  // Creator struct: [name, bio, monthlyPrice, subscriberCount, isActive]
  const isRegistered = creatorArray ? (creatorArray[4] as boolean) : false;

  const handlePublish = async () => {
    if (!contractInfo?.address || !userAddress) {
      notification.error("Please connect your wallet");
      setPublishError("Please connect your wallet");
      return;
    }

    // Validate title length
    if (!content.title || content.title.trim().length === 0) {
      notification.error("Newsletter title is required");
      setPublishError("Newsletter title is required");
      return;
    }
    if (content.title.length > 200) {
      notification.error("Newsletter title must be 200 characters or less");
      setPublishError("Newsletter title must be 200 characters or less");
      return;
    }

    // Validate content
    if (!content.contentHtml || content.contentHtml.trim().length === 0) {
      notification.error("Newsletter content is required");
      setPublishError("Newsletter content is required");
      return;
    }

    if (!ipfsJWT) {
      notification.error("IPFS configuration missing. Please add NEXT_PUBLIC_PINATA_JWT to your .env file");
      setPublishError("IPFS configuration missing. Please add NEXT_PUBLIC_PINATA_JWT to your .env file");
      return;
    }

    setPublishError(null);

    // Show loading toast
    const loadingToast = notification.loading("Publishing newsletter to blockchain...");

    try {
      // Process images: extract from content, upload to IPFS, replace with IPFS URLs
      // Note: Image encryption is handled inside publishNewsletter when isPublic=false
      // XSS protection is handled by NewsletterViewer during rendering
      const result = await executeWithRetry(
        () =>
          cryptletter.publishNewsletter({
            title: content.title,
            content: content.contentHtml,
            contentJson: content.contentJson,
            author: userAddress,
            isPublic,
          }),
        {
          maxRetries: 3,
          onRetry: (attempt: number) => {
            // Remove previous loading toast and show retry info
            notification.remove(loadingToast);
            notification.info(`Retrying... Attempt ${attempt} of 3`, { duration: 3000 });
          },
        },
      );

      // Remove loading toast and show success
      notification.remove(loadingToast);
      notification.success(
        <div>
          <p className="font-bold">Newsletter published successfully!</p>
          <p className="text-sm opacity-80">Post ID: {result.postId.toString()}</p>
        </div>,
        { duration: 5000 },
      );

      setPublishedPostId(result.postId);
      setPublishSuccess(true);
    } catch (error) {
      console.error("Publishing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to publish newsletter. Please try again.";

      // Remove loading toast and show error
      notification.remove(loadingToast);
      notification.error(
        <div>
          <p className="font-bold">Publishing failed</p>
          <p className="text-sm opacity-80">{errorMessage}</p>
        </div>,
        { duration: 5000 },
      );

      setPublishError(errorMessage);
    }
  };

  // Show loading state while checking creator status
  if (isLoadingCreator) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Show registration prompt if user is not a creator
  if (!isRegistered && userAddress) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-gradient-to-br from-warning/20 to-warning/5 shadow-2xl border border-warning/30">
          <div className="card-body text-center py-12">
            <div className="inline-block p-6 bg-warning/20 rounded-full mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-warning"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3">Creator Registration Required</h2>
            <p className="text-lg opacity-80 mb-6">
              You need to register as a creator before you can publish newsletters
            </p>
            <div className="divider my-6"></div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard" className="btn btn-primary btn-lg gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
                Register as Creator
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (publishSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-gradient-to-br from-success/20 to-success/5 shadow-2xl border border-success/30">
          <div className="card-body text-center py-12">
            <div className="inline-block p-6 bg-success/20 rounded-full mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3">Newsletter Published!</h2>
            <p className="text-lg opacity-80 mb-2">Your newsletter has been successfully published on the blockchain</p>
            {publishedPostId && (
              <div className="badge badge-success badge-lg mt-2">Post ID: {publishedPostId.toString()}</div>
            )}
            <div className="divider my-6"></div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                className="btn btn-primary btn-lg gap-2"
                onClick={() => {
                  router.push(`/creator/${userAddress}`);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                View on Profile
              </button>
              <button
                className="btn btn-outline btn-lg gap-2"
                onClick={() => {
                  setPublishSuccess(false);
                  setPublishedPostId(null);
                  setContent({ title: "", contentHtml: "", contentJson: null });
                  setIsPublic(false);
                  setPublishError(null);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Publish Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tab Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Create Newsletter</h1>
          <p className="text-sm opacity-70 mt-1">
            {showPreview ? "Preview how your newsletter will look" : "Write and format your newsletter content"}
          </p>
        </div>
        <div className="tabs tabs-boxed bg-base-200">
          <button
            className={`tab ${!showPreview ? "tab-active" : ""}`}
            onClick={() => setShowPreview(false)}
            disabled={cryptletter.isPublishing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            className={`tab ${showPreview ? "tab-active" : ""}`}
            onClick={() => setShowPreview(true)}
            disabled={cryptletter.isPublishing || !content.title || !content.contentHtml}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {showPreview ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Preview</h2>
              <div className={`badge ${isPublic ? "badge-info" : "badge-warning"}`}>
                {isPublic ? "Free Newsletter" : "Premium Newsletter"}
              </div>
            </div>
            <div className="divider my-2"></div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{content.title || "Untitled Newsletter"}</h1>
            {content.contentHtml ? (
              <NewsletterViewer content={content.contentHtml} />
            ) : (
              <div className="text-center py-12 opacity-50">
                <p>No content to preview yet. Switch to Edit mode to start writing.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <NewsletterEditor initialContent={content} onChange={setContent} disabled={cryptletter.isPublishing} />
          </div>
        </div>
      )}

      {/* Publishing Options */}
      <div className="card bg-gradient-to-br from-base-200 to-base-300 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="font-bold text-lg">Publishing Options</h3>
          </div>

          <div className="form-control bg-base-100 p-4 rounded-lg">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="toggle toggle-lg toggle-primary"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                disabled={cryptletter.isPublishing}
              />
              <span className="label-text flex-1">
                <div className="font-semibold text-base mb-1">Make this newsletter free</div>
                <div className="text-sm opacity-70">
                  {isPublic
                    ? "Anyone can read this newsletter without subscribing"
                    : "Only your paid subscribers can read this newsletter"}
                </div>
              </span>
            </label>
          </div>

          {!ipfsJWT && (
            <div className="alert alert-warning mt-4">
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
                <h3 className="font-bold">IPFS Configuration Missing</h3>
                <div className="text-sm">Add NEXT_PUBLIC_PINATA_JWT to your .env file to publish newsletters</div>
              </div>
            </div>
          )}

          {publishError && (
            <div className="alert alert-error mt-4 shadow-lg">
              <div className="flex items-start gap-3 w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6 flex-shrink-0"
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
                <div className="flex-1">
                  <h3 className="font-bold">Publishing Failed</h3>
                  <div className="text-sm">{publishError}</div>
                  {retryCount > 0 && <div className="text-xs mt-1 opacity-70">Attempted {retryCount} retries</div>}
                </div>
                <button className="btn btn-sm btn-outline btn-error" onClick={handlePublish} disabled={isRetrying}>
                  {isRetrying ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      <span>Retrying...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Retry</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {cryptletter.isPublishing && (
            <div className="alert alert-info mt-4 shadow-lg">
              <div className="flex items-start gap-3 w-full">
                <span className="loading loading-spinner loading-md flex-shrink-0"></span>
                <div className="flex-1">
                  <h4 className="font-bold mb-1">Publishing Newsletter...</h4>
                  <p className="text-sm opacity-90 mb-2">
                    This involves multiple steps: encrypting content, uploading to IPFS, and writing to blockchain.
                  </p>
                  <progress className="progress progress-primary w-full"></progress>
                </div>
              </div>
            </div>
          )}

          <div className="divider"></div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              className="btn btn-ghost btn-lg order-2 sm:order-1"
              onClick={() => router.push("/dashboard")}
              disabled={cryptletter.isPublishing}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary btn-lg gap-2 order-1 sm:order-2 shadow-lg hover:shadow-xl"
              onClick={handlePublish}
              disabled={!content.title || !content.contentHtml || cryptletter.isPublishing || !ipfsJWT}
            >
              {cryptletter.isPublishing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  <span>Publish {isPublic ? "Free" : "Premium"} Newsletter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
