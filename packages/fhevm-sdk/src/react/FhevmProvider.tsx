"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { FhevmInstance } from "../core/types";
import { useFhevm, type UseFhevmParams, type FhevmStatus } from "./useFhevm";
import { GenericStringStorage } from "../storage/GenericStringStorage";

/**
 * FHEVM Context value
 */
export interface FhevmContextValue {
  /** FHEVM instance (undefined if not ready) */
  instance: FhevmInstance | undefined;
  /** Current status of instance creation */
  status: FhevmStatus;
  /** Error object if creation failed */
  error: Error | undefined;
  /** User-friendly error message */
  errorMessage: string | undefined;
  /** Manual refresh function to recreate instance */
  refresh: () => void;
  /** Current retry attempt number */
  retryCount: number;
  /** Storage instance (if provided) */
  storage: GenericStringStorage | undefined;
}

/**
 * FHEVM Context
 */
const FhevmContext = createContext<FhevmContextValue | undefined>(undefined);

/**
 * Props for FhevmProvider
 */
export interface FhevmProviderProps extends Omit<UseFhevmParams, "enabled"> {
  /** React children */
  children: React.ReactNode;
  /** Storage instance for decryption signatures */
  storage?: GenericStringStorage;
  /** Enable/disable instance creation (default: true) */
  enabled?: boolean;
}

/**
 * FHEVM Provider Component
 *
 * Provides FHEVM instance to all child components via React Context.
 * This allows you to access the FHEVM instance anywhere in your component tree
 * using the `useFhevmContext()` hook.
 *
 * @example
 * ```typescript
 * import { FhevmProvider } from '@fhevm-sdk/react';
 *
 * function App() {
 *   const provider = window.ethereum;
 *   const chainId = 11155111; // Sepolia
 *
 *   return (
 *     <FhevmProvider
 *       provider={provider}
 *       chainId={chainId}
 *       retry={{ maxRetries: 3, retryDelay: 2000 }}
 *       onSuccess={() => console.log('FHEVM ready!')}
 *     >
 *       <YourApp />
 *     </FhevmProvider>
 *   );
 * }
 * ```
 */
export const FhevmProvider: React.FC<FhevmProviderProps> = ({
  children,
  storage,
  enabled = true,
  ...fhevmParams
}) => {
  const { instance, status, error, errorMessage, refresh, retryCount } = useFhevm({
    ...fhevmParams,
    enabled,
  });

  const contextValue = useMemo<FhevmContextValue>(
    () => ({
      instance,
      status,
      error,
      errorMessage,
      refresh,
      retryCount,
      storage,
    }),
    [instance, status, error, errorMessage, refresh, retryCount, storage]
  );

  return (
    <FhevmContext.Provider value={contextValue}>
      {children}
    </FhevmContext.Provider>
  );
};

/**
 * Hook to access FHEVM context
 *
 * Must be used within a FhevmProvider component.
 *
 * @throws Error if used outside FhevmProvider
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { instance, status, error } = useFhevmContext();
 *
 *   if (status === 'loading') return <div>Loading FHEVM...</div>;
 *   if (status === 'error') return <div>Error: {error?.message}</div>;
 *   if (!instance) return null;
 *
 *   return <div>FHEVM is ready!</div>;
 * }
 * ```
 */
export function useFhevmContext(): FhevmContextValue {
  const context = useContext(FhevmContext);

  if (context === undefined) {
    throw new Error(
      "useFhevmContext must be used within a FhevmProvider. " +
      "Make sure your component is wrapped with <FhevmProvider>."
    );
  }

  return context;
}
