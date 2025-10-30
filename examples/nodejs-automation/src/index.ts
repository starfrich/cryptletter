import { loadConfig, printConfig } from './config.js';
import { TaskScheduler } from './scheduler.js';
import { dailyDecryptTask } from './tasks/daily-decrypt.js';
import { batchEncryptTask } from './tasks/batch-encrypt.js';

/**
 * FHEVM Automation
 *
 * Demonstrates how to use @fhevm-sdk/core for automated tasks,
 * scheduled jobs, and batch processing.
 *
 * Modes:
 * 1. Scheduler mode (default) - Runs tasks on schedule
 * 2. Task mode - Run specific tasks immediately
 */
async function main() {
  try {
    const config = loadConfig();
    printConfig(config);

    const args = process.argv.slice(2);
    const mode = args[0] || 'scheduler';

    console.log(`\n🚀 Running in mode: ${mode}\n`);

    switch (mode) {
      // Start scheduler with cron jobs
      case 'scheduler':
      case 'start': {
        const scheduler = new TaskScheduler();
        scheduler.start(config);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
          console.log('\n\n👋 Shutting down...');
          scheduler.stopAll();
          process.exit(0);
        });

        // Keep process running
        console.log('💡 Tip: Press Ctrl+C to stop\n');
        break;
      }

      // Run daily decryption immediately
      case 'decrypt':
      case 'task:decrypt': {
        console.log('Running daily decryption task...\n');
        await dailyDecryptTask();
        process.exit(0);
        break;
      }

      // Run batch encryption immediately
      case 'encrypt':
      case 'task:batch': {
        console.log('Running batch encryption task...\n');
        // Example: encrypt values 1-5
        await batchEncryptTask([1, 2, 3, 4, 5]);
        process.exit(0);
        break;
      }

      // Show help
      case 'help':
      case '--help':
      case '-h': {
        console.log(`
╔════════════════════════════════════════╗
║    FHEVM Automation - Help             ║
╚════════════════════════════════════════╝

Usage: pnpm start [mode] [options]

Modes:
  scheduler         Start scheduler with cron jobs (default)
  start             Same as scheduler
  decrypt           Run daily decryption task immediately
  task:decrypt      Same as decrypt
  encrypt           Run batch encryption task immediately
  task:batch        Same as encrypt
  help              Show this message

Environment Variables:
  MNEMONIC or PRIVATE_KEY   Wallet credentials
  RPC_URL                   Blockchain RPC endpoint
  CHAIN_ID                  Network chain ID
  CONTRACT_ADDRESS          FHECounter contract address
  CRON_SCHEDULE_DAILY       Cron expression for daily tasks
  NODE_ENV                  development or production

Examples:
  # Start scheduler
  pnpm start scheduler

  # Run daily decryption immediately
  pnpm start decrypt

  # Run batch encryption for values 1-5
  pnpm start encrypt

Scripts:
  pnpm dev              Start in watch mode
  pnpm start            Start in production mode
  pnpm task:decrypt     Run daily decryption
  pnpm task:batch       Run batch encryption

🔗 Learn more: https://docs.zama.ai/protocol/
`);
        process.exit(0);
        break;
      }

      default: {
        console.error(`❌ Unknown mode: ${mode}`);
        console.log('Run "pnpm start help" for available modes\n');
        process.exit(1);
      }
    }
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}\n`);
    console.log('💡 Tip: Copy .env.example to .env and configure it:\n');
    console.log('   cp .env.example .env\n');
    process.exit(1);
  }
}

main();
