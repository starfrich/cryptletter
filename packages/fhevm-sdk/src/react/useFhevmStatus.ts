"use client";

import { useFhevmContext } from "./FhevmProvider";
import type { FhevmStatus } from "./useFhevm";

/**
 * Hook to access FHEVM status from context
 *
 * Convenience hook that only returns the status field.
 * Useful when you only need to check the instance status.
 *
 * @throws Error if used outside FhevmProvider
 *
 * @example
 * ```typescript
 * function StatusIndicator() {
 *   const status = useFhevmStatus();
 *
 *   return (
 *     <div>
 *       FHEVM Status: {status}
 *       {status === 'loading' && ' 🔄'}
 *       {status === 'ready' && ' ✅'}
 *       {status === 'error' && ' ❌'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFhevmStatus(): FhevmStatus {
  const { status } = useFhevmContext();
  return status;
}
