import { ethers } from 'ethers';
import { createFhevmInstance } from '@fhevm-sdk/core';
import type { Config } from '../config.js';
import type { FhevmInstance } from '@fhevm-sdk/core';

/**
 * Setup wallet from config
 */
export function setupWallet(config: Config): ethers.Wallet {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);

  if (config.mnemonic) {
    const mnemonic = ethers.Mnemonic.fromPhrase(config.mnemonic);
    const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic);
    return hdNode.connect(provider) as unknown as ethers.Wallet;
  }

  if (config.privateKey) {
    return new ethers.Wallet(config.privateKey, provider);
  }

  throw new Error('No wallet credentials configured');
}

/**
 * Initialize FHEVM instance
 */
export async function initializeFhevm(
  config: Config
): Promise<FhevmInstance> {
  console.log(`📡 Initializing FHEVM with RPC: ${config.rpcUrl}`);
  console.log(`📡 Chain ID: ${config.chainId}`);

  // For Node.js environments, use createFhevmInstanceNode
  // which properly handles Hardhat mock detection
  const { createFhevmInstanceNode } = await import('@fhevm-sdk/core');

  const fhevmInstance = await createFhevmInstanceNode({
    provider: config.rpcUrl,
    signal: new AbortController().signal,
  });

  console.log(`✅ FHEVM instance created successfully`);
  return fhevmInstance;
}

/**
 * Setup contract instance
 */
export function setupContract(
  config: Config,
  wallet: ethers.Wallet
): ethers.Contract {
  // Use proper ABI with bytes32 for externalEuint32
  const ABI = [
    'function increment(bytes32 inputEuint32, bytes calldata inputProof) external',
    'function decrement(bytes32 inputEuint32, bytes calldata inputProof) external',
    'function getCount() external view returns (bytes32)',
  ];

  return new ethers.Contract(config.contractAddress, ABI, wallet);
}

/**
 * Log task execution with timestamp
 */
export function logTask(taskName: string, message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📋 ${taskName}: ${message}`);
}

/**
 * Log task completion
 */
export function logTaskComplete(taskName: string, duration: number): void {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] ✅ ${taskName}: Completed in ${duration}ms\n`
  );
}

/**
 * Log task error
 */
export function logTaskError(taskName: string, error: Error): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${taskName}: ${error.message}\n`);
}
