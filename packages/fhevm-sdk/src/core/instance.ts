/**
 * FHEVM Instance Creation
 *
 * This module provides framework-agnostic functions for creating FHEVM instances.
 * It handles both real FHEVM networks and mock chains for testing.
 */

import { isAddress, Eip1193Provider, JsonRpcProvider } from "ethers";
import type {
  FhevmInstance,
  FhevmInstanceConfig,
  CreateFhevmInstanceParams,
  FhevmRelayerStatus,
  FhevmWindowType,
} from "./types";
import { FhevmError, FhevmAbortError } from "../types/errors";
import { FhevmErrorCode } from "../types/errors";
import { isFhevmWindowType, RelayerSDKLoader } from "../internal/RelayerSDKLoader";
import { publicKeyStorageGet, publicKeyStorageSet } from "../internal/PublicKeyStorage";

// Re-export error classes for convenience
export { FhevmError, FhevmAbortError, FhevmErrorCode } from "../types/errors";

/**
 * Throws an FhevmError with the given code and message
 */
function throwFhevmError(
  code: FhevmErrorCode,
  message?: string,
  cause?: unknown
): never {
  throw new FhevmError(code, message, cause);
}

/**
 * Check if RelayerSDK is initialized on the window object
 */
const isFhevmInitialized = (): boolean => {
  if (!isFhevmWindowType(window, console.log)) {
    return false;
  }
  return window.relayerSDK.__initialized__ === true;
};

/**
 * Load the RelayerSDK script dynamically
 */
const fhevmLoadSDK = async (): Promise<void> => {
  const loader = new RelayerSDKLoader({ trace: console.log });
  return loader.load();
};

/**
 * Initialize the RelayerSDK with optional configuration
 */
const fhevmInitSDK = async (options?: any): Promise<boolean> => {
  if (!isFhevmWindowType(window, console.log)) {
    throw new Error("window.relayerSDK is not available");
  }
  const result = await window.relayerSDK.initSDK(options);
  window.relayerSDK.__initialized__ = result;
  if (!result) {
    throw new Error("window.relayerSDK.initSDK failed.");
  }
  return true;
};

/**
 * Type guard to check if value is a valid Ethereum address
 */
function checkIsAddress(a: unknown): a is `0x${string}` {
  if (typeof a !== "string") {
    return false;
  }
  if (!isAddress(a)) {
    return false;
  }
  return true;
}

/**
 * Get chain ID from provider or RPC URL
 */
async function getChainId(
  providerOrUrl: Eip1193Provider | string
): Promise<number> {
  if (typeof providerOrUrl === "string") {
    const provider = new JsonRpcProvider(providerOrUrl);
    return Number((await provider.getNetwork()).chainId);
  }
  const chainId = await providerOrUrl.request({ method: "eth_chainId" });
  return Number.parseInt(chainId as string, 16);
}

/**
 * Get Web3 client version from RPC URL
 */
async function getWeb3Client(rpcUrl: string): Promise<string> {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const version = await rpc.send("web3_clientVersion", []);
    return version;
  } catch (e) {
    throwFhevmError(
      FhevmErrorCode.NETWORK_ERROR,
      `The URL ${rpcUrl} is not a Web3 node or is not reachable. Please check the endpoint.`,
      e
    );
  } finally {
    rpc.destroy();
  }
}

/**
 * Try to fetch FHEVM Hardhat node relayer metadata
 * Returns metadata if the RPC URL points to a FHEVM Hardhat node, undefined otherwise
 */
export async function tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl: string): Promise<
  | {
      ACLAddress: `0x${string}`;
      InputVerifierAddress: `0x${string}`;
      KMSVerifierAddress: `0x${string}`;
    }
  | undefined
> {
  const version = await getWeb3Client(rpcUrl);
  if (
    typeof version !== "string" ||
    !version.toLowerCase().includes("hardhat")
  ) {
    // Not a Hardhat Node
    return undefined;
  }
  try {
    const metadata = await getFHEVMRelayerMetadata(rpcUrl);
    if (!metadata || typeof metadata !== "object") {
      return undefined;
    }
    if (
      !(
        "ACLAddress" in metadata &&
        typeof metadata.ACLAddress === "string" &&
        metadata.ACLAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    if (
      !(
        "InputVerifierAddress" in metadata &&
        typeof metadata.InputVerifierAddress === "string" &&
        metadata.InputVerifierAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    if (
      !(
        "KMSVerifierAddress" in metadata &&
        typeof metadata.KMSVerifierAddress === "string" &&
        metadata.KMSVerifierAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    return metadata;
  } catch {
    // Not a FHEVM Hardhat Node
    return undefined;
  }
}

/**
 * Get FHEVM relayer metadata from RPC URL
 */
async function getFHEVMRelayerMetadata(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const version = await rpc.send("fhevm_relayer_metadata", []);
    return version;
  } catch (e) {
    throwFhevmError(
      FhevmErrorCode.NETWORK_ERROR,
      `The URL ${rpcUrl} is not a FHEVM Hardhat node or is not reachable. Please check the endpoint.`,
      e
    );
  } finally {
    rpc.destroy();
  }
}

/**
 * Result of resolving provider to chain info
 */
type MockResolveResult = { isMock: true; chainId: number; rpcUrl: string };
type GenericResolveResult = { isMock: false; chainId: number; rpcUrl?: string };
type ResolveResult = MockResolveResult | GenericResolveResult;

/**
 * Resolve provider or URL to chain ID and RPC URL
 * Determines if the chain should be treated as a mock chain
 */
async function resolve(
  providerOrUrl: Eip1193Provider | string,
  mockChains?: Record<number, string>
): Promise<ResolveResult> {
  // Resolve chainId
  const chainId = await getChainId(providerOrUrl);

  // Resolve rpc url
  let rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;

  const _mockChains: Record<number, string> = {
    31337: "http://localhost:8545",
    ...(mockChains ?? {}),
  };

  // Help Typescript solver here:
  if (Object.hasOwn(_mockChains, chainId)) {
    if (!rpcUrl) {
      rpcUrl = _mockChains[chainId];
    }

    return { isMock: true, chainId, rpcUrl };
  }

  return { isMock: false, chainId, rpcUrl };
}

/**
 * Create an FHEVM instance for encrypting/decrypting data
 *
 * This is the main entry point for creating an FHEVM instance. It handles:
 * - Node.js environment detection and uses @zama-fhe/relayer-sdk/node
 * - Mock chains (e.g., Hardhat local node) with dynamic import of mock utilities
 * - Real FHEVM chains using the RelayerSDK (browser)
 * - Public key caching in IndexedDB (browser)
 * - Abortion via AbortSignal
 *
 * @example
 * ```typescript
 * // Browser
 * const instance = await createFhevmInstance({
 *   provider: window.ethereum,
 *   signal: controller.signal,
 *   onStatusChange: (status) => console.log(status)
 * });
 *
 * // Node.js
 * const instance = await createFhevmInstance({
 *   provider: 'https://sepolia-rpc-url',
 *   signal: controller.signal
 * });
 * ```
 */
export const createFhevmInstance = async (
  parameters: CreateFhevmInstanceParams
): Promise<FhevmInstance> => {
  // Detect Node.js environment
  const isNode = typeof window === "undefined" && typeof process !== "undefined";

  if (isNode) {
    // Use Node.js-specific implementation
    const { createFhevmInstanceNode } = await import("./instance-node");
    return createFhevmInstanceNode(parameters);
  }

  // Browser implementation continues below
  const throwIfAborted = () => {
    if (signal.aborted) throw new FhevmAbortError();
  };

  const notify = (status: FhevmRelayerStatus) => {
    if (onStatusChange) onStatusChange(status);
  };

  const {
    signal,
    onStatusChange,
    provider: providerOrUrl,
    mockChains,
  } = parameters;

  // Resolve chainId
  const { isMock, rpcUrl, chainId } = await resolve(providerOrUrl, mockChains);

  if (isMock) {
    // Throws an error if cannot connect or url does not refer to a Web3 client
    const fhevmRelayerMetadata =
      await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);

    if (fhevmRelayerMetadata) {
      // fhevmRelayerMetadata is defined, which means rpcUrl refers to a FHEVM Hardhat Node
      notify("creating");

      //////////////////////////////////////////////////////////////////////////
      //
      // WARNING!!
      // ALWAYS USE DYNAMIC IMPORT TO AVOID INCLUDING THE ENTIRE FHEVM MOCK LIB
      // IN THE FINAL PRODUCTION BUNDLE!!
      //
      //////////////////////////////////////////////////////////////////////////
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

  throwIfAborted();

  if (!isFhevmWindowType(window, console.log)) {
    notify("sdk-loading");

    // throws an error if failed
    await fhevmLoadSDK();
    throwIfAborted();

    notify("sdk-loaded");
  }

  // notify that state === "sdk-loaded"

  if (!isFhevmInitialized()) {
    notify("sdk-initializing");

    // throws an error if failed
    await fhevmInitSDK();
    throwIfAborted();

    notify("sdk-initialized");
  }

  const relayerSDK = (window as unknown as FhevmWindowType).relayerSDK;

  const aclAddress = relayerSDK.SepoliaConfig.aclContractAddress;
  if (!checkIsAddress(aclAddress)) {
    throw new Error(`Invalid address: ${aclAddress}`);
  }

  const pub = await publicKeyStorageGet(aclAddress);
  throwIfAborted();

  const config: FhevmInstanceConfig = {
    ...relayerSDK.SepoliaConfig,
    network: providerOrUrl,
    publicKey: pub.publicKey,
    publicParams: pub.publicParams,
  };

  // notify that state === "creating"
  notify("creating");

  const instance = await relayerSDK.createInstance(config);

  // Save the key even if aborted
  await publicKeyStorageSet(
    aclAddress,
    instance.getPublicKey(),
    instance.getPublicParams(2048)
  );

  throwIfAborted();

  return instance;
};
