import { Router, Request, Response } from 'express';
import type { FhevmInstance } from '@fhevm-sdk/core';
import { encryptValue } from '@fhevm-sdk/core';
import type { Config } from '../config.js';
import { setupWallet, setupContract } from '../utils/fhevm-setup.js';

export interface EncryptRequest {
  value: number;
}

/**
 * Create encryption routes
 */
export function createEncryptRoutes(
  config: Config,
  fhevmInstance: FhevmInstance
): Router {
  const router = Router();

  /**
   * POST /api/encrypt
   * Encrypt a value and send to contract
   */
  router.post('/', async (req: Request<{}, {}, EncryptRequest>, res: Response) => {
    try {
      const { value = 1 } = req.body;

      // Validate input for euint32
      // euint32 range: 0 to 2^32 - 1 (4,294,967,295)
      const EUINT32_MAX = 4294967295;

      if (typeof value !== 'number') {
        return res.status(400).json({
          error: 'Invalid value: must be a number',
        });
      }

      if (!Number.isInteger(value)) {
        return res.status(400).json({
          error: 'Invalid value: must be an integer',
        });
      }

      if (value < 0 || value > EUINT32_MAX) {
        return res.status(400).json({
          error: `Invalid value: must be between 0 and ${EUINT32_MAX} (euint32 range)`,
        });
      }

      console.log(`🔐 Encrypting value: ${value}`);

      // Setup wallet and contract
      const wallet = setupWallet(config);
      const contract = setupContract(config, wallet);
      const userAddress = wallet.address as `0x${string}`;

      // Encrypt the value using FHEVM SDK
      const encryptedData = await encryptValue(
        fhevmInstance,
        config.contractAddress,
        userAddress,
        value,
        'euint32'
      );

      const handle = encryptedData.handles[0];
      console.log(`✅ Encrypted handle: ${handle?.toString().substring(0, 10)}...`);

      // Send encrypted value to contract
      const tx = await contract.increment(
        handle,
        encryptedData.inputProof
      );

      const receipt = await tx.wait();

      res.json({
        success: true,
        transactionHash: receipt?.hash,
        blockNumber: receipt?.blockNumber,
        value,
        encrypted: {
          handle: encryptedData.handles[0]?.toString(),
          hasInputProof: !!encryptedData.inputProof,
        },
      });
    } catch (error: any) {
      console.error('❌ Encryption failed:', {
        message: error.message,
        stack: error.stack,
        value: req.body.value,
      });
      res.status(500).json({
        error: 'Encryption failed',
        details: error.message,
      });
    }
  });

  return router;
}
