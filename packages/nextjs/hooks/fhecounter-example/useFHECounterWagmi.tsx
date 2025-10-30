"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDeployedContractInfo } from "../helper";
import { useWagmiEthers } from "../wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import {
  buildParamsFromAbi,
  getEncryptionMethod,
  useFHEDecrypt,
  useFHEEncryption,
  useInMemoryStorage,
  useWalletCallbacks,
  type IFhevmStorage,
} from "@fhevm-sdk";
import { ethers } from "ethers";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";
import { useReadContract } from "wagmi";
import {
  handleError,
  shouldRetry,
  isUserError,
  validateAddress,
  retryEncryptionOperation,
  startPerformanceTimer,
  logDebug,
  logWarn,
  logError,
} from "~/lib/utils";

/**
 * useFHECounterWagmi - Minimal FHE Counter hook for Wagmi devs
 *
 * What it does:
 * - Reads the current encrypted counter
 * - Decrypts the handle on-demand with useFHEDecrypt
 * - Encrypts inputs and writes increment/decrement
 *
 * Pass your FHEVM instance and an optional storage for the decryption signature.
 * If no storage is provided, it will use in-memory storage by default.
 * For persistent storage (survives page reload), pass IndexedDB storage.
 */
export const useFHECounterWagmi = (parameters: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
  /** Storage for decryption signatures. Defaults to in-memory storage if not provided. */
  storage?: IFhevmStorage;
}) => {
  const { instance, initialMockChains, storage: providedStorage } = parameters;
  const { storage: defaultStorage } = useInMemoryStorage();

  // Use provided storage or fall back to in-memory storage
  const fhevmDecryptionSignatureStorage = providedStorage || defaultStorage;

  // Wagmi + ethers interop
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  // Resolve deployed contract info once we know the chain
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: fheCounter } = useDeployedContractInfo({ contractName: "FHECounter", chainId: allowedChainId });

  // Simple status string for UX messages
  const [message, setMessage] = useState<string>("");

  type FHECounterInfo = Contract<"FHECounter"> & { chainId?: number };

  const isRefreshing = false as unknown as boolean; // derived from wagmi below
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // -------------
  // Helpers
  // -------------
  const hasContract = Boolean(fheCounter?.address && fheCounter?.abi);
  const hasProvider = Boolean(ethersReadonlyProvider);
  const hasSigner = Boolean(ethersSigner);

  const getContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(
      fheCounter!.address,
      JSON.stringify((fheCounter as FHECounterInfo).abi), // Convert to JSON string for ethers
      providerOrSigner,
    );
  };

  // Read count handle via wagmi
  const readResult = useReadContract({
    address: (hasContract ? (fheCounter!.address as unknown as `0x${string}`) : undefined) as
      | `0x${string}`
      | undefined,
    abi: (hasContract ? ((fheCounter as FHECounterInfo).abi as any) : undefined) as any,
    functionName: "getCount" as const,
    query: {
      enabled: Boolean(hasContract && hasProvider),
      refetchOnWindowFocus: false,
    },
  });

  const countHandle = useMemo(() => (readResult.data as string | undefined) ?? undefined, [readResult.data]);
  const canGetCount = Boolean(hasContract && hasProvider && !readResult.isFetching);
  const refreshCountHandle = useCallback(async () => {
    try {
      logDebug("Refreshing count handle...");
      const timer = startPerformanceTimer("refresh_count");
      const res = await readResult.refetch();
      const metric = timer();
      logDebug(`Count refreshed in ${metric.durationMs}ms`);
      if (res.error) {
        const errorMsg = handleError(res.error);
        setMessage(`Failed to read count: ${errorMsg}`);
        logError("FHECounter.getCount() failed", res.error);
      }
    } catch (e) {
      const errorMsg = handleError(e);
      setMessage(errorMsg);
      logError("Error refreshing count", e);
    }
  }, [readResult]);
  // derive isRefreshing from wagmi
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _derivedIsRefreshing = readResult.isFetching;

  // Wagmi handles initial fetch via `enabled`

  // Create wallet callbacks from ethers signer
  const { signTypedData, getAddress } = useWalletCallbacks({ ethersSigner });

  // Decrypt (reuse existing decrypt hook for simplicity)
  const requests = useMemo(() => {
    if (!hasContract || !countHandle || countHandle === ethers.ZeroHash) return undefined;
    return [{ handle: countHandle, contractAddress: fheCounter!.address } as const];
  }, [hasContract, fheCounter?.address, countHandle]);

  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    message: decMsg,
    results,
  } = useFHEDecrypt({
    instance,
    signTypedData,
    getAddress,
    fhevmDecryptionSignatureStorage,
    chainId,
    requests,
  });

  useEffect(() => {
    if (decMsg) setMessage(decMsg);
  }, [decMsg]);

  const clearCount = useMemo(() => {
    if (!countHandle) return undefined;
    if (countHandle === ethers.ZeroHash) return { handle: countHandle, clear: BigInt(0) } as const;
    const clear = results[countHandle];
    if (typeof clear === "undefined") return undefined;
    return { handle: countHandle, clear } as const;
  }, [countHandle, results]);

  const isDecrypted = Boolean(countHandle && clearCount?.handle === countHandle);
  const decryptCountHandle = decrypt;

  // Mutations (increment/decrement)
  const { encryptWith } = useFHEEncryption({ instance, getAddress, contractAddress: fheCounter?.address });
  const canUpdateCounter = useMemo(
    () => Boolean(hasContract && instance && hasSigner && !isProcessing),
    [hasContract, instance, hasSigner, isProcessing],
  );

  const getEncryptionMethodFor = (functionName: "increment" | "decrement") => {
    if (!fheCounter?.abi) {
      return { method: undefined as string | undefined, error: "Contract ABI not available" } as const;
    }

    try {
      // Find the function in ABI
      const functionAbi = fheCounter.abi.find(
        (item: any) => item.type === "function" && item.name === functionName
      );

      if (!functionAbi) {
        return { method: undefined as string | undefined, error: `Function ABI not found for ${functionName}` } as const;
      }

      if (!functionAbi.inputs || functionAbi.inputs.length === 0) {
        return { method: undefined as string | undefined, error: `No inputs found for ${functionName}` } as const;
      }

      // Get the internalType from the first parameter
      const internalType = functionAbi.inputs[0].internalType as string;

      if (!internalType) {
        return { method: undefined as string | undefined, error: `No internalType found for ${functionName}` } as const;
      }

      // Use SDK utility to get the encryption method
      const method = getEncryptionMethod(internalType);
      return { method, error: undefined } as const;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : `Failed to get encryption method for ${functionName}`;
      return { method: undefined as string | undefined, error: errorMsg } as const;
    }
  };

  const updateCounter = useCallback(
    async (value: number) => {
      if (isProcessing || !canUpdateCounter || value === 0) return;
      const op = value > 0 ? "increment" : "decrement";
      const valueAbs = Math.abs(value);
      setIsProcessing(true);
      setMessage(`Starting ${op}(${valueAbs})...`);

      const timer = startPerformanceTimer(`counter_${op}`);

      try {
        // Validate contract address
        if (!validateAddress(fheCounter?.address)) {
          const msg = handleError(new Error("Invalid contract address"));
          setMessage(msg);
          logError("Invalid contract address", fheCounter?.address);
          return;
        }

        const { method, error } = getEncryptionMethodFor(op);
        if (!method) {
          const msg = error ?? "Encryption method not found";
          setMessage(msg);
          logWarn(`Encryption method not found for ${op}`);
          return;
        }

        setMessage(`Encrypting with ${method}...`);
        logDebug(`Encrypting ${valueAbs} with ${method}`);

        // Use retry for encryption operation
        const enc = await retryEncryptionOperation(async () => {
          return await encryptWith(builder => {
            (builder as any)[method](valueAbs);
          });
        });

        if (!enc) {
          const msg = handleError(new Error("Encryption failed"));
          setMessage(msg);
          logError("Encryption operation returned null");
          return;
        }

        const writeContract = getContract("write");
        if (!writeContract) {
          const msg = "Contract info or signer not available";
          setMessage(msg);
          logWarn(msg);
          return;
        }

        const params = buildParamsFromAbi(enc, [...fheCounter!.abi] as any[], op);
        const tx = await (op === "increment" ? writeContract.increment(...params) : writeContract.decrement(...params));
        setMessage("Waiting for transaction...");
        logDebug(`Transaction sent: ${tx.hash}`);

        await tx.wait();
        const metric = timer();
        logDebug(`${op}(${valueAbs}) completed in ${metric.durationMs}ms`);
        setMessage(`${op}(${valueAbs}) completed!`);
        refreshCountHandle();
      } catch (e) {
        const isUserActionErr = isUserError(e);
        const errorMsg = handleError(e);

        if (isUserActionErr) {
          logDebug(`User declined ${op} operation`);
          setMessage(`You declined the ${op} operation`);
        } else {
          logError(`${op} operation failed`, e);
          setMessage(`${op} failed: ${errorMsg}`);

          // Suggest retry if applicable
          if (shouldRetry(e)) {
            logWarn(`${op} failed but is retryable - consider retrying`);
          }
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, canUpdateCounter, encryptWith, getContract, refreshCountHandle, fheCounter?.abi, fheCounter?.address],
  );

  return {
    contractAddress: fheCounter?.address,
    canDecrypt,
    canGetCount,
    canUpdateCounter,
    updateCounter,
    decryptCountHandle,
    refreshCountHandle,
    isDecrypted,
    message,
    clear: clearCount?.clear,
    handle: countHandle,
    isDecrypting,
    isRefreshing,
    isProcessing,
    // Wagmi-specific values
    chainId,
    accounts,
    isConnected,
    ethersSigner,
  };
};
