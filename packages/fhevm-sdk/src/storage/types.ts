/**
 * Storage Types
 *
 * @deprecated This file is kept for backward compatibility.
 * Please import from '@fhevm-sdk/types' instead.
 *
 * All types are now centralized in src/types/ directory for better organization.
 */

// Re-export all storage types from the centralized types directory
export type {
  IFhevmStorage,
  GenericStringStorage,
  StorageType,
  StorageOptions,
  StorageFactory,
} from "../types/storage";

export { StorageError, StorageErrorCode } from "../types/errors";
