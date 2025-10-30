# Next.js Utils Integration Guide

Complete guide to integrating FHEVM SDK utils into your Next.js FHEVM application.

## Table of Contents

1. [Setup](#setup)
2. [Error Handling in React](#error-handling-in-react)
3. [Validation in Components](#validation-in-components)
4. [Retry in Hooks](#retry-in-hooks)
5. [Debug Logging Setup](#debug-logging-setup)
6. [Complete Example](#complete-example)
7. [Best Practices](#best-practices)

## Setup

### 1. Import Utilities

Utils can be imported from the main package or the utils subpath:

```typescript
import {
  // Error handling
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
  isRetryable,
  isUserActionError,

  // Validation
  assertValidAddress,
  assertValidFhevmType,
  assertValidEncryptionValue,

  // Retry logic
  retryAsync,
  retryAsyncOrThrow,

  // Debug logging
  enableDebugLogging,
  debug,
  info,
  measureAsync,
} from "@fhevm-sdk";

// Or from utils subpath
// import { ... } from "@fhevm-sdk/utils";
```

### 2. Enable Debug Logging (Optional)

```typescript
// app/layout.tsx or pages/_app.tsx
import { enableDebugLogging } from "@fhevm-sdk";

if (process.env.NODE_ENV === "development") {
  enableDebugLogging({
    verbose: true,
    metrics: true,
    stackTrace: false,
    level: "debug",
  });
}
```

## Error Handling in React

### Error Display Component

```typescript
// components/ErrorDisplay.tsx
import { getErrorRecoverySuggestion, formatErrorSuggestion } from "@fhevm-sdk";

interface ErrorDisplayProps {
  error: unknown;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorDisplay({
  error,
  onDismiss,
  onRetry,
}: ErrorDisplayProps) {
  const suggestion = getErrorRecoverySuggestion(error);

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <h3 className="font-semibold text-red-900">{suggestion.title}</h3>
      <p className="mt-1 text-sm text-red-800">{suggestion.message}</p>

      {suggestion.actions.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-medium text-red-900">What to do:</h4>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-red-800">
            {suggestion.actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="inline-flex items-center rounded border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Dismiss
          </button>
        )}
        {suggestion.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center rounded border border-red-600 bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
```

### Error Boundary

```typescript
// app/error-boundary.tsx
"use client";

import React from "react";
import { ErrorDisplay } from "./components/ErrorDisplay";

interface ErrorBoundaryProps {
  error: Error;
  reset: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  React.useEffect(() => {
    // Log error to monitoring service
    console.error("Error caught by boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ErrorDisplay error={error} onRetry={reset} />
      </div>
    </div>
  );
}
```

### Error Hook

```typescript
// hooks/useErrorHandler.ts
import { useState, useCallback } from "react";
import {
  getErrorRecoverySuggestion,
  isRetryable,
  isUserActionError,
} from "@fhevm-sdk";

export function useErrorHandler() {
  const [error, setError] = useState<unknown>(null);

  const handleError = useCallback((err: unknown) => {
    console.error("Error handled:", err);
    setError(err);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const errorInfo = error ? getErrorRecoverySuggestion(error) : null;

  return {
    error,
    errorInfo,
    isUserAction: error && isUserActionError(error),
    isRetryable: error && isRetryable(error),
    handleError,
    clearError,
  };
}
```

## Validation in Components

### Input Validation Hook

```typescript
// hooks/useValidation.ts
import { useState, useCallback } from "react";
import {
  isValidAddress,
  isValidFhevmType,
  validateEncryptionValue,
  type FhevmEncryptedType,
} from "@fhevm-sdk";

interface ValidationState {
  address: string;
  value: string;
  type: FhevmEncryptedType;
  errors: Record<string, string>;
}

export function useValidation() {
  const [state, setState] = useState<ValidationState>({
    address: "",
    value: "",
    type: "euint32",
    errors: {},
  });

  const validateAddress = useCallback((address: string) => {
    const newErrors = { ...state.errors };

    if (!address) {
      newErrors.address = "Address is required";
    } else if (!isValidAddress(address)) {
      newErrors.address = "Invalid Ethereum address";
    } else {
      delete newErrors.address;
    }

    setState((s) => ({ ...s, errors: newErrors }));
    return !newErrors.address;
  }, [state.errors]);

  const validateValue = useCallback((value: string) => {
    const newErrors = { ...state.errors };

    if (!value) {
      newErrors.value = "Value is required";
    } else if (!validateEncryptionValue(Number(value), state.type)) {
      const range = {
        euint8: "0-255",
        euint16: "0-65535",
        euint32: "0-4294967295",
        euint64: "0-18446744073709551615",
      }[state.type] || "0-max";
      newErrors.value = `Value must be between ${range}`;
    } else {
      delete newErrors.value;
    }

    setState((s) => ({ ...s, errors: newErrors }));
    return !newErrors.value;
  }, [state.type, state.errors]);

  return {
    state,
    setState,
    validateAddress,
    validateValue,
  };
}
```

### Form Component

```typescript
// components/EncryptForm.tsx
import React from "react";
import { useValidation } from "@/hooks/useValidation";
import { getValidFhevmTypes } from "@fhevm-sdk";

interface EncryptFormProps {
  onSubmit: (data: {
    address: string;
    value: number;
    type: string;
  }) => Promise<void>;
}

export function EncryptForm({ onSubmit }: EncryptFormProps) {
  const { state, setState, validateAddress, validateValue } = useValidation();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setState((s) => ({ ...s, address }));
    validateAddress(address);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setState((s) => ({ ...s, value }));
    validateValue(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation
    const addressValid = validateAddress(state.address);
    const valueValid = validateValue(state.value);

    if (!addressValid || !valueValid) {
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        address: state.address,
        value: Number(state.value),
        type: state.type,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Contract Address
        </label>
        <input
          type="text"
          value={state.address}
          onChange={handleAddressChange}
          placeholder="0x..."
          className={`mt-1 block w-full rounded border ${
            state.errors.address ? "border-red-300" : "border-gray-300"
          } px-3 py-2 shadow-sm`}
        />
        {state.errors.address && (
          <p className="mt-1 text-sm text-red-600">{state.errors.address}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          FHEVM Type
        </label>
        <select
          value={state.type}
          onChange={(e) =>
            setState((s) => ({ ...s, type: e.target.value as any }))
          }
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm"
        >
          {getValidFhevmTypes().map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Value
        </label>
        <input
          type="number"
          value={state.value}
          onChange={handleValueChange}
          placeholder="42"
          className={`mt-1 block w-full rounded border ${
            state.errors.value ? "border-red-300" : "border-gray-300"
          } px-3 py-2 shadow-sm`}
        />
        {state.errors.value && (
          <p className="mt-1 text-sm text-red-600">{state.errors.value}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Encrypting..." : "Encrypt"}
      </button>
    </form>
  );
}
```

## Retry in Hooks

### Encryption Hook with Retry

```typescript
// hooks/useFHEEncryptWithRetry.ts
import { useState, useCallback } from "react";
import { retryAsyncOrThrow, isRetryable } from "@fhevm-sdk";
import { useFhevmInstance } from "@fhevm-sdk/react";

interface EncryptResult {
  encrypted: string;
  durationMs: number;
}

export function useFHEEncryptWithRetry() {
  const instance = useFhevmInstance();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const encrypt = useCallback(
    async (
      address: string,
      value: number,
      type: string
    ): Promise<EncryptResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const startTime = performance.now();

        const encrypted = await retryAsyncOrThrow(
          async () => {
            return await instance.encrypt(value, type);
          },
          {
            maxRetries: 3,
            initialDelayMs: 100,
            onRetry: (attempt, err, delay) => {
              console.log(
                `Encryption retry ${attempt}/3, retrying in ${delay}ms`
              );
            },
          }
        );

        const durationMs = performance.now() - startTime;

        return {
          encrypted,
          durationMs,
        };
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [instance]
  );

  return {
    encrypt,
    isLoading,
    error,
    isRetryable: error && isRetryable(error),
  };
}
```

### Decryption with Signature Refresh

```typescript
// hooks/useFHEDecryptWithFallback.ts
import { useState, useCallback } from "react";
import { retryAsync } from "@fhevm-sdk";
import { useFhevmInstance } from "@fhevm-sdk/react";

export function useFHEDecryptWithFallback() {
  const instance = useFhevmInstance();
  const [isLoading, setIsLoading] = useState(false);

  const decrypt = useCallback(
    async (handle: string, contractAddress: string) => {
      setIsLoading(true);

      try {
        // First attempt with existing signature
        const result = await retryAsync(
          async () => {
            return await instance.decrypt(handle);
          },
          {
            maxRetries: 2,
            initialDelayMs: 500,
          }
        );

        if (result.success) {
          return result.result;
        }

        // If failed, try getting fresh signature
        console.log("Getting fresh decryption signature...");
        const freshSignature = await instance.getDecryptionSignature(
          contractAddress
        );

        // Try again with fresh signature
        const secondResult = await retryAsync(
          async () => {
            return await instance.decrypt(handle, freshSignature);
          },
          {
            maxRetries: 2,
            initialDelayMs: 500,
          }
        );

        if (secondResult.success) {
          return secondResult.result;
        }

        throw secondResult.error || new Error("Decryption failed");
      } finally {
        setIsLoading(false);
      }
    },
    [instance]
  );

  return {
    decrypt,
    isLoading,
  };
}
```

## Debug Logging Setup

### Global Debug Context

```typescript
// lib/debug-context.ts
import React from "react";
import {
  enableDebugLogging,
  disableDebugLogging,
  debug,
  info,
  warn,
  error,
  createDebugGroup,
  type DebugOptions,
} from "@fhevm-sdk";

export const DebugContext = React.createContext<{
  isDebugEnabled: boolean;
  enableDebug: (options?: DebugOptions) => void;
  disableDebug: () => void;
} | null>(null);

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = React.useState(
    process.env.NODE_ENV === "development"
  );

  const handleEnable = React.useCallback((options?: DebugOptions) => {
    enableDebugLogging(options);
    setIsEnabled(true);
  }, []);

  const handleDisable = React.useCallback(() => {
    disableDebugLogging();
    setIsEnabled(false);
  }, []);

  return (
    <DebugContext.Provider
      value={{
        isDebugEnabled: isEnabled,
        enableDebug: handleEnable,
        disableDebug: handleDisable,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = React.useContext(DebugContext);
  if (!context) {
    throw new Error("useDebug must be used within DebugProvider");
  }
  return context;
}
```

### Debug Toggle Component

```typescript
// components/DebugToggle.tsx
"use client";

import React from "react";
import { useDebug } from "@/lib/debug-context";
import { getDebugState, getPerformanceSummary } from "@fhevm-sdk";

export function DebugToggle() {
  const { isDebugEnabled, enableDebug, disableDebug } = useDebug();
  const [showMetrics, setShowMetrics] = React.useState(false);

  const handleToggle = () => {
    if (isDebugEnabled) {
      disableDebug();
    } else {
      enableDebug({
        verbose: true,
        metrics: true,
        level: "debug",
      });
    }
  };

  const metrics = showMetrics ? getPerformanceSummary() : [];

  return (
    <div className="fixed bottom-4 right-4 space-y-2">
      <button
        onClick={handleToggle}
        className={`rounded px-3 py-2 text-sm font-medium text-white ${
          isDebugEnabled ? "bg-red-600" : "bg-gray-600"
        }`}
      >
        {isDebugEnabled ? "Debug ON" : "Debug OFF"}
      </button>

      {isDebugEnabled && (
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className="block rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        >
          {showMetrics ? "Hide Metrics" : "Show Metrics"}
        </button>
      )}

      {showMetrics && metrics.length > 0 && (
        <div className="max-w-sm rounded bg-black/80 p-3 text-white">
          <h3 className="font-mono text-xs font-bold">Performance:</h3>
          <div className="mt-2 space-y-1 font-mono text-xs">
            {metrics.map((m) => (
              <div key={m.name}>
                {m.name}: {m.avgDurationMs.toFixed(1)}ms (avg)
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Complete Example

### Full Counter Example with Utils

```typescript
// app/counter/page.tsx
"use client";

import React from "react";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { EncryptForm } from "@/components/EncryptForm";
import { useFHEEncryptWithRetry } from "@/hooks/useFHEEncryptWithRetry";
import { useFHEDecryptWithFallback } from "@/hooks/useFHEDecryptWithFallback";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { measureAsync, info } from "@fhevm-sdk";

interface EncryptedValue {
  address: string;
  value: number;
  type: string;
  handle: string;
  timestamp: number;
}

export default function CounterPage() {
  const [encrypted, setEncrypted] = React.useState<EncryptedValue | null>(null);
  const [decrypted, setDecrypted] = React.useState<number | null>(null);
  const { encrypt, isLoading: isEncrypting } = useFHEEncryptWithRetry();
  const { decrypt, isLoading: isDecrypting } = useFHEDecryptWithFallback();
  const { error, errorInfo, handleError, clearError } = useErrorHandler();

  const handleEncrypt = async (data: {
    address: string;
    value: number;
    type: string;
  }) => {
    try {
      info("Starting encryption", { value: data.value, type: data.type });

      const result = await measureAsync(
        "encrypt_total",
        () => encrypt(data.address, data.value, data.type),
        { valueSize: String(data.value).length }
      );

      setEncrypted({
        ...data,
        handle: result.encrypted,
        timestamp: Date.now(),
      });

      info("Encryption successful", {
        handle: result.encrypted.slice(0, 10) + "...",
      });
    } catch (err) {
      handleError(err);
    }
  };

  const handleDecrypt = async () => {
    if (!encrypted) return;

    try {
      info("Starting decryption", { handle: encrypted.handle.slice(0, 10) });

      const result = await measureAsync(
        "decrypt_total",
        () => decrypt(encrypted.handle, encrypted.address)
      );

      setDecrypted(result);
      info("Decryption successful", { value: result });
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <h1 className="text-2xl font-bold">FHE Counter</h1>

      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={clearError}
          onRetry={handleEncrypt}
        />
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Encrypt Value</h2>
        <EncryptForm onSubmit={handleEncrypt} />
        {isEncrypting && <p className="text-center text-gray-600">Encrypting...</p>}
      </div>

      {encrypted && (
        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="font-semibold">Encrypted Value</h3>
          <p className="mt-2 break-all font-mono text-sm">{encrypted.handle}</p>
          <p className="mt-2 text-sm text-gray-600">
            Original: {encrypted.value} ({encrypted.type})
          </p>

          <button
            onClick={handleDecrypt}
            disabled={isDecrypting}
            className="mt-4 w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isDecrypting ? "Decrypting..." : "Decrypt"}
          </button>
        </div>
      )}

      {decrypted !== null && (
        <div className="rounded-lg bg-green-50 p-4">
          <h3 className="font-semibold">Decrypted Value</h3>
          <p className="mt-2 text-2xl font-bold">{decrypted}</p>
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Validate Early

```typescript
// ✅ Good: Validate at function entry
async function processValue(address: string, value: number, type: string) {
  assertValidAddress(address);
  assertValidFhevmType(type);
  assertValidEncryptionValue(value, type as FhevmEncryptedType);

  // Safe to proceed
}

// ❌ Bad: Validate too late
async function processValue(address: string, value: number, type: string) {
  const encrypted = await instance.encrypt(value, type); // Might fail
  assertValidAddress(address); // Too late
}
```

### 2. Use Retry for Transient Errors

```typescript
// ✅ Good: Retry automatically
try {
  const result = await retryAsyncOrThrow(
    () => createFhevmInstance(params),
    { maxRetries: 3 }
  );
} catch (error) {
  // Only permanent errors reach here
}

// ❌ Bad: Manual retry without backoff
let result;
for (let i = 0; i < 3; i++) {
  try {
    result = await createFhevmInstance(params);
    break;
  } catch (e) {
    if (i === 2) throw e;
  }
}
```

### 3. Show User-Friendly Errors

```typescript
// ✅ Good: Use error recovery suggestions
try {
  await operation();
} catch (error) {
  const suggestion = getErrorRecoverySuggestion(error);
  showUserError({
    title: suggestion.title,
    message: suggestion.message,
    actions: suggestion.actions,
  });
}

// ❌ Bad: Show raw error
try {
  await operation();
} catch (error) {
  showUserError(error.message); // Confusing for users
}
```

### 4. Use Debug Logging in Development

```typescript
// ✅ Good: Conditional debug logging
if (process.env.NODE_ENV === "development") {
  enableDebugLogging({
    verbose: true,
    metrics: true,
  });
}

// ❌ Bad: Debug logging in production
enableDebugLogging({ verbose: true }); // Memory overhead
```

### 5. Combine Tools for Robustness

```typescript
// ✅ Good: Combine validation, retry, and error handling
async function robustEncrypt(address: string, value: number, type: string) {
  // 1. Validate
  assertValidAddress(address);
  assertValidFhevmType(type);
  assertValidEncryptionValue(value, type);

  // 2. Retry with exponential backoff
  try {
    return await retryAsyncOrThrow(
      () => instance.encrypt(value, type),
      { maxRetries: 3, initialDelayMs: 100 }
    );
  } catch (error) {
    // 3. Get recovery suggestion
    const suggestion = getErrorRecoverySuggestion(error);
    throw new Error(`Encryption failed: ${suggestion.message}`);
  }
}
```
