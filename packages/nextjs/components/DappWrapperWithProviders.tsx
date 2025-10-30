"use client";

import { FhevmProvider, useStorage } from "@fhevm-sdk/react";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { WagmiProvider, useAccount, useWalletClient } from "wagmi";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/helper";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Inner wrapper that has access to wagmi hooks and IndexedDB storage
 */
function FhevmProviderWrapper({ children }: { children: React.ReactNode }) {
  const { chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Initialize IndexedDB storage
  const { storage, isReady } = useStorage({ type: "indexeddb" });

  // Get provider from wallet client
  const provider = walletClient?.account ? walletClient : undefined;
  const chainId = chain?.id;

  // Wait for storage to be ready before rendering
  if (!isReady) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <FhevmProvider provider={provider as any} chainId={chainId} storage={storage!}>
      {children}
    </FhevmProvider>
  );
}

export const DappWrapperWithProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider avatar={BlockieAvatar} theme={darkTheme()}>
          <FhevmProviderWrapper>
            <ProgressBar height="3px" color="#2299dd" />
            <div className={`flex flex-col min-h-screen`}>
              <Header />
              <main className="relative flex flex-col flex-1">{children}</main>
            </div>
            <Toaster />
          </FhevmProviderWrapper>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
