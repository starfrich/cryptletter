/**
 * Legacy FHEVM Types
 *
 * @deprecated This file is kept for backward compatibility.
 * Please import from '@fhevm-sdk/types' instead.
 *
 * All types are now centralized in src/types/ directory for better organization.
 */

// Re-export all types from the centralized types directory
export type {
  FhevmInstance,
  FhevmInstanceConfig,
  HandleContractPair,
  DecryptedResults,
  FhevmDecryptionSignatureType,
  EIP712Type,
} from "./types/fhevm";

