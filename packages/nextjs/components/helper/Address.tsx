import { BlockieAvatar } from "./BlockieAvatar";

interface AddressProps {
  address: string;
  size?: "xs" | "sm" | "md" | "lg";
  showAvatar?: boolean;
  showCopy?: boolean;
}

export function Address({ address, size = "md", showAvatar = true, showCopy = false }: AddressProps) {
  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const avatarSizes = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      // Could add toast notification here
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {showAvatar && <BlockieAvatar address={address} size={avatarSizes[size]} />}
      <span className={`font-mono ${sizeClasses[size]} opacity-80`}>{truncatedAddress}</span>
      {showCopy && (
        <button onClick={handleCopy} className="btn btn-ghost btn-xs" title="Copy address">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
