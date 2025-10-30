/**
 * useWalletCallbacks - Vue composable for creating wallet callbacks
 *
 * Converts ethers.js signer or raw window.ethereum into framework-agnostic
 * callback functions that the FHEVM SDK can use.
 */

import { computed, type Ref, type ComputedRef } from 'vue'
import type { WalletCallbacks } from '@fhevm-sdk'
import { ethers } from 'ethers'

export interface UseWalletCallbacksParams {
  /** Ethers.js signer (if using ethers) */
  signer?: Ref<ethers.Signer | undefined>
  /** User address (if using raw ethereum) */
  userAddress?: Ref<string | undefined>
}

export interface UseWalletCallbacksReturn {
  /** Sign EIP-712 typed data callback */
  signTypedData: ComputedRef<((domain: any, types: any, message: any) => Promise<string>) | undefined>
  /** Get user address callback */
  getAddress: ComputedRef<(() => Promise<string>) | undefined>
  /** Send transaction callback */
  sendTransaction: ComputedRef<((tx: any) => Promise<string>) | undefined>
}

/**
 * Create wallet callbacks from ethers signer or raw MetaMask
 *
 * @example
 * ```typescript
 * // With ethers signer
 * const signer = ref<ethers.Signer | undefined>(undefined)
 * const { signTypedData, getAddress } = useWalletCallbacks({ signer })
 *
 * // With raw MetaMask + user address
 * const userAddress = ref<string | undefined>(undefined)
 * const { signTypedData, getAddress } = useWalletCallbacks({ userAddress })
 * ```
 */
export function useWalletCallbacks(params: UseWalletCallbacksParams): UseWalletCallbacksReturn {
  const { signer, userAddress } = params

  // Create callbacks from ethers signer
  const ethersCallbacks = computed<Partial<WalletCallbacks>>(() => {
    const signerValue = signer?.value
    if (!signerValue) return {}

    return {
      signTypedData: async (domain: any, types: any, message: any) => {
        // Prefer native ethers v6 signTypedData if available
        if ('signTypedData' in signerValue && typeof (signerValue as any).signTypedData === 'function') {
          try {
            return await (signerValue as any).signTypedData(domain, types, message)
          } catch (e) {
            // Fall through to MetaMask v4 if native method fails
          }
        }

        // Fallback: use MetaMask's eth_signTypedData_v4
        const addr = await signerValue.getAddress()
        if (typeof window !== 'undefined' && (window as any).ethereum && addr) {
          const ethereum = (window as any).ethereum
          const primaryType = Object.keys(types)[0]

          // Build EIP712Domain type dynamically from provided domain keys
          const domainTypeEntries: Array<{ name: string; type: string }> = []
          const maybePush = (name: string, type: string) => {
            if (domain && Object.prototype.hasOwnProperty.call(domain, name)) {
              domainTypeEntries.push({ name, type })
            }
          }
          maybePush('name', 'string')
          maybePush('version', 'string')
          maybePush('chainId', 'uint256')
          maybePush('verifyingContract', 'address')
          maybePush('salt', 'bytes32')

          const typedData = JSON.stringify({
            domain,
            types: { ...types, EIP712Domain: domainTypeEntries },
            message,
            primaryType,
          })
          return await ethereum.request({
            method: 'eth_signTypedData_v4',
            params: [addr, typedData],
          }) as string
        }

        throw new Error('No available method to sign typed data')
      },
      getAddress: async () => {
        return await signerValue.getAddress()
      },
      sendTransaction: async (tx: any) => {
        const response = await signerValue.sendTransaction(tx)
        return response.hash
      },
    }
  })

  // Create callbacks from raw window.ethereum
  const metaMaskCallbacks = computed<Partial<WalletCallbacks>>(() => {
    const addr = userAddress?.value
    if (!addr || !window.ethereum) return {}

    const ethereum = window.ethereum

    return {
      signTypedData: async (domain: any, types: any, message: any) => {
        const primaryType = Object.keys(types)[0]
        const typedData = JSON.stringify({
          domain,
          types: { ...types, EIP712Domain: [] },
          message,
          primaryType,
        })

        return await ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [addr, typedData],
        }) as string
      },
      getAddress: async () => {
        return addr
      },
      sendTransaction: async (tx: any) => {
        return await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            to: tx.to,
            from: addr,
            data: tx.data,
            value: tx.value ? `0x${BigInt(tx.value).toString(16)}` : undefined,
          }],
        }) as string
      },
    }
  })

  // Prefer ethers callbacks if available, fall back to MetaMask
  const activeCallbacks = computed(() => {
    if (signer?.value) return ethersCallbacks.value
    if (userAddress?.value) return metaMaskCallbacks.value
    return {}
  })

  return {
    signTypedData: computed(() => activeCallbacks.value.signTypedData),
    getAddress: computed(() => activeCallbacks.value.getAddress),
    sendTransaction: computed(() => activeCallbacks.value.sendTransaction),
  }
}
