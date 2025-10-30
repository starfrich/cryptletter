"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface NewsletterPreviewProps {
  postId: string;
  creatorAddress: string;
  creatorName: string;
  title: string;
  preview: string;
  publishedAt: bigint;
  isPublic: boolean;
  hasAccess?: boolean;
}

export function NewsletterPreview({
  postId,
  creatorAddress,
  creatorName,
  title,
  preview,
  publishedAt,
  isPublic,
  hasAccess = false,
}: NewsletterPreviewProps) {
  const timestamp = Number(publishedAt) * 1000;
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });

  // Format preview to highlight [Image] placeholders
  const formatPreview = (text: string) => {
    const parts = text.split(/(\[Image\])/gi);
    return parts.map((part, index) => {
      if (part.match(/\[Image\]/i)) {
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 bg-base-300 rounded text-xs font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
            Image
          </span>
        );
      }
      return part;
    });
  };

  return (
    <Link href={`/creator/${creatorAddress}/post/${postId}`}>
      <div className="card bg-base-200 hover:bg-base-300 transition-all shadow-md cursor-pointer">
        <div className="card-body">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="card-title text-lg flex-1">{title}</h3>
            <div className="flex gap-2">
              {isPublic && <div className="badge badge-success">Free</div>}
              {!isPublic && hasAccess && <div className="badge badge-info">Unlocked</div>}
              {!isPublic && !hasAccess && <div className="badge badge-warning">Premium</div>}
            </div>
          </div>

          <div className="text-sm opacity-70 mb-2">
            by {creatorName} • {timeAgo}
          </div>

          <p className="text-sm opacity-80 line-clamp-3">{formatPreview(preview)}</p>

          {!isPublic && !hasAccess && (
            <div className="alert alert-warning mt-3 py-2">
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
              <span className="text-xs">Subscribe to read the full content</span>
            </div>
          )}

          <div className="card-actions justify-end mt-2">
            <button className="btn btn-sm btn-ghost">{hasAccess || isPublic ? "Read More →" : "View Preview →"}</button>
          </div>
        </div>
      </div>
    </Link>
  );
}
