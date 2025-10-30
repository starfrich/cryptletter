/**
 * Core FHEVM SDK Types
 *
 * This module contains all core type definitions for the FHEVM SDK.
 * These types are framework-agnostic and can be used across React, Vue, vanilla JS, and Node.js.
 *
 * @module types/fhevm
 */

import type { FhevmInstance as _FhevmInstance } from "@zama-fhe/relayer-sdk/bundle";
import type { FhevmInstanceConfig as _FhevmInstanceConfig } from "@zama-fhe/relayer-sdk/web";
import type { HandleContractPair as _HandleContractPair } from "@zama-fhe/relayer-sdk/bundle";
import type { DecryptedResults as _DecryptedResults } from "@zama-fhe/relayer-sdk/bundle";
import type { Eip1193Provider } from "ethers";

// ============================================================================
// Re-exports from RelayerSDK
// ============================================================================

/**
 * FHEVM instance object created by RelayerSDK
 * Contains methods for encryption, decryption, and EIP-712 signature creation
 */
export type FhevmInstance = _FhevmInstance;

/**
 * Configuration object for creating an FHEVM instance
 */
export type FhevmInstanceConfig = _FhevmInstanceConfig;

/**
 * Pair of encrypted handle and contract address for decryption
 */
export type HandleContractPair = _HandleContractPair;

/**
 * Results from decrypting multiple handles
 */
export type DecryptedResults = _DecryptedResults;

// ============================================================================
// FHEVM Instance Creation Types
// ============================================================================

/**
 * Configuration options for creating an FHEVM instance
 */
export interface CreateFhevmInstanceParams {
  /** Ethereum provider (EIP-1193) or RPC URL string */
  provider: Eip1193Provider | string;

  /** Optional chain IDs to treat as mock chains (for testing) */
  mockChains?: Record<number, string>;

  /** AbortSignal to cancel the instance creation */
  signal: AbortSignal;

  /** Optional callback for status updates during instance creation */
  onStatusChange?: (status: FhevmRelayerStatus) => void;
}

/**
 * Status values during FHEVM instance creation
 */
export type FhevmRelayerStatus =
  | "sdk-loading"      // Loading RelayerSDK script
  | "sdk-loaded"       // RelayerSDK script loaded
  | "sdk-initializing" // Initializing RelayerSDK
  | "sdk-initialized"  // RelayerSDK initialized
  | "creating";        // Creating FHEVM instance

// ============================================================================
// RelayerSDK Integration Types
// ============================================================================

/**
 * Options for initializing the RelayerSDK
 */
export interface FhevmInitSDKOptions {
  /** TFHE cryptographic parameters */
  tfheParams?: any;
  /** Key Management System parameters */
  kmsParams?: any;
  /** Number of worker threads */
  thread?: number;
}

/**
 * RelayerSDK interface attached to window
 */
export interface FhevmRelayerSDKType {
  /** Initialize the RelayerSDK with optional parameters */
  initSDK: (options?: FhevmInitSDKOptions) => Promise<boolean>;
  /** Create an FHEVM instance with the given configuration */
  createInstance: (config: FhevmInstanceConfig) => Promise<FhevmInstance>;
  /** Pre-configured settings for Sepolia testnet */
  SepoliaConfig: FhevmInstanceConfig;
  /** Internal flag to track initialization state */
  __initialized__?: boolean;
}

/**
 * Window interface with RelayerSDK attached
 */
export interface FhevmWindowType {
  /** RelayerSDK instance on the window object */
  relayerSDK: FhevmRelayerSDKType;
}

// ============================================================================
// Public Key & Params Storage Types
// ============================================================================

/**
 * Public key configuration for FHEVM instance
 */
export interface FhevmInstanceConfigPublicKey {
  /** Public key data as Uint8Array, or null if not loaded */
  data: Uint8Array | null;
  /** Public key identifier string */
  id: string | null;
}

/**
 * Public params configuration for FHEVM instance
 */
export interface FhevmInstanceConfigPublicParams {
  /** Security level parameters (2048-bit) */
  "2048": {
    /** Unique identifier for these public parameters */
    publicParamsId: string;
    /** Public parameters as Uint8Array */
    publicParams: Uint8Array;
  };
}

/**
 * Stored public key structure for persistence
 */
export interface FhevmStoredPublicKey {
  /** Unique identifier for this public key */
  publicKeyId: string;
  /** Public key bytes */
  publicKey: Uint8Array;
}

/**
 * Stored public params structure for persistence
 */
export interface FhevmStoredPublicParams {
  /** Unique identifier for these public params */
  publicParamsId: string;
  /** Public parameters bytes */
  publicParams: Uint8Array;
}

// ============================================================================
// Decryption Signature Types
// ============================================================================

/**
 * EIP-712 typed data structure for decryption authorization
 */
export interface EIP712Type {
  /** EIP-712 domain separator */
  domain: {
    /** Chain ID for this signature */
    chainId: number;
    /** Contract name */
    name: string;
    /** Contract address that verifies this signature */
    verifyingContract: `0x${string}`;
    /** EIP-712 version */
    version: string;
  };

  /** Message data to be signed */
  message: any;

  /** Primary type name for the message */
  primaryType: string;

  /** Type definitions for all types in the message */
  types: {
    [key: string]: {
      name: string;
      type: string;
    }[];
  };
}

/**
 * Complete decryption signature data structure
 * Contains all information needed to decrypt values from smart contracts
 */
export interface FhevmDecryptionSignatureType {
  /** User's public key for decryption */
  publicKey: string;

  /** User's private key for decryption (encrypted in storage) */
  privateKey: string;

  /** EIP-712 signature authorizing decryption */
  signature: string;

  /** Unix timestamp (seconds) when signature becomes valid */
  startTimestamp: number;

  /** Duration in days that signature remains valid */
  durationDays: number;

  /** User's Ethereum address */
  userAddress: `0x${string}`;

  /** Contract addresses authorized for decryption */
  contractAddresses: `0x${string}`[];

  /** EIP-712 typed data that was signed */
  eip712: EIP712Type;
}

// ============================================================================
// Encryption & Decryption Types
// ============================================================================
// Note: Detailed encryption/decryption types are in core/encryption.ts and core/decryption.ts
// This section only contains types needed across the SDK

/**
 * FHEVM encrypted types supported by the protocol
 */
export type FhevmType =
  | "ebool"
  | "euint4"
  | "euint8"
  | "euint16"
  | "euint32"
  | "euint64"
  | "euint128"
  | "euint256"
  | "eaddress"
  | "ebytes64"
  | "ebytes128"
  | "ebytes256";

// ============================================================================
// Legacy Type Aliases (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use FhevmInitSDKOptions instead
 */
export type FhevmCreateInstanceType = () => Promise<FhevmInstance>;

/**
 * @deprecated Use FhevmInitSDKOptions instead
 */
export type FhevmInitSDKType = (options?: FhevmInitSDKOptions) => Promise<boolean>;

/**
 * @deprecated Direct SDK loading is now internal
 */
export type FhevmLoadSDKType = () => Promise<void>;

/**
 * @deprecated Use internal chain support checking instead
 */
export type IsFhevmSupportedType = (chainId: number) => boolean;
