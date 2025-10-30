import { Router, Request, Response } from 'express';
import type { FhevmInstance } from '@fhevm-sdk/core';
import { decryptValue } from '@fhevm-sdk/core';
import type { Config } from '../config.js';
import { setupWallet, setupContract } from '../utils/fhevm-setup.js';
import { createDecryptionSignature } from '../utils/signature-helper.js';

export interface DecryptRequest {
  handle?: string;
}

/**
 * Create decryption routes
 */
export function createDecryptRoutes(
  config: Config,
  fhevmInstance: FhevmInstance
): Router {
  const router = Router();

  /**
   * POST /api/decrypt
   * Decrypt the current counter value or a specific handle
   *
   * Note: This is a simplified example. In production, you would need:
   * - Proper signature generation/validation
   * - ACL checks
   * - Rate limiting
   */
  router.post('/', async (req: Request<{}, {}, DecryptRequest>, res: Response) => {
    try {
      const { handle: handleFromBody } = req.body;
      const wallet = setupWallet(config);
      const contract = setupContract(config, wallet);
      const userAddress = wallet.address as `0x${string}`;

      let handleToDecrypt = handleFromBody;

      // If no handle provided, fetch current counter from contract
      if (!handleToDecrypt) {
        console.log('📖 Reading encrypted counter from contract...');
        const encryptedCount = await contract.getCount();
        handleToDecrypt = encryptedCount;
      }

      if (!handleToDecrypt || handleToDecrypt === '0x') {
        return res.status(400).json({
          error: 'No handle to decrypt',
          details: 'Either provide a handle in the request body, or increment the counter first using /api/encrypt',
        });
      }

      console.log(
        `🔓 Decrypting handle: ${String(handleToDecrypt).substring(0, 10)}...`
      );

      // Create proper decryption signature with EIP-712
      console.log('✍️  Generating decryption signature...');
      const decryptionSignature = await createDecryptionSignature(
        fhevmInstance,
        wallet,
        config.contractAddress as `0x${string}`
      );

      // Decrypt using FHEVM SDK
      console.log('🔐 Calling decryptValue...');
      console.log('📋 Decryption params:', {
        handle: String(handleToDecrypt).substring(0, 20) + '...',
        contractAddress: config.contractAddress,
        userAddress: decryptionSignature.userAddress,
        contractAddresses: decryptionSignature.contractAddresses,
      });

      // Debug: Log full signature details
      console.log('🔍 Full signature details:', {
        publicKeyLength: decryptionSignature.publicKey.length,
        privateKeyLength: decryptionSignature.privateKey.length,
        signatureLength: decryptionSignature.signature.length,
        signature: decryptionSignature.signature.substring(0, 20) + '...',
        startTimestamp: decryptionSignature.startTimestamp,
        durationDays: decryptionSignature.durationDays,
      });

      // Add timeout protection (configurable via DECRYPT_TIMEOUT_MS env var)
      const decryptPromise = decryptValue(
        fhevmInstance,
        String(handleToDecrypt),
        config.contractAddress as `0x${string}`,
        decryptionSignature
      );

      const timeoutPromise = new Promise<undefined>((_, reject) => {
        setTimeout(() => {
          reject(new Error(
            `Decryption timeout: Zama KMS/relayer did not respond within ${config.decryptTimeoutMs}ms. ` +
            'This may indicate the relayer is not operational. Try using localhost instead.'
          ));
        }, config.decryptTimeoutMs);
      });

      const decryptedValue = await Promise.race([decryptPromise, timeoutPromise]);

      // Check if decryption returned undefined (invalid handle)
      if (decryptedValue === undefined) {
        return res.status(400).json({
          error: 'Invalid handle',
          details: 'The provided handle could not be decrypted. It may be invalid or not exist.',
        });
      }

      console.log(`✅ Decrypted value: ${decryptedValue}`);

      res.json({
        success: true,
        decryptedValue: String(decryptedValue), // Convert BigInt to string for JSON
        handle: String(handleToDecrypt).substring(0, 20) + '...',
      });
    } catch (error: any) {
      console.error('❌ Decryption failed:', {
        message: error.message,
        stack: error.stack,
        handle: req.body.handle?.substring(0, 20),
      });

      // Provide helpful error message for ACL failures
      if (error.message.includes('ACL')) {
        return res.status(403).json({
          error: 'Decryption not allowed',
          details:
            'Only the wallet that encrypted this value can decrypt it',
        });
      }

      res.status(500).json({
        error: 'Decryption failed',
        details: error.message,
      });
    }
  });

  return router;
}
