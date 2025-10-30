/**
 * FHEVM Instance Creation for Node.js
 *
 * This module provides Node.js-specific implementation for creating FHEVM instances.
 * It uses @zama-fhe/relayer-sdk/node instead of browser-based SDK loading.
 */

import type {
  FhevmInstance,
  CreateFhevmInstanceParams,
  FhevmRelayerStatus,
} from "./types";
import { FhevmError, FhevmAbortError, FhevmErrorCode } from "../types/errors";
import { tryFetchFHEVMHardhatNodeRelayerMetadata } from "./instance";

// Re-export error classes for convenience
export { FhevmError, FhevmAbortError, FhevmErrorCode } from "../types/errors";

/**
 * Check if running in Node.js environment
 */
export function isNodeEnvironment(): boolean {
  return typeof window === "undefined" && typeof process !== "undefined" && process.versions?.node !== undefined;
}

/**
 * Create an FHEVM instance for Node.js backend
 *
 * This function uses the Node.js-specific export of @zama-fhe/relayer-sdk
 * which doesn't require browser APIs like window or document.
 *
 * Supports automatic detection of FHEVM Hardhat localhost nodes.
 * When a Hardhat node with FHEVM plugin is detected, uses MockFhevmInstance
 * instead of relying on external relayer (no relayer dependency for localhost).
 *
 * @example
 * ```typescript
 * import { createFhevmInstanceNode } from '@fhevm-sdk/core/instance-node';
 *
 * // Localhost (auto-detects Hardhat + uses mock)
 * const instance = await createFhevmInstanceNode({
 *   provider: 'http://127.0.0.1:8545',
 *   signal: new AbortController().signal
 * });
 *
 * // Sepolia (uses real relayer SDK)
 * const instance = await createFhevmInstanceNode({
 *   provider: 'https://sepolia...',
 *   signal: new AbortController().signal
 * });
 * ```
 */
export const createFhevmInstanceNode = async (
  parameters: CreateFhevmInstanceParams
): Promise<FhevmInstance> => {
  const throwIfAborted = () => {
    if (signal.aborted) throw new FhevmAbortError();
  };

  const notify = (status: FhevmRelayerStatus) => {
    if (onStatusChange) onStatusChange(status);
  };

  const { signal, onStatusChange, provider: providerOrUrl, mockChains } = parameters;

  try {
    // Check if this is a mock chain (Hardhat localhost)
    const rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;

    if (rpcUrl) {
      // Try to detect if this is a Hardhat node with FHEVM mock support
      const fhevmRelayerMetadata = await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);

      if (fhevmRelayerMetadata) {
        // This is a FHEVM Hardhat Node - use mock instance
        notify("creating");

        const { JsonRpcProvider } = await import("ethers");
        const provider = new JsonRpcProvider(rpcUrl);
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);

        // Use mock instance for local Hardhat
        const fhevmMock = await import("../internal/mock/fhevmMock");
        const mockInstance = await fhevmMock.fhevmMockCreateInstance({
          rpcUrl,
          chainId,
          metadata: fhevmRelayerMetadata,
        });

        throwIfAborted();
        return mockInstance;
      }
    }

    // Not a Hardhat node - use real relayer SDK
    notify("sdk-loading");

    const { createInstance, SepoliaConfig } = await import(
      "@zama-fhe/relayer-sdk/node"
    );

    throwIfAborted();
    notify("sdk-loaded");

    // Determine if provider or RPC URL
    let network = providerOrUrl;

    // If string (RPC URL), we need to pass it as-is
    // The Node SDK will handle it internally
    if (typeof providerOrUrl === "string") {
      // For Node.js, we can use the RPC URL directly
      network = providerOrUrl;
    }

    notify("creating");

    // Determine chainId from provider
    let chainId: number | undefined;
    if (typeof network === "string") {
      const { JsonRpcProvider } = await import("ethers");
      const provider = new JsonRpcProvider(network);
      const networkInfo = await provider.getNetwork();
      chainId = Number(networkInfo.chainId);
    }

    // Create instance configuration
    // For Sepolia (chainId 11155111), use SepoliaConfig
    // For other networks, just pass network and let SDK handle it
    let instanceConfig: any;

    if (chainId === 11155111) {
      // For Sepolia, use SepoliaConfig with network override if different from default
      // SepoliaConfig already has: relayerUrl, gatewayChainId, ACL/KMS addresses, etc.
      // Only override network if user provided a different RPC URL
      if (typeof network === "string" && network !== SepoliaConfig.network) {
        instanceConfig = { ...SepoliaConfig, network };
        console.log(`[FHEVM SDK] Using Sepolia with custom RPC: ${network}`);
      } else {
        instanceConfig = { ...SepoliaConfig };
        console.log(`[FHEVM SDK] Using Sepolia with default config`);
      }
      console.log(`[FHEVM SDK] SepoliaConfig:`, {
        relayerUrl: SepoliaConfig.relayerUrl,
        gatewayChainId: SepoliaConfig.gatewayChainId,
        chainId: SepoliaConfig.chainId,
        aclAddress: SepoliaConfig.aclContractAddress,
      });
    } else {
      instanceConfig = { network };
    }

    // Create instance using Node SDK
    const instance = await createInstance(instanceConfig);

    throwIfAborted();

    return instance;
  } catch (error) {
    if (error instanceof FhevmAbortError) {
      throw error;
    }

    throw new FhevmError(
      FhevmErrorCode.NETWORK_ERROR,
      `Failed to create FHEVM instance in Node.js: ${(error as Error).message}`,
      error
    );
  }
};
