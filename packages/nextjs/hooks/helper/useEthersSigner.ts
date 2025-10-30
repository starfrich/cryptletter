/**
 * useEthersSigner - Convert Wagmi WalletClient to Ethers.js Signer
 */
import { useMemo } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { useWalletClient } from "wagmi";

export function walletClientToSigner(walletClient: any) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);
  return signer;
}

/** Hook to convert Wagmi WalletClient to Ethers.js Signer */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: walletClient } = useWalletClient({ chainId });

  return useMemo(() => (walletClient ? walletClientToSigner(walletClient) : undefined), [walletClient]);
}
