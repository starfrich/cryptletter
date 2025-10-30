/**
 * useEthersProvider - Convert Wagmi client to Ethers.js Provider
 */
import { useMemo } from "react";
import { BrowserProvider, FallbackProvider, JsonRpcProvider } from "ethers";
import { usePublicClient } from "wagmi";

export function publicClientToProvider(publicClient: any) {
  const { chain, transport } = publicClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  if (transport.type === "fallback") {
    const providers = (transport.transports as ReturnType<any>[]).map(
      ({ value }: any) => new JsonRpcProvider(value?.url, network),
    );
    if (providers.length === 1) return providers[0];
    return new FallbackProvider(providers);
  }

  return new JsonRpcProvider(transport.url, network);
}

/** Hook to convert Wagmi PublicClient to Ethers.js Provider */
export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
  const publicClient = usePublicClient({ chainId });

  return useMemo(() => (publicClient ? publicClientToProvider(publicClient) : undefined), [publicClient]);
}
