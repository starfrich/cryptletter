"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreatorCard } from "../../components/cryptletter/CreatorCard";
import { useDeployedContractInfo } from "../../hooks/helper";
import type { AllowedChainIds } from "../../utils/helper/networks";
import { useAccount, useReadContract } from "wagmi";

const ITEMS_PER_PAGE = 9;

export function CreatorDiscovery() {
  const { chain } = useAccount();
  const chainId = chain?.id as AllowedChainIds | undefined;

  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "Cryptletter",
    chainId,
  });

  // Get total creator count
  const { data: creatorCount } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getCreatorCount",
    query: {
      enabled: Boolean(contractInfo?.address),
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Get creator list (first 50 for pagination)
  const { data: creatorAddresses } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getCreators",
    args: [BigInt(0), BigInt(50)],
    query: {
      enabled: Boolean(contractInfo?.address && creatorCount),
      refetchInterval: 10000,
    },
  });

  const [creators, setCreators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch individual creator details
  useEffect(() => {
    if (!creatorAddresses || !contractInfo?.address) return;

    const fetchCreators = async () => {
      setIsLoading(true);
      try {
        const addresses = creatorAddresses as string[];
        setCreators(
          addresses.map((addr: string) => ({
            address: addr,
          })),
        );
      } catch (error) {
        console.error("Error fetching creators:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreators();
  }, [creatorAddresses, contractInfo?.address]);

  // Filter creators based on search (will work once creator data is loaded)
  const filteredCreators = useMemo(() => {
    if (!searchQuery.trim()) return creators;
    const query = searchQuery.toLowerCase();
    return creators.filter((creator: any) => {
      // For now, filter by address
      // TODO: Once creator names are loaded, filter by name too
      return creator.address.toLowerCase().includes(query);
    });
  }, [creators, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCreators.length / ITEMS_PER_PAGE);
  const paginatedCreators = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCreators.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCreators, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (!contractInfo?.address) {
    return (
      <div className="alert shadow-lg">
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
            <h3 className="font-bold">Wallet Not Connected</h3>
            <div className="text-sm">Please connect your wallet to view creators</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="w-full sm:w-auto">
          <div className="text-sm text-base-content/60 mb-1">
            {creatorCount !== undefined ? (
              <span>
                <span className="font-semibold text-base-content">{Number(creatorCount)}</span> creator
                {Number(creatorCount) !== 1 ? "s" : ""} on the platform
              </span>
            ) : (
              <span className="loading loading-dots loading-sm"></span>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="form-control w-full sm:w-auto">
          <div className="input-group">
            <input
              type="text"
              placeholder="Search by address or name..."
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <p className="text-sm opacity-70">Loading creators...</p>
        </div>
      )}

      {/* Empty State - No Creators */}
      {!isLoading && creators.length === 0 && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body items-center text-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3">No Creators Yet</h3>
            <p className="text-base-content/70 mb-6 max-w-md">
              Be the first creator on the platform! Register now and start publishing encrypted newsletters.
            </p>
            <Link href="/dashboard" className="btn btn-primary btn-lg gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Become a Creator
            </Link>
          </div>
        </div>
      )}

      {/* Empty State - No Search Results */}
      {!isLoading && creators.length > 0 && filteredCreators.length === 0 && (
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
              No creators match &quot;{searchQuery}&quot;. Try a different search term.
            </p>
            <button className="btn btn-ghost btn-sm" onClick={() => setSearchQuery("")}>
              Clear Search
            </button>
          </div>
        </div>
      )}

      {/* Creator Grid */}
      {!isLoading && paginatedCreators.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCreators.map(creator => (
              <CreatorCardWrapper key={creator.address} address={creator.address} contractInfo={contractInfo} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-12">
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
  );
}

// Wrapper component to fetch individual creator data
function CreatorCardWrapper({ address, contractInfo }: { address: string; contractInfo: any }) {
  const { data: creatorData } = useReadContract({
    address: contractInfo?.address as `0x${string}`,
    abi: contractInfo?.abi,
    functionName: "getCreator",
    args: [address as `0x${string}`],
    query: {
      enabled: Boolean(contractInfo?.address && address),
    },
  });

  if (!creatorData) {
    return (
      <div className="card bg-base-200 shadow-lg h-full">
        <div className="card-body">
          <div className="skeleton h-8 w-3/4 mb-2"></div>
          <div className="skeleton h-4 w-full mb-4"></div>
          <div className="skeleton h-20 w-full"></div>
        </div>
      </div>
    );
  }

  // Handle both array and object responses from contract
  const dataArray = Array.isArray(creatorData) ? creatorData : Object.values(creatorData as any);
  const [name, bio, monthlyPrice, subscriberCount, isActive] = dataArray as [string, string, bigint, bigint, boolean];

  // Don't show inactive creators
  if (!isActive) {
    return null;
  }

  return (
    <CreatorCard
      address={address}
      name={name}
      bio={bio}
      monthlyPrice={monthlyPrice}
      subscriberCount={subscriberCount}
    />
  );
}
