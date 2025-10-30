import { encryptValue } from '@fhevm-sdk/core';
import { loadConfig } from '../config.js';
import {
  setupWallet,
  setupContract,
  initializeFhevm,
  logTask,
  logTaskComplete,
  logTaskError,
} from '../utils/fhevm-setup.js';

/**
 * Batch encryption task
 * Encrypts multiple values and sends them to the contract
 * Example use cases:
 * - Bulk upload from CSV
 * - Migration from unencrypted system
 * - Daily batch processing
 */
export async function batchEncryptTask(values: number[] = [1, 5, 10]): Promise<void> {
  const startTime = Date.now();
  const taskName = 'Batch Encrypt';

  console.log('\n' + '='.repeat(50));
  console.log(`🚀 Starting Batch Encrypt Task`);
  console.log('='.repeat(50) + '\n');

  try {
    logTask(taskName, `Processing ${values.length} values...`);

    const config = loadConfig();
    const wallet = setupWallet(config);
    const contract = setupContract(config, wallet);
    const fhevmInstance = await initializeFhevm(config);
    const userAddress = wallet.address as `0x${string}`;

    // Get initial nonce to ensure proper nonce management
    let currentNonce = await wallet.provider!.getTransactionCount(wallet.address, 'pending');

    for (const value of values) {
      try {
        logTask(taskName, `Encrypting value: ${value}`);

        const encryptedData = await encryptValue(
          fhevmInstance,
          config.contractAddress,
          userAddress,
          value,
          'euint32'
        );

        logTask(taskName, `Sending encrypted value to contract...`);

        // Convert Uint8Array to hex format for contract call
        const handleHex = '0x' + Buffer.from(encryptedData.handles[0]).toString('hex');
        const proofHex = '0x' + Buffer.from(encryptedData.inputProof).toString('hex');

        // Explicitly set nonce to avoid race conditions with automining
        const tx = await contract.increment(handleHex, proofHex, { nonce: currentNonce });

        await tx.wait();
        currentNonce++; // Increment nonce for next transaction
        logTask(taskName, `✅ Value ${value} encrypted and stored`);
      } catch (itemError: any) {
        logTask(taskName, `⚠️  Failed to process value ${value}: ${itemError.message}`);
        // Refresh nonce on error to resync
        currentNonce = await wallet.provider!.getTransactionCount(wallet.address, 'pending');
      }
    }

    const duration = Date.now() - startTime;
    logTaskComplete(taskName, duration);

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Batch Encrypt Task Completed in ${duration}ms`);
    console.log('='.repeat(50) + '\n');
  } catch (error: any) {
    logTaskError(taskName, error);
    console.error('\n❌ Batch Encrypt Task Failed:', error.message, '\n');
    throw error;
  }
}

// Run if executed directly
// Use pathToFileURL for cross-platform compatibility
import { pathToFileURL } from 'url';

const currentFileUrl = pathToFileURL(process.argv[1] || '').href;
const isMainModule = import.meta.url === currentFileUrl;

if (isMainModule) {
  console.log('🔧 Running batch-encrypt as main module\n');
  // Example batch: encrypt values 1-10
  const valuesToProcess = Array.from({ length: 10 }, (_, i) => i + 1);
  batchEncryptTask(valuesToProcess).catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
