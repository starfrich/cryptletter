import { decryptValue } from '@fhevm-sdk/core';
import { loadConfig } from '../config.js';
import {
  setupWallet,
  setupContract,
  initializeFhevm,
  logTask,
  logTaskComplete,
  logTaskError,
} from '../utils/fhevm-setup.js';
import { createDecryptionSignature } from '../utils/signature-helper.js';

/**
 * Daily decryption task
 * Reads and decrypts the current counter value
 * Could be extended to: generate reports, store history, send alerts, etc.
 */
export async function dailyDecryptTask(): Promise<void> {
  const startTime = Date.now();
  const taskName = 'Daily Decrypt';

  console.log('\n' + '='.repeat(50));
  console.log(`🚀 Starting Daily Decrypt Task`);
  console.log('='.repeat(50) + '\n');

  try {
    logTask(taskName, 'Starting daily decryption task...');

    const config = loadConfig();
    const wallet = setupWallet(config);
    const contract = setupContract(config, wallet);
    const fhevmInstance = await initializeFhevm(config);
    const userAddress = wallet.address as `0x${string}`;

    logTask(taskName, 'Reading encrypted counter from contract...');
    const encryptedCount = await contract.getCount();

    if (!encryptedCount) {
      logTask(taskName, 'No encrypted value found in contract');
      return;
    }

    logTask(taskName, `Decrypting handle: ${String(encryptedCount).substring(0, 10)}...`);

    // Generate decryption signature (cached internally by helper)
    logTask(taskName, '✍️  Generating decryption signature...');
    const decryptionSignature = await createDecryptionSignature(
      fhevmInstance,
      wallet,
      config.contractAddress as `0x${string}`
    );

    logTask(taskName, '🔐 Calling decryptValue...');
    const decryptedValue = await decryptValue(
      fhevmInstance,
      String(encryptedCount),
      config.contractAddress as `0x${string}`,
      decryptionSignature
    );

    logTask(taskName, `✨ Decrypted value: ${decryptedValue}`);

    // Example: You could extend this to:
    // - Store history in a database
    // - Generate reports
    // - Send notifications
    // - Update analytics dashboard

    const duration = Date.now() - startTime;
    logTaskComplete(taskName, duration);

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Daily Decrypt Task Completed in ${duration}ms`);
    console.log('='.repeat(50) + '\n');
  } catch (error: any) {
    logTaskError(taskName, error);
    console.error('\n❌ Daily Decrypt Task Failed:', error.message, '\n');
    throw error;
  }
}

// Run if executed directly
// Use pathToFileURL for cross-platform compatibility
import { pathToFileURL } from 'url';

const currentFileUrl = pathToFileURL(process.argv[1] || '').href;
const isMainModule = import.meta.url === currentFileUrl;

if (isMainModule) {
  console.log('🔧 Running daily-decrypt as main module\n');
  dailyDecryptTask().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
