import { ethers } from 'ethers';
import { createFhevmInstance } from '@fhevm-sdk/core';
import type { Config } from '../config.js';
import type { FhevmInstance } from '@fhevm-sdk/core';
import { deployedContracts } from '../contracts/deployedContracts.js';

/**
 * Singleton instances for wallet and contract
 * Created once at startup and reused for all requests
 */
let walletInstance: ethers.HDNodeWallet | ethers.Wallet | null = null;
let contractInstance: ethers.Contract | null = null;

/**
 * Setup wallet from config (singleton pattern)
 * Returns HDNodeWallet or Wallet depending on config (both are Signer compatible)
 */
export function setupWallet(config: Config): ethers.HDNodeWallet | ethers.Wallet {
  // Return cached instance if available
  if (walletInstance) {
    return walletInstance;
  }
  // Create and cache wallet instance
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);

  if (config.mnemonic) {
    const mnemonic = ethers.Mnemonic.fromPhrase(config.mnemonic);
    const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/0");
    // HDNodeWallet extends BaseWallet, fully compatible
    walletInstance = hdNode.connect(provider);
    return walletInstance;
  }

  if (config.privateKey) {
    walletInstance = new ethers.Wallet(config.privateKey, provider);
    return walletInstance;
  }

  throw new Error('No wallet credentials configured');
}

/**
 * Initialize FHEVM instance for backend
 * Note: Backend uses in-memory storage since it's stateless
 *
 * The SDK now automatically detects Node.js environment and uses
 * @zama-fhe/relayer-sdk/node instead of browser SDK
 */
export async function initializeFhevm(
  config: Config
): Promise<FhevmInstance> {
  // Setup wallet singleton first
  setupWallet(config);

  // SDK will auto-detect Node.js and use appropriate implementation
  // For RPC URL string, pass it directly - SDK handles the rest
  const fhevmInstance = await createFhevmInstance({
    provider: config.rpcUrl,
    signal: new AbortController().signal,
  });

  return fhevmInstance;
}

/**
 * Setup contract instance (singleton pattern)
 * Uses auto-generated ABIs from deployedContracts
 */
export function setupContract(
  config: Config,
  wallet: ethers.HDNodeWallet | ethers.Wallet
): ethers.Contract {
  // Return cached instance if available
  if (contractInstance) {
    return contractInstance;
  }

  // Get ABI from generated contracts file
  // This ensures ABI stays in sync with deployed contracts
  const chainId = config.chainId as keyof typeof deployedContracts;
  const contractData = deployedContracts[chainId]?.FHECounter;

  if (!contractData) {
    throw new Error(
      `FHECounter contract not found for chain ID ${config.chainId}. ` +
      `Run 'pnpm generate' after deploying contracts.`
    );
  }

  // Create and cache contract instance with generated ABI
  contractInstance = new ethers.Contract(config.contractAddress, contractData.abi, wallet);
  return contractInstance;
}

/**
 * Clean up singleton instances (for graceful shutdown)
 */
export function cleanup(): void {
  walletInstance = null;
  contractInstance = null;
}
