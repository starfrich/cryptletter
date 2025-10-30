"use client";

import { useMemo, useCallback } from "react";
import type { WalletCallbacks } from "../types/callbacks";
import { ethers } from "ethers";

/**
 * Parameters for useWalletCallbacks hook
 */
export interface UseWalletCallbacksParams {
  /** Ethers.js signer (if using ethers) */
  ethersSigner?: ethers.JsonRpcSigner | undefined;
  /** Or provide callbacks directly */
  callbacks?: WalletCallbacks;
}

/**
 * Hook to create wallet callbacks from various wallet libraries
 *
 * This hook provides a bridge between wallet libraries (ethers.js, viem, etc.)
 * and the FHEVM SDK's framework-agnostic callback pattern.
 *
 * @example
 * ```typescript
 * // With ethers.js
 * import { useWalletCallbacks } from '@fhevm-sdk/react';
 * import { useSigner } from './useSigner'; // Your ethers signer hook
 *
 * const { data: ethersSigner } = useSigner();
 * const { signTypedData, getAddress } = useWalletCallbacks({ ethersSigner });
 * ```
 *
 * @example
 * ```typescript
 * // With custom callbacks
 * import { useWalletCallbacks } from '@fhevm-sdk/react';
 *
 * const customCallbacks = useMemo(() => ({
 *   signTypedData: async (domain, types, message) => {
 *     return await myWallet.sign(...);
 *   },
 *   getAddress: async () => {
 *     return myWallet.address;
 *   }
 * }), [myWallet]);
 *
 * const { signTypedData, getAddress } = useWalletCallbacks({ callbacks: customCallbacks });
 * ```
 */
export function useWalletCallbacks(params: UseWalletCallbacksParams): Partial<WalletCallbacks> {
  const { ethersSigner, callbacks } = params;

  // If custom callbacks provided, use them directly
  const customCallbacks = useMemo(() => {
    if (callbacks) {
      return {
        signTypedData: callbacks.signTypedData,
        getAddress: callbacks.getAddress,
        sendTransaction: callbacks.sendTransaction,
      };
    }
    return null;
  }, [callbacks]);

  // Create ethers callbacks
  const ethersSignTypedData = useCallback(
    async (domain: any, types: any, message: any) => {
      if (!ethersSigner) {
        throw new Error("Ethers signer not available");
      }
      return await ethersSigner.signTypedData(domain, types, message);
    },
    [ethersSigner]
  );

  const ethersGetAddress = useCallback(async () => {
    if (!ethersSigner) {
      throw new Error("Ethers signer not available");
    }
    return await ethersSigner.getAddress();
  }, [ethersSigner]);

  const ethersSendTransaction = useCallback(
    async (tx: any) => {
      if (!ethersSigner) {
        throw new Error("Ethers signer not available");
      }
      const response = await ethersSigner.sendTransaction(tx);
      return response.hash;
    },
    [ethersSigner]
  );

  // Return custom callbacks if provided, otherwise ethers callbacks
  return useMemo(() => {
    if (customCallbacks) {
      return customCallbacks;
    }

    // Only return ethers callbacks if signer is available
    if (ethersSigner) {
      return {
        signTypedData: ethersSignTypedData,
        getAddress: ethersGetAddress,
        sendTransaction: ethersSendTransaction,
      };
    }

    // Return empty object if nothing is available
    return {};
  }, [customCallbacks, ethersSigner, ethersSignTypedData, ethersGetAddress, ethersSendTransaction]);
}
