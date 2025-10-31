# FHEVM SDK Utils Integration

Guide for using @fhevm-sdk utilities in Next.js components.

## Setup

### Import Utilities

```typescript
import {
  // Validation
  assertValidAddress,
  assertValidEncryptionValue,
  assertValidFhevmType,

  // Error handling
  getErrorRecoverySuggestion,
  isRetryable,

  // Retry
  retryAsync,
  retryAsyncOrThrow,

  // Debug
  enableDebugLogging,
  debug,
  info,
} from "@fhevm-sdk";
```

### Enable Debug (Optional)

```typescript
// app/layout.tsx
if (process.env.NODE_ENV === "development") {
  enableDebugLogging({ verbose: true, metrics: true });
}
```

## Error Handling

### Error Display Component

```typescript
import { getErrorRecoverySuggestion } from "@fhevm-sdk";

export function ErrorDisplay({ error, onRetry }: Props) {
  const suggestion = getErrorRecoverySuggestion(error);

  return (
    <div className="error-container">
      <h3>{suggestion.title}</h3>
      <p>{suggestion.message}</p>

      {suggestion.actions.map((action, i) => (
        <li key={i}>{action}</li>
      ))}

      {suggestion.retryable && onRetry && (
        <button onClick={onRetry}>Try Again</button>
      )}
    </div>
  );
}
```

### Error Hook

```typescript
import { getErrorRecoverySuggestion, isRetryable } from "@fhevm-sdk";

export function useErrorHandler() {
  const [error, setError] = useState<unknown>(null);

  const handleError = useCallback((err: unknown) => {
    console.error("Error:", err);
    setError(err);
  }, []);

  const errorInfo = error ? getErrorRecoverySuggestion(error) : null;

  return {
    error,
    errorInfo,
    isRetryable: error && isRetryable(error),
    handleError,
    clearError: () => setError(null),
  };
}
```

## Validation

### Input Validation Hook

```typescript
import { isValidAddress, validateEncryptionValue } from "@fhevm-sdk";

export function useValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateAddress = (address: string) => {
    if (!isValidAddress(address)) {
      setErrors(e => ({ ...e, address: "Invalid address" }));
      return false;
    }
    return true;
  };

  const validateValue = (value: number, type: FhevmType) => {
    if (!validateEncryptionValue(value, type)) {
      setErrors(e => ({ ...e, value: "Value out of range" }));
      return false;
    }
    return true;
  };

  return { errors, validateAddress, validateValue };
}
```

## Retry Logic

### Encryption with Retry

```typescript
import { retryAsyncOrThrow } from "@fhevm-sdk";
import { useFHEEncryption } from "@fhevm-sdk/react";

export function useEncryptWithRetry() {
  const { encryptData } = useFHEEncryption();

  const encrypt = async (value: number, type: string) => {
    return await retryAsyncOrThrow(
      async () => await encryptData(value, type),
      {
        maxRetries: 3,
        initialDelayMs: 100,
        onRetry: (attempt, err, delay) => {
          console.log(`Retry ${attempt}/3 in ${delay}ms`);
        },
      }
    );
  };

  return { encrypt };
}
```

### Decryption with Fallback

```typescript
import { retryAsync } from "@fhevm-sdk";
import { useFHEDecrypt } from "@fhevm-sdk/react";

export function useDecryptWithFallback() {
  const { decrypt } = useFHEDecrypt();

  const decryptWithRetry = async (handle: string, contractAddress: string) => {
    // Try with existing signature
    const result = await retryAsync(
      async () => await decrypt(handle),
      { maxRetries: 2 }
    );

    if (result.success) return result.result;

    // Retry with fresh signature
    const freshSig = await getDecryptionSignature(contractAddress);
    const secondResult = await retryAsync(
      async () => await decrypt(handle, freshSig),
      { maxRetries: 2 }
    );

    if (secondResult.success) return secondResult.result;

    throw secondResult.error || new Error("Decryption failed");
  };

  return { decrypt: decryptWithRetry };
}
```

## Debug Logging

### Debug Context

```typescript
import { enableDebugLogging, disableDebugLogging } from "@fhevm-sdk";

export function DebugProvider({ children }: Props) {
  const [isEnabled, setIsEnabled] = useState(false);

  const enableDebug = () => {
    enableDebugLogging({ verbose: true, metrics: true });
    setIsEnabled(true);
  };

  const disableDebug = () => {
    disableDebugLogging();
    setIsEnabled(false);
  };

  return (
    <DebugContext.Provider value={{ isEnabled, enableDebug, disableDebug }}>
      {children}
    </DebugContext.Provider>
  );
}
```

### Debug Toggle Component

```typescript
import { getPerformanceSummary } from "@fhevm-sdk";

export function DebugToggle() {
  const { isEnabled, enableDebug, disableDebug } = useDebug();
  const [showMetrics, setShowMetrics] = useState(false);

  const metrics = showMetrics ? getPerformanceSummary() : [];

  return (
    <div>
      <button onClick={isEnabled ? disableDebug : enableDebug}>
        {isEnabled ? "Debug ON" : "Debug OFF"}
      </button>

      {isEnabled && (
        <>
          <button onClick={() => setShowMetrics(!showMetrics)}>
            {showMetrics ? "Hide" : "Show"} Metrics
          </button>

          {showMetrics && (
            <div>
              {metrics.map(m => (
                <div key={m.name}>
                  {m.name}: {m.avgDurationMs.toFixed(1)}ms
                </div>
              ))}
            </div>
          )}
        </>
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
  assertValidEncryptionValue(value, type as FhevmType);

  // Safe to proceed
}
```

### 2. Use Retry for Transient Errors

```typescript
// ✅ Good: Automatic retry with backoff
const result = await retryAsyncOrThrow(
  () => createFhevmInstance(params),
  { maxRetries: 3 }
);
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
```

### 4. Conditional Debug Logging

```typescript
// ✅ Good: Only in development
if (process.env.NODE_ENV === "development") {
  enableDebugLogging({ verbose: true, metrics: true });
}
```

### 5. Combine Tools

```typescript
// ✅ Good: Validation + Retry + Error handling
async function robustEncrypt(address: string, value: number, type: string) {
  // Validate
  assertValidAddress(address);
  assertValidFhevmType(type);
  assertValidEncryptionValue(value, type);

  // Retry with backoff
  try {
    return await retryAsyncOrThrow(
      () => instance.encrypt(value, type),
      { maxRetries: 3 }
    );
  } catch (error) {
    // Get recovery suggestion
    const suggestion = getErrorRecoverySuggestion(error);
    throw new Error(`Encryption failed: ${suggestion.message}`);
  }
}
```

---

**See also:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - App architecture
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [README.md](../README.md) - Getting started
