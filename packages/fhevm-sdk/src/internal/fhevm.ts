/**
 * Legacy internal FHEVM module - kept for backwards compatibility
 * @deprecated Use @fhevm-sdk/core/instance instead
 */

// Re-export everything from core for backwards compatibility
export {
  createFhevmInstance,
  FhevmError as FhevmReactError,
  FhevmAbortError,
} from "../core/instance";
