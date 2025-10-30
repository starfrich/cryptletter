import type { FhevmEncryptedType, EncryptResult } from "../core/encryption";
import { encryptValue, getEncryptionMethod, toHex } from "../core/encryption";
import type { FhevmInstance } from "../core/types";
import {
  decryptValue,
  type DecryptionRequest,
  type DecryptionSignature,
  type DecryptionResult,
  isSignatureValid,
  getUniqueContractAddresses,
  filterValidRequests,
} from "../core/decryption";

/**
 * Validate that a given string is a supported FHEVM encrypted type.
 */
export function validateFhevmType(type: string): type is FhevmEncryptedType {
  return (
    type === "ebool" ||
    type === "euint8" ||
    type === "euint16" ||
    type === "euint32" ||
    type === "euint64" ||
    type === "euint128" ||
    type === "euint256" ||
    type === "eaddress"
  );
}

/**
 * Encrypt a single value using convenience wrapper.
 */
export async function encryptSingle(
  instance: FhevmInstance,
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  value: number | boolean | string,
  type: FhevmEncryptedType
): Promise<EncryptResult> {
  return encryptValue(instance, contractAddress, userAddress, value, type);
}

/**
 * Decrypt a single handle convenience wrapper.
 */
export async function decryptHandle(
  instance: FhevmInstance,
  handle: string,
  contractAddress: `0x${string}`,
  signature: DecryptionSignature
) {
  return decryptValue(instance, handle, contractAddress, signature);
}

/**
 * Parse encryption result into commonly used 0x-hex strings.
 */
export function parseEncryptedData(enc: EncryptResult) {
  return {
    handleHex: toHex(enc.handles[0]),
    inputProofHex: toHex(enc.inputProof),
  } as const;
}

/**
 * Build decryption request objects for a list of handles.
 */
export function buildDecryptionRequests(
  handles: readonly string[],
  contractAddress: `0x${string}`
): DecryptionRequest[] {
  return handles.map((h) => ({ handle: h, contractAddress }));
}

export const helpers = {
  getEncryptionMethod,
  toHex,
  validateFhevmType,
  encryptSingle,
  decryptHandle,
  parseEncryptedData,
  isSignatureValid,
  getUniqueContractAddresses,
  filterValidRequests,
  buildDecryptionRequests,
};


