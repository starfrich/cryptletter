import Link from "next/link";
import { CreatorDiscovery } from "./_components/CreatorDiscovery";

export default function Home() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Hero Section - Simplified */}
      <div className="relative bg-gradient-to-br from-primary/5 to-secondary/5 px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4">Private. Encrypted. Yours.</h1>
          <p className="text-base md:text-lg opacity-75 mb-6 max-w-2xl mx-auto">
            Privacy-preserving content distribution. Only verified subscribers can decrypt premium content.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              Start Creating
            </Link>
          </div>
        </div>
      </div>

      {/* Creators Section - Moved to Top */}
      <div id="creators" className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Discover Creators</h2>
            <p className="text-base opacity-70">Browse and subscribe to privacy-focused newsletters</p>
          </div>
          <CreatorDiscovery />
        </div>
      </div>

      {/* Features - Compact */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 bg-base-200/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Why Cryptletter?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="text-4xl">🔒</div>
              <h3 className="font-bold">True Privacy</h3>
              <p className="text-sm opacity-70">FHE-encrypted content. Only subscribers can decrypt.</p>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <div className="text-4xl">💎</div>
              <h3 className="font-bold">Own Your Content</h3>
              <p className="text-sm opacity-70">IPFS storage, blockchain control. No intermediaries.</p>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <div className="text-4xl">💰</div>
              <h3 className="font-bold">Direct Earnings</h3>
              <p className="text-sm opacity-70">Set your price. Keep 100%. Monthly on-chain subscriptions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
