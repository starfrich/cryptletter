import 'dotenv/config';

/**
 * Configuration for the backend
 */
export interface Config {
  // Server
  port: number;
  nodeEnv: 'development' | 'production';

  // Wallet
  mnemonic?: string;
  privateKey?: string;

  // Network
  rpcUrl: string;
  chainId: number;
  contractAddress: string;

  // FHEVM Settings
  decryptTimeoutMs: number;
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  // Validate required env vars
  const chainId = process.env.CHAIN_ID;
  const contractAddress = process.env.CONTRACT_ADDRESS;
  let rpcUrl = process.env.RPC_URL;

  if (!chainId) {
    throw new Error('❌ Missing CHAIN_ID environment variable');
  }
  if (!contractAddress) {
    throw new Error('❌ Missing CONTRACT_ADDRESS environment variable');
  }

  // For Sepolia (11155111), RPC_URL is optional - SDK will use default from SepoliaConfig
  // For other networks, RPC_URL is required
  const chainIdNum = parseInt(chainId, 10);
  if (!rpcUrl) {
    if (chainIdNum === 11155111) {
      // Use Sepolia default RPC from SDK
      rpcUrl = 'https://eth-sepolia.public.blastapi.io';
      console.log('ℹ️  Using default Sepolia RPC from SDK');
    } else {
      throw new Error('❌ Missing RPC_URL environment variable');
    }
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
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production') || 'development',
    mnemonic,
    privateKey,
    rpcUrl,
    chainId: parseInt(chainId, 10),
    contractAddress,
    // Default 30 seconds for Sepolia, can be overridden via env var
    decryptTimeoutMs: parseInt(process.env.DECRYPT_TIMEOUT_MS || '30000', 10),
  };
}

/**
 * Print configuration for debugging (without sensitive data)
 */
export function printConfig(config: Config): void {
  console.log(`
╔════════════════════════════════════════╗
║      FHEVM Backend Configuration       ║
╚════════════════════════════════════════╝

📱 Server:
   Port: ${config.port}
   Environment: ${config.nodeEnv}

🔗 Network:
   RPC URL: ${config.rpcUrl}
   Chain ID: ${config.chainId}
   Contract: ${config.contractAddress.substring(0, 10)}...

💰 Wallet:
   Type: ${config.mnemonic ? 'Mnemonic (HD)' : 'Private Key'}
   First word: ${config.mnemonic ? config.mnemonic.split(' ')[0] + '...' : config.privateKey?.substring(0, 8) + '...'}

`);
}
