/**
 * Application Configuration
 *
 * This file contains network configurations and contract deployment information.
 * It mirrors the scaffold.config.ts pattern from the Next.js example.
 */

import { sepolia } from 'viem/chains'
import type { Chain } from 'viem/chains'

// Define localhost/hardhat chain
export const localhost = {
  id: 31337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
} as const satisfies Chain

export interface AppConfig {
  targetNetworks: readonly Chain[]
  pollingInterval: number
  alchemyApiKey: string
  walletConnectProjectId: string
  /** Mock chains for local testing (chainId -> RPC URL) */
  mockChains: Record<number, string>
}

const config: AppConfig = {
  // The networks on which your DApp is live
  targetNetworks: [localhost, sepolia] as const,

  // Polling interval for blockchain data
  pollingInterval: 30000,

  // Alchemy API key (optional for development, required for production)
  alchemyApiKey: import.meta.env.VITE_ALCHEMY_API_KEY || '',

  // WalletConnect project ID
  walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64',

  // Mock chains for local Hardhat testing
  mockChains: {
    31337: 'http://127.0.0.1:8545',
  },
}

export default config
