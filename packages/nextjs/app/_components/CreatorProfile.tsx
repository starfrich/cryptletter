"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NewsletterPreview } from "../../components/cryptletter/NewsletterPreview";
import { Address } from "../../components/helper";
import { useDeployedContractInfo } from "../../hooks/helper";
import type { AllowedChainIds } from "../../utils/helper/networks";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";

const ITEMS_PER_PAGE = 5;

interface CreatorProfileProps {
  address: string;
}

export function CreatorProfile({ address: creatorAddress }: CreatorProfileProps) {
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

  // Get total newsletter count (we'll need to iterate through postCounter)
  const { data: postCounter } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "postCounter",
    query: {
      enabled: Boolean(contractInfo?.address),
    },
  });

  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [newslettersWithData, setNewslettersWithData] = useState<Map<number, any>>(new Map());
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch newsletters for this creator
  // Note: In production, you'd want to index this off-chain for better performance
  useEffect(() => {
    if (!contractInfo?.address || !postCounter) return;

    const fetchNewsletters = async () => {
      setIsLoadingPosts(true);
      try {
        const totalPosts = Number(postCounter);
        const creatorPosts: any[] = [];

        // This is inefficient but works for MVP
        // In production, use The Graph or similar indexing solution
        for (let i = 0; i < totalPosts; i++) {
          try {
            // We'd need to check if this post belongs to this creator
            // For now, we'll just add post IDs and let the preview component handle it
            creatorPosts.push({ postId: i });
          } catch (error) {
            console.error(`Error fetching post ${i}:`, error);
          }
        }

        // Sort by postId descending (newest first)
        creatorPosts.sort((a, b) => b.postId - a.postId);

        setNewsletters(creatorPosts);
      } catch (error) {
        console.error("Error fetching newsletters:", error);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    fetchNewsletters();
  }, [contractInfo?.address, postCounter, creatorAddress]);

  // Pagination logic - apply directly to newsletters (filtering happens in render)
  const totalPages = Math.ceil(newsletters.length / ITEMS_PER_PAGE);
  const paginatedNewsletters = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return newsletters.slice(start, start + ITEMS_PER_PAGE);
  }, [newsletters, currentPage]);

  // Calculate how many newsletters match the search
  const visibleNewsletterCount = useMemo(() => {
    if (!searchQuery.trim()) return newsletters.length;

    let count = 0;
    for (const newsletter of newsletters) {
      const data = newslettersWithData.get(newsletter.postId);
      if (!data) continue;

      const query = searchQuery.toLowerCase();
      const matchesTitle = data.title?.toLowerCase().includes(query);
      const matchesPreview = data.preview?.toLowerCase().includes(query);

      if (matchesTitle || matchesPreview) count++;
    }
    return count;
  }, [newsletters, newslettersWithData, searchQuery]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (!creatorData) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <div className="skeleton h-8 w-3/4 mb-4"></div>
            <div className="skeleton h-4 w-full mb-2"></div>
            <div className="skeleton h-4 w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle both array and object responses from contract
  const creatorArray = Array.isArray(creatorData) ? creatorData : Object.values(creatorData as any);
  const [name, bio, monthlyPrice, subscriberCount, isActive] = creatorArray as [
    string,
    string,
    bigint,
    bigint,
    boolean,
  ];

  const subscriptionArray = subscriptionData
    ? Array.isArray(subscriptionData)
      ? subscriptionData
      : Object.values(subscriptionData as any)
    : null;
  const [hasSubscription] = subscriptionArray || [false, BigInt(0), BigInt(0)];
  const isOwnProfile = userAddress?.toLowerCase() === creatorAddress.toLowerCase();

  if (!isActive) {
    return (
      <div className="max-w-4xl mx-auto">
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
          <span>This creator profile is not active</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Creator Header - Enhanced */}
      <div className="card bg-gradient-to-br from-base-200 to-base-300 shadow-2xl mb-8 overflow-hidden">
        <div className="card-body p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar/Icon */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl md:text-4xl font-bold text-white shadow-lg">
                {name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Info Section */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold mb-2 break-words">{name}</h1>
                  {isOwnProfile && (
                    <Link href="/dashboard">
                      <button className="btn btn-ghost btn-xs gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Go to Dashboard
                      </button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <Address address={creatorAddress} />
              </div>

              <p className="text-base md:text-lg opacity-80 mb-4 leading-relaxed">{bio}</p>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-6">
                <div className="flex items-center gap-2 bg-base-100 px-4 py-2 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-primary"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <div>
                    <span className="text-xl md:text-2xl font-bold">{Number(subscriberCount)}</span>
                    <span className="text-sm opacity-70 ml-1">subscribers</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-base-100 px-4 py-2 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-accent"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <span className="text-xl md:text-2xl font-bold">{formatEther(monthlyPrice)} ETH</span>
                    <span className="text-sm opacity-70 ml-1">/ month</span>
                  </div>
                </div>
              </div>

              {/* CTA Section */}
              {!isOwnProfile && (
                <div className="flex items-center gap-3">
                  {hasSubscription ? (
                    <div className="alert alert-success shadow-lg py-3">
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <h3 className="font-bold">Active Subscription</h3>
                        <div className="text-xs">You can access all premium content</div>
                      </div>
                    </div>
                  ) : (
                    <Link href={`/subscribe/${creatorAddress}`} className="w-full sm:w-auto">
                      <button className="btn btn-primary btn-lg w-full sm:w-auto gap-2 shadow-xl hover:shadow-2xl">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Subscribe Now
                      </button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Newsletters Section */}
      <div>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Newsletters</h2>
              <p className="text-sm opacity-70 mt-1">
                {isOwnProfile ? "Manage your published content" : "Latest content from this creator"}
              </p>
            </div>
            {isOwnProfile && (
              <Link href="/dashboard/publish">
                <button className="btn btn-primary gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden sm:inline">New Newsletter</span>
                </button>
              </Link>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-base-content/60">
              {newsletters.length > 0 && (
                <span>
                  <span className="font-semibold text-base-content">{newsletters.length}</span> newsletter
                  {newsletters.length !== 1 ? "s" : ""} published
                </span>
              )}
            </div>

            {/* Search Input */}
            <div className="form-control w-full sm:w-auto">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Search newsletters..."
                  className="input input-bordered w-full sm:w-64"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="btn btn-square btn-ghost" onClick={() => setSearchQuery("")}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {isLoadingPosts && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
            <p className="text-sm opacity-70">Loading newsletters...</p>
          </div>
        )}

        {!isLoadingPosts && newsletters.length === 0 && !searchQuery && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body text-center py-16">
              <div className="inline-block p-6 bg-base-300 rounded-full mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">No Newsletters Yet</h3>
              <p className="text-base-content/70 mb-6 max-w-md mx-auto">
                {isOwnProfile
                  ? "Start sharing your thoughts! Create your first newsletter and build your audience."
                  : "This creator hasn't published any content yet. Check back later for updates."}
              </p>
              {isOwnProfile && (
                <Link href="/dashboard/publish">
                  <button className="btn btn-primary btn-lg gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Write First Newsletter
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Empty State - No Search Results */}
        {!isLoadingPosts && newsletters.length > 0 && visibleNewsletterCount === 0 && searchQuery && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body items-center text-center py-12">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-base-content/30 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="text-xl font-bold mb-2">No Results Found</h3>
              <p className="text-base-content/70 mb-4">
                No newsletters match &quot;{searchQuery}&quot;. Try a different search term.
              </p>
              <button className="btn btn-ghost btn-sm" onClick={() => setSearchQuery("")}>
                Clear Search
              </button>
            </div>
          </div>
        )}

        {!isLoadingPosts && (searchQuery ? visibleNewsletterCount > 0 : paginatedNewsletters.length > 0) && (
          <>
            <div className="grid grid-cols-1 gap-6">
              {paginatedNewsletters.map(newsletter => (
                <NewsletterPreviewWrapper
                  key={newsletter.postId}
                  postId={newsletter.postId}
                  creatorAddress={creatorAddress}
                  creatorName={name}
                  contractInfo={contractInfo}
                  hasAccess={hasSubscription || isOwnProfile}
                  searchQuery={searchQuery}
                  setNewslettersWithData={setNewslettersWithData}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`btn btn-sm ${page === currentPage ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Wrapper to fetch individual newsletter data
function NewsletterPreviewWrapper({
  postId,
  creatorAddress,
  creatorName,
  contractInfo,
  hasAccess,
  searchQuery,
  setNewslettersWithData,
}: {
  postId: number;
  creatorAddress: string;
  creatorName: string;
  contractInfo: any;
  hasAccess: boolean;
  searchQuery: string;
  setNewslettersWithData: React.Dispatch<React.SetStateAction<Map<number, any>>>;
}) {
  const { data: newsletterData } = useReadContract({
    address: contractInfo?.address as `0x${string}`,
    abi: contractInfo?.abi,
    functionName: "getNewsletter",
    args: [BigInt(postId)],
    query: {
      enabled: Boolean(contractInfo?.address),
    },
  });

  // Notify parent when data is loaded (only once per data change)
  useEffect(() => {
    if (!newsletterData) return;

    const dataArray = Array.isArray(newsletterData) ? newsletterData : Object.values(newsletterData as any);
    const [, , title, preview, , , creator] = dataArray as [string, bigint, string, string, bigint, boolean, string];

    setNewslettersWithData(prev => {
      // Only update if data doesn't exist or has changed
      const existing = prev.get(postId);
      if (existing?.title === title && existing?.preview === preview) {
        return prev;
      }

      const newMap = new Map(prev);
      newMap.set(postId, { title, preview, creator });
      return newMap;
    });
  }, [newsletterData, postId, setNewslettersWithData]);

  if (!newsletterData) return null;

  // Handle both array and object responses from contract
  const dataArray = Array.isArray(newsletterData) ? newsletterData : Object.values(newsletterData as any);
  const [, , title, preview, publishedAt, isPublic, creator] = dataArray as [
    string,
    bigint,
    string,
    string,
    bigint,
    boolean,
    string,
  ];

  // Only show if this newsletter belongs to this creator
  if (creator.toLowerCase() !== creatorAddress.toLowerCase()) return null;

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    const matchesTitle = title.toLowerCase().includes(query);
    const matchesPreview = preview.toLowerCase().includes(query);
    if (!matchesTitle && !matchesPreview) return null;
  }

  return (
    <NewsletterPreview
      postId={postId.toString()}
      creatorAddress={creatorAddress}
      creatorName={creatorName}
      title={title}
      preview={preview}
      publishedAt={publishedAt}
      isPublic={isPublic}
      hasAccess={hasAccess}
    />
  );
}
