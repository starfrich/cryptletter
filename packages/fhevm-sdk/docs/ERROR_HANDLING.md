# Error Handling Guide

Comprehensive guide to handling errors in FHEVM SDK applications with recovery strategies.

## Overview

The FHEVM SDK provides structured error handling with user-friendly recovery suggestions. Every error includes:

- **Title**: Short description
- **Message**: User-friendly explanation
- **Actions**: Step-by-step recovery instructions
- **Retryable**: Whether operation can be retried

```typescript
import { getErrorRecoverySuggestion, isRetryable } from "@fhevm-sdk";

try {
  await someOperation();
} catch (error) {
  const suggestion = getErrorRecoverySuggestion(error);

  console.log(suggestion.title);       // "Encryption Failed"
  console.log(suggestion.message);     // User-friendly explanation
  console.log(suggestion.actions);     // ["1. ...", "2. ...", "3. ..."]
  console.log(suggestion.retryable);   // true or false
}
```

## Common Error Types

### Provider Errors

| Code | Description | Retryable |
|------|-------------|-----------|
| `PROVIDER_NOT_FOUND` | No Ethereum provider (MetaMask) | No |
| `NETWORK_ERROR` | Network connectivity issue | Yes |
| `UNSUPPORTED_CHAIN` | Chain not supported | No |
| `CHAIN_MISMATCH` | Wallet on wrong chain | No |

**Example:**

```typescript
try {
  const provider = await getProvider();
} catch (error) {
  if (error.code === FhevmErrorCode.PROVIDER_NOT_FOUND) {
    showWalletInstallationGuide();
  }
}
```

### Encryption/Decryption Errors

| Code | Description | Retryable |
|------|-------------|-----------|
| `ENCRYPTION_FAILED` | Encryption operation failed | Yes |
| `DECRYPTION_FAILED` | Decryption operation failed | Yes |
| `INVALID_FHEVM_TYPE` | Invalid FHEVM type | No |
| `INVALID_ENCRYPTION_VALUE` | Value out of range | No |

**Example:**

```typescript
async function encryptWithValidation(instance, address, value, type) {
  try {
    assertValidAddress(address);
    assertValidFhevmType(type);
    assertValidEncryptionValue(value, type);
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  // Retry encryption if it fails
  return await retryAsyncOrThrow(
    () => instance.encrypt(value, type),
    { maxRetries: 2 }
  );
}
```

### Signature Errors

| Code | Description | Retryable |
|------|-------------|-----------|
| `SIGNATURE_FAILED` | Failed to create signature | Yes |
| `SIGNATURE_REJECTED` | User rejected signature | Yes |
| `SIGNATURE_EXPIRED` | Signature no longer valid | No |

**Example:**

```typescript
async function decryptWithSignatureRefresh(instance, handle, contractAddress) {
  try {
    return await instance.decrypt(handle);
  } catch (error) {
    if (error.code === FhevmErrorCode.SIGNATURE_EXPIRED) {
      // Get fresh signature
      const signature = await instance.getDecryptionSignature(contractAddress);
      return await instance.decrypt(handle, signature);
    }
    throw error;
  }
}
```

### Storage Errors

| Code | Description | Retryable |
|------|-------------|-----------|
| `STORAGE_ERROR` | Browser storage operation failed | Yes |
| `STORAGE_QUOTA_EXCEEDED` | Browser storage full | Yes |
| `STORAGE_NOT_AVAILABLE` | Storage unavailable (private mode) | No |

**Example:**

```typescript
async function setStorageWithCleanup(storage, key, value) {
  try {
    await storage.set(key, value);
  } catch (error) {
    if (error.code === FhevmErrorCode.STORAGE_QUOTA_EXCEEDED) {
      // Clean up old entries
      const entries = await storage.getAll();
      const sorted = Object.entries(entries).sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 50%
      for (let i = 0; i < sorted.length / 2; i++) {
        await storage.remove(sorted[i][0]);
      }

      // Retry
      await storage.set(key, value);
    }
  }
}
```

## Recovery Suggestions

### Getting Suggestions

```typescript
import { getErrorRecoverySuggestion, formatErrorSuggestion } from "@fhevm-sdk";

try {
  await operation();
} catch (error) {
  const suggestion = getErrorRecoverySuggestion(error);

  // Format for display
  const formatted = formatErrorSuggestion(suggestion);
  console.error(formatted);

  // Output:
  // ❌ Encryption Failed
  //    Failed to encrypt the provided value.
  //
  // What to do:
  //    1. Verify the value is valid for the specified FHEVM type
  //    2. Check that the contract address is correct
  //    3. Ensure your FHEVM instance is properly initialized
  //    4. Try again or contact support
  //    💡 This error is retryable - you can try again.
}
```

## Common Patterns

### Pattern 1: Simple Try-Catch

```typescript
try {
  await operation();
} catch (error) {
  const suggestion = getErrorRecoverySuggestion(error);
  console.error(`${suggestion.title}: ${suggestion.message}`);
  suggestion.actions.forEach(a => console.error(`  ${a}`));
}
```

### Pattern 2: User vs System Errors

```typescript
import { isUserActionError, isRetryable } from "@fhevm-sdk";

try {
  await operation();
} catch (error) {
  if (isUserActionError(error)) {
    // User needs to take action
    showUserActionRequired(error);
  } else if (isRetryable(error)) {
    // System error - retry automatically
    retryOperation();
  } else {
    // Fatal error
    showFatalError(error);
  }
}
```

### Pattern 3: Automatic Retry

```typescript
import { retryAsyncOrThrow } from "@fhevm-sdk";

try {
  const result = await retryAsyncOrThrow(
    () => operation(),
    {
      maxRetries: 3,
      onRetry: (attempt, error, delay) => {
        console.log(`Retrying (${attempt}/3) in ${delay}ms...`);
      }
    }
  );
} catch (error) {
  handlePermanentError(error);
}
```

## User-Facing Error UI

### Simple Error Display

```typescript
function ErrorDisplay({ error }) {
  const suggestion = getErrorRecoverySuggestion(error);

  return (
    <div className="error">
      <h2>{suggestion.title}</h2>
      <p>{suggestion.message}</p>

      {suggestion.actions.length > 0 && (
        <div>
          <h3>What to do:</h3>
          <ol>
            {suggestion.actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        </div>
      )}

      {suggestion.retryable && (
        <button onClick={() => location.reload()}>Try Again</button>
      )}
    </div>
  );
}
```

### Error Toast Notification

```typescript
function showErrorNotification(error) {
  const suggestion = getErrorRecoverySuggestion(error);

  toast.error({
    title: suggestion.title,
    description: suggestion.message,
    duration: 5000,
    action: suggestion.retryable ? {
      label: "Retry",
      onClick: () => retryLastOperation(),
    } : undefined,
  });
}
```

## Error Recovery Strategies

### Strategy 1: Exponential Backoff

```typescript
import { retryAsyncOrThrow } from "@fhevm-sdk";

const result = await retryAsyncOrThrow(
  () => riskyOperation(),
  {
    maxRetries: 5,
    initialDelayMs: 100,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    useJitter: true,
  }
);
```

### Strategy 2: Circuit Breaker

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed > 60000) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount > 5) {
      this.state = "open";
    }
  }

  private reset() {
    this.failureCount = 0;
    this.state = "closed";
  }
}
```

### Strategy 3: Fallback Chain

```typescript
async function operateWithFallback(address) {
  // Try primary method
  let result = await retryAsync(
    () => primaryMethod(address),
    { maxRetries: 2 }
  );

  if (!result.success) {
    // Try fallback method
    result = await retryAsync(
      () => fallbackMethod(address),
      { maxRetries: 2 }
    );
  }

  if (result.success) return result.result;
  throw result.error;
}
```

### Strategy 4: Graceful Degradation

```typescript
async function storeWithFallback(storage, key, value) {
  try {
    // Try IndexedDB
    await storage.set(key, value);
  } catch (error) {
    if (error.code === FhevmErrorCode.STORAGE_QUOTA_EXCEEDED) {
      // Fall back to in-memory storage
      inMemoryCache.set(key, value);
    } else {
      throw error;
    }
  }
}
```
