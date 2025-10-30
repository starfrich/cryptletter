/**
 * FHEVM SDK Types
 *
 * This module provides a centralized export point for all TypeScript types
 * used throughout the FHEVM SDK. Import types from this module to ensure
 * consistency across your application.
 *
 * @module types
 *
 * @example
 * ```typescript
 * // Import core types
 * import type {
 *   FhevmInstance,
 *   FhevmInstanceConfig,
 *   CreateFhevmInstanceParams
 * } from '@fhevm-sdk/types';
 *
 * // Import storage types
 * import type {
 *   IFhevmStorage,
 *   StorageOptions,
 *   StorageType
 * } from '@fhevm-sdk/types';
 *
 * // Import error types
 * import {
 *   FhevmError,
 *   FhevmErrorCode,
 *   FhevmAbortError
 * } from '@fhevm-sdk/types';
 * ```
 */

// ============================================================================
// Core FHEVM Types
// ============================================================================

export type {
  // RelayerSDK re-exports
  FhevmInstance,
  FhevmInstanceConfig,
  HandleContractPair,
  DecryptedResults,

  // Instance creation
  CreateFhevmInstanceParams,
  FhevmRelayerStatus,

  // RelayerSDK integration
  FhevmInitSDKOptions,
  FhevmRelayerSDKType,
  FhevmWindowType,

  // Public key & params
  FhevmInstanceConfigPublicKey,
  FhevmInstanceConfigPublicParams,
  FhevmStoredPublicKey,
  FhevmStoredPublicParams,

  // Decryption signatures
  EIP712Type,
  FhevmDecryptionSignatureType,

  // Encryption & decryption
  FhevmType,

  // Legacy type aliases (deprecated)
  FhevmCreateInstanceType,
  FhevmInitSDKType,
  FhevmLoadSDKType,
  IsFhevmSupportedType,
} from "./fhevm";

// ============================================================================
// Storage Types
// ============================================================================

export type {
  // Main storage interface
  IFhevmStorage,

  // Legacy storage interface (deprecated)
  GenericStringStorage,

  // Configuration
  StorageType,
  StorageOptions,
  StorageFactory,
} from "./storage";

// ============================================================================
// Wallet Callback Types (Framework-Agnostic)
// ============================================================================

export type {
  // EIP-712 types
  EIP712Domain,
  EIP712TypeProperty,
  EIP712Types,
  EIP712Message,

  // Callback types
  SignTypedDataCallback,
  GetAddressCallback,
  SendTransactionCallback,
  TransactionRequest,
  WalletCallbacks,
} from "./callbacks";

export {
  // Helper functions for creating callbacks
  createEthersCallbacks,
  createViemCallbacks,
  createMetaMaskCallbacks,
} from "./callbacks";

// ============================================================================
// Error Types
// ============================================================================

export {
  // Error codes
  FhevmErrorCode,
  StorageErrorCode,

  // Error classes
  FhevmError,
  FhevmAbortError,
  StorageError,

  // Error helpers
  isFhevmError,
  isFhevmAbortError,
  isStorageError,
  getErrorMessage,
} from "./errors";

// ============================================================================
// Type Categories for Organized Imports
// ============================================================================

/**
 * Namespace for core FHEVM types
 * Use this for organized imports when you need multiple types
 *
 * @example
 * ```typescript
 * import type { Core } from '@fhevm-sdk/types';
 *
 * function createInstance(config: Core.CreateFhevmInstanceParams): Promise<Core.FhevmInstance> {
 *   // ...
 * }
 * ```
 */
export * as Core from "./fhevm";

/**
 * Namespace for storage types
 * Use this for organized imports when you need multiple storage types
 *
 * @example
 * ```typescript
 * import type { Storage } from '@fhevm-sdk/types';
 *
 * function initStorage(options: Storage.StorageOptions): Storage.IFhevmStorage {
 *   // ...
 * }
 * ```
 */
export * as Storage from "./storage";

/**
 * Namespace for error types
 * Use this for organized imports when you need multiple error types
 *
 * @example
 * ```typescript
 * import { Errors } from '@fhevm-sdk/types';
 *
 * function handleError(error: unknown) {
 *   if (Errors.isFhevmError(error)) {
 *     console.log(Errors.getErrorMessage(error));
 *   }
 * }
 * ```
 */
export * as Errors from "./errors";
