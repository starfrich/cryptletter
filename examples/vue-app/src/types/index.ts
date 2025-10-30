/**
 * Application-wide type definitions
 */

import type { ethers } from 'ethers'

/**
 * Ethereum provider types (EIP-1193)
 */
export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
  isMetaMask?: boolean
  isConnected?: () => boolean
}

/**
 * Window with Ethereum provider
 */
declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

/**
 * Contract call result
 */
export interface ContractCallResult<T = unknown> {
  data?: T
  error?: Error
  isLoading: boolean
}

/**
 * Transaction result
 */
export interface TransactionResult {
  hash?: string
  error?: Error
  isLoading: boolean
}

/**
 * Wallet connection state
 */
export interface WalletState {
  address?: string
  chainId?: number
  isConnected: boolean
  provider?: ethers.BrowserProvider
  signer?: ethers.Signer
}
