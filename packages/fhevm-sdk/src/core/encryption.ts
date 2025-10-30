/**
 * FHEVM Encryption Utilities
 *
 * This module provides framework-agnostic utilities for encrypting data with FHEVM.
 * It includes type-safe encryption methods, ABI helpers, and format converters.
 */

import type { FhevmInstance } from "./types";
import type { RelayerEncryptedInput } from "@zama-fhe/relayer-sdk/web";

/**
 * Result of encryption operation
 */
export interface EncryptResult {
  /** Encrypted handles for each encrypted value */
  handles: Uint8Array[];
  /** Input proof for verification */
  inputProof: Uint8Array;
}

/**
 * FHEVM encrypted types supported by the SDK
 */
export type FhevmEncryptedType =
  | "ebool"
  | "euint8"
  | "euint16"
  | "euint32"
  | "euint64"
  | "euint128"
  | "euint256"
  | "eaddress";

/**
 * External encrypted types as they appear in Solidity ABIs
 */
export type ExternalEncryptedType =
  | "externalEbool"
  | "externalEuint8"
  | "externalEuint16"
  | "externalEuint32"
  | "externalEuint64"
  | "externalEuint128"
  | "externalEuint256"
  | "externalEaddress";

/**
 * Encryption method names on RelayerEncryptedInput builder
 */
export type EncryptionMethod =
  | "addBool"
  | "add8"
  | "add16"
  | "add32"
  | "add64"
  | "add128"
  | "add256"
  | "addAddress";

/**
 * Map external encrypted integer type to RelayerEncryptedInput builder method
 *
 * This helper determines which encryption method to call based on the Solidity type.
 *
 * @example
 * ```typescript
 * const method = getEncryptionMethod("externalEuint32");
 * // method === "add32"
 * builder[method](42);
 * ```
 */
export const getEncryptionMethod = (
  internalType: string
): EncryptionMethod => {
  switch (internalType) {
    case "externalEbool":
      return "addBool";
    case "externalEuint8":
      return "add8";
    case "externalEuint16":
      return "add16";
    case "externalEuint32":
      return "add32";
    case "externalEuint64":
      return "add64";
    case "externalEuint128":
      return "add128";
    case "externalEuint256":
      return "add256";
    case "externalEaddress":
      return "addAddress";
    default:
      console.warn(`Unknown internalType: ${internalType}, defaulting to add64`);
      return "add64";
  }
};

/**
 * Convert Uint8Array or hex-like string to 0x-prefixed hex string
 *
 * @example
 * ```typescript
 * toHex(new Uint8Array([1, 2, 3])) // "0x010203"
 * toHex("010203") // "0x010203"
 * toHex("0x010203") // "0x010203"
 * ```
 */
export const toHex = (value: Uint8Array | string): `0x${string}` => {
  if (typeof value === "string") {
    return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
  }
  // value is Uint8Array
  return ("0x" + Buffer.from(value).toString("hex")) as `0x${string}`;
};

/**
 * Build contract parameters from EncryptResult and ABI for a given function
 *
 * This helper automatically formats encryption results according to the function's ABI,
 * converting Uint8Arrays to the appropriate types (bytes32, bytes, uint256, etc.).
 *
 * @param enc - Encryption result from FHEVM instance
 * @param abi - Contract ABI array
 * @param functionName - Name of the function to call
 * @returns Array of formatted parameters ready for contract call
 *
 * @example
 * ```typescript
 * const enc = await encryptValue(instance, 42, "euint32");
 * const params = buildParamsFromAbi(enc, contractAbi, "setEncryptedValue");
 * await contract.setEncryptedValue(...params);
 * ```
 */
export const buildParamsFromAbi = (
  enc: EncryptResult,
  abi: any[],
  functionName: string
): any[] => {
  const fn = abi.find(
    (item: any) => item.type === "function" && item.name === functionName
  );
  if (!fn) throw new Error(`Function ABI not found for ${functionName}`);

  return fn.inputs.map((input: any, index: number) => {
    const raw = index === 0 ? enc.handles[0] : enc.inputProof;
    switch (input.type) {
      case "bytes32":
      case "bytes":
        return toHex(raw);
      case "uint256":
        return BigInt(raw as unknown as string);
      case "address":
      case "string":
        return raw as unknown as string;
      case "bool":
        return Boolean(raw);
      default:
        console.warn(`Unknown ABI param type ${input.type}; passing as hex`);
        return toHex(raw);
    }
  });
};

/**
 * Encrypt a single value using FHEVM instance
 *
 * This is a convenience wrapper for encrypting a single value without using the builder pattern.
 *
 * @param instance - FHEVM instance
 * @param contractAddress - Target contract address
 * @param userAddress - User's Ethereum address
 * @param value - Value to encrypt (number, boolean, or string address)
 * @param type - FHEVM encrypted type
 * @returns Encryption result
 *
 * @example
 * ```typescript
 * const encrypted = await encryptValue(
 *   instance,
 *   "0x123...",
 *   "0xabc...",
 *   42,
 *   "euint32"
 * );
 * ```
 */
export const encryptValue = async (
  instance: FhevmInstance,
  contractAddress: string,
  userAddress: string,
  value: number | boolean | string,
  type: FhevmEncryptedType
): Promise<EncryptResult> => {
  const input = instance.createEncryptedInput(
    contractAddress,
    userAddress
  ) as RelayerEncryptedInput;

  // Add the value based on type
  switch (type) {
    case "ebool":
      input.addBool(Boolean(value));
      break;
    case "euint8":
      input.add8(Number(value));
      break;
    case "euint16":
      input.add16(Number(value));
      break;
    case "euint32":
      input.add32(Number(value));
      break;
    case "euint64":
      input.add64(BigInt(value));
      break;
    case "euint128":
      input.add128(BigInt(value));
      break;
    case "euint256":
      input.add256(BigInt(value));
      break;
    case "eaddress":
      input.addAddress(String(value));
      break;
    default:
      throw new Error(`Unknown FHEVM type: ${type}`);
  }

  return await input.encrypt();
};

/**
 * Create an encrypted input builder for batch encryption
 *
 * This allows encrypting multiple values in a single input proof.
 *
 * @param instance - FHEVM instance
 * @param contractAddress - Target contract address
 * @param userAddress - User's Ethereum address
 * @returns Encrypted input builder
 *
 * @example
 * ```typescript
 * const builder = createEncryptedInput(instance, contractAddress, userAddress);
 * builder.add32(10).add32(20).add32(30);
 * const encrypted = await builder.encrypt();
 * ```
 */
export const createEncryptedInput = (
  instance: FhevmInstance,
  contractAddress: string,
  userAddress: string
): RelayerEncryptedInput => {
  return instance.createEncryptedInput(
    contractAddress,
    userAddress
  ) as RelayerEncryptedInput;
};

/**
 * Validate if a value can be encrypted with the given type
 *
 * @param value - Value to validate
 * @param type - FHEVM encrypted type
 * @returns true if valid, false otherwise
 */
export const isValidEncryptionValue = (
  value: any,
  type: FhevmEncryptedType
): boolean => {
  switch (type) {
    case "ebool":
      return typeof value === "boolean" || value === 0 || value === 1;
    case "euint8":
      return Number.isInteger(value) && value >= 0 && value <= 255;
    case "euint16":
      return Number.isInteger(value) && value >= 0 && value <= 65535;
    case "euint32":
      return Number.isInteger(value) && value >= 0 && value <= 4294967295;
    case "euint64":
    case "euint128":
    case "euint256":
      try {
        const bigIntValue = BigInt(value);
        return bigIntValue >= 0n;
      } catch {
        return false;
      }
    case "eaddress":
      return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
    default:
      return false;
  }
};
