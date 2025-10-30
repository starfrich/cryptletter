import 'dotenv/config';

/**
 * Configuration for automation tasks
 */
export interface Config {
  // Wallet
  mnemonic?: string;
  privateKey?: string;

  // Network
  rpcUrl: string;
  chainId: number;
  contractAddress: string;

  // Environment
  nodeEnv: 'development' | 'production';

  // Scheduler
  cronScheduleDaily: string;
}

/**
 * Load and validate configuration
 */
export function loadConfig(): Config {
  // Validate required env vars
  const rpcUrl = process.env.RPC_URL;
  const chainId = process.env.CHAIN_ID;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl) {
    throw new Error('❌ Missing RPC_URL environment variable');
  }
  if (!chainId) {
    throw new Error('❌ Missing CHAIN_ID environment variable');
  }
  if (!contractAddress) {
    throw new Error('❌ Missing CONTRACT_ADDRESS environment variable');
  }

  // Validate wallet credentials
  const mnemonic = process.env.MNEMONIC;
  const privateKey = process.env.PRIVATE_KEY;

  if (!mnemonic && !privateKey) {
    throw new Error(
      '❌ Missing wallet credentials: Set either MNEMONIC or PRIVATE_KEY'
    );
  }

  if (mnemonic && privateKey) {
    throw new Error(
      '❌ Ambiguous wallet: Set either MNEMONIC or PRIVATE_KEY, not both'
    );
  }

  return {
    mnemonic,
    privateKey,
    rpcUrl,
    chainId: parseInt(chainId, 10),
    contractAddress,
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production') || 'development',
    cronScheduleDaily: process.env.CRON_SCHEDULE_DAILY || '0 0 * * *',
  };
}

/**
 * Print configuration for debugging
 */
export function printConfig(config: Config): void {
  console.log(`
╔════════════════════════════════════════╗
║  FHEVM Automation Configuration        ║
╚════════════════════════════════════════╝

🔗 Network:
   RPC URL: ${config.rpcUrl}
   Chain ID: ${config.chainId}
   Contract: ${config.contractAddress.substring(0, 10)}...

💰 Wallet:
   Type: ${config.mnemonic ? 'Mnemonic (HD)' : 'Private Key'}
   First word: ${config.mnemonic ? config.mnemonic.split(' ')[0] + '...' : config.privateKey?.substring(0, 8) + '...'}

⏰ Scheduler:
   Daily Schedule: ${config.cronScheduleDaily}
   Environment: ${config.nodeEnv}

`);
}
