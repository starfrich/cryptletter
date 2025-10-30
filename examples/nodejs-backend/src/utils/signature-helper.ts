import type { Wallet, HDNodeWallet } from 'ethers';
import type { FhevmInstance, DecryptionSignature } from '@fhevm-sdk/core';

/**
 * Cached decryption signature (singleton pattern)
 * Signature is valid for 365 days, no need to regenerate on every request
 */
let cachedSignature: DecryptionSignature | null = null;

/**
 * Type-safe wrapper for RelayerSDK's generateKeypair method
 *
 * Provides proper return type annotation for better developer experience
 */
function generateKeypair(instance: FhevmInstance): {
  publicKey: string;
  privateKey: string;
} {
  return (instance as any).generateKeypair();
}

/**
 * Type-safe wrapper for RelayerSDK's createEIP712 method
 *
 * Provides proper return type annotation for better developer experience
 */
function createEIP712(
  instance: FhevmInstance,
  publicKey: string,
  contractAddresses: string[],
  startTimestamp: number,
  durationDays: number
): {
  domain: any;
  types: {
    UserDecryptRequestVerification: any;
  };
  message: any;
} {
  return (instance as any).createEIP712(publicKey, contractAddresses, startTimestamp, durationDays);
}

/**
 * Generate a decryption signature for backend use (Node.js)
 *
 * This creates a proper EIP-712 signature needed for FHEVM decryption.
 * In backend/Node.js context, we use the Node SDK's createTfheKeypair.
 *
 * @param instance - FHEVM instance
 * @param wallet - Ethers wallet for signing (Wallet or HDNodeWallet)
 * @param contractAddress - Contract address to decrypt from
 * @returns Valid DecryptionSignature
 */
export async function createDecryptionSignature(
  instance: FhevmInstance,
  wallet: Wallet | HDNodeWallet,
  contractAddress: `0x${string}`
): Promise<DecryptionSignature> {
  // Return cached signature if still valid
  if (cachedSignature && isSignatureValid(cachedSignature)) {
    console.log('✅ Using cached decryption signature (still valid)');
    return cachedSignature;
  }

  // Generate new signature if none cached or expired
  console.log('🔑 Generating new decryption signature...');

  // Use typed wrapper to generate ML-KEM keypair for decryption
  const { publicKey, privateKey } = generateKeypair(instance);

  console.log('🔑 Generated keypair:', {
    publicKeyLength: publicKey.length,
    privateKeyLength: privateKey.length,
  });

  // Get user address
  const userAddress = wallet.address as `0x${string}`;

  // Set validity period
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 365; // 1 year validity

  // Create EIP-712 message using typed wrapper
  const contractAddresses = [contractAddress];

  const eip712 = createEIP712(
    instance,
    publicKey,
    contractAddresses,
    startTimestamp,
    durationDays
  );

  // Sign the EIP-712 message
  const signature = await wallet.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message
  );

  // Cache the signature before returning
  cachedSignature = {
    publicKey,
    privateKey,
    signature,
    contractAddresses,
    userAddress,
    startTimestamp,
    durationDays,
  };

  console.log(`✅ Signature cached (valid until ${new Date((startTimestamp + durationDays * 24 * 60 * 60) * 1000).toISOString()})`);

  return cachedSignature;
}

/**
 * Check if a signature is still valid
 */
export function isSignatureValid(signature: DecryptionSignature): boolean {
  const now = Math.floor(Date.now() / 1000);
  const expiryTimestamp = signature.startTimestamp + signature.durationDays * 24 * 60 * 60;
  return now < expiryTimestamp;
}

/**
 * Clear cached signature (for testing or graceful shutdown)
 */
export function clearSignatureCache(): void {
  cachedSignature = null;
}
