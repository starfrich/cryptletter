"use client";

import Link from "next/link";
import { formatEther } from "viem";

interface CreatorCardProps {
  address: string;
  name: string;
  bio: string;
  monthlyPrice: bigint;
  subscriberCount: bigint;
}

export function CreatorCard({ address, name, bio, monthlyPrice, subscriberCount }: CreatorCardProps) {
  return (
    <Link href={`/creator/${address}`} className="group h-full">
      <div className="card bg-base-100 border border-base-300 hover:border-primary hover:shadow-2xl transition-all duration-300 cursor-pointer h-full group-hover:-translate-y-1">
        <div className="card-body p-5">
          {/* Header with Avatar */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="card-title text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                {name}
              </h2>
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-primary flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span className="text-sm font-semibold">{Number(subscriberCount)}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <p className="text-sm opacity-70 line-clamp-2 mb-4 min-h-[2.5rem]">{bio}</p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-base-300">
            <div className="flex items-center gap-2">
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
              <span className="font-semibold">{formatEther(monthlyPrice)} ETH</span>
              <span className="text-xs opacity-60">/mo</span>
            </div>
            <button className="btn btn-ghost btn-sm gap-1 group-hover:btn-primary transition-all">
              View
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
