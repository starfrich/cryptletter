"use client";

import { useFhevmContext } from "./FhevmProvider";
import type { FhevmInstance } from "../core/types";

/**
 * Hook to access FHEVM instance from context
 *
 * Convenience hook that only returns the instance field.
 * Useful when you only need the FHEVM instance for encryption/decryption.
 *
 * @throws Error if used outside FhevmProvider
 *
 * @example
 * ```typescript
 * function EncryptButton() {
 *   const instance = useFhevmInstance();
 *
 *   const handleEncrypt = async () => {
 *     if (!instance) {
 *       console.error('FHEVM instance not ready');
 *       return;
 *     }
 *
 *     const encrypted = instance.createEncryptedInput(contractAddress, userAddress);
 *     encrypted.add32(42);
 *     const result = await encrypted.encrypt();
 *   };
 *
 *   return <button onClick={handleEncrypt}>Encrypt</button>;
 * }
 * ```
 */
export function useFhevmInstance(): FhevmInstance | undefined {
  const { instance } = useFhevmContext();
  return instance;
}
