# Error Handling Guide

Comprehensive guide to handling errors in FHEVM SDK applications with user-friendly recovery strategies.

## Table of Contents

1. [Overview](#overview)
2. [Error Types](#error-types)
3. [Recovery Suggestions](#recovery-suggestions)
4. [Common Patterns](#common-patterns)
5. [User-Facing Error UI](#user-facing-error-ui)
6. [Error Recovery Strategies](#error-recovery-strategies)

## Overview

The FHEVM SDK provides structured error handling with automatic user-friendly recovery suggestions. Every error includes:

- **Title**: Short description of what went wrong
- **Message**: Detailed explanation for users
- **Actions**: Step-by-step recovery instructions
- **Retryable**: Whether the operation can be retried

```typescript
import {
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
  isRetryable,
  isUserActionError,
} from "@fhevm-sdk";

try {
  await someOperation();
} catch (error) {
  // Get structured recovery suggestion
  const suggestion = getErrorRecoverySuggestion(error);

  console.log(suggestion.title);       // "Encryption Failed"
  console.log(suggestion.message);     // User-friendly explanation
  console.log(suggestion.actions);     // ["1. ...", "2. ...", "3. ..."]
  console.log(suggestion.retryable);   // true or false
}
```

## Error Types

### 1. Provider Errors

**PROVIDER_NOT_FOUND**: No Ethereum provider detected

```typescript
// User hasn't installed MetaMask or similar
try {
  const provider = await getProvider();
} catch (error) {
  // Message: "The application could not find an Ethereum provider (like MetaMask)."
  // Actions: Install wallet, reload page, connect wallet
  // Retryable: false
}
```

**Recovery Pattern:**

```typescript
function handleProviderNotFound(error: unknown) {
  // Detect this error
  if (error instanceof FhevmError &&
      error.code === FhevmErrorCode.PROVIDER_NOT_FOUND) {
    // Show installation prompts
    showWalletInstallationGuide([
      "MetaMask",
      "WalletConnect",
      "Ledger",
      "Coinbase Wallet"
    ]);
  }
}
```

### 2. Network Errors

**NETWORK_ERROR**: Connection to blockchain failed

```typescript
// Network is unavailable or unstable
try {
  const balance = await provider.getBalance(address);
} catch (error) {
  // Message: "Failed to connect to the blockchain network."
  // Actions: Check internet, check network status, retry
  // Retryable: true - can retry with backoff
}
```

**Recovery Pattern:**

```typescript
async function withNetworkRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof FhevmError &&
          error.code === FhevmErrorCode.NETWORK_ERROR) {

        if (i < maxAttempts - 1) {
          // Wait before retry with exponential backoff
          const delay = Math.pow(2, i) * 1000;
          console.log(`Network error, retrying in ${delay}ms...`);
          await sleep(delay);
        }
      } else {
        throw error; // Not retryable
      }
    }
  }

  throw new Error("Operation failed after retries");
}
```

**UNSUPPORTED_CHAIN**: User is on unsupported chain

```typescript
// User has MetaMask connected to wrong chain
try {
  await operateOnChain();
} catch (error) {
  // Message: "The current blockchain network is not supported..."
  // Actions: Switch to supported network in wallet
  // Retryable: false
}
```

**Recovery Pattern:**

```typescript
import { COMMON_CHAIN_IDS } from "@fhevm-sdk";

async function ensureCorrectChain(): Promise<void> {
  try {
    const chainId = await provider.getChainId();

    // Check if chain is supported
    const supportedChains = [
      COMMON_CHAIN_IDS.SEPOLIA,
      COMMON_CHAIN_IDS.HARDHAT,
    ];

    if (!supportedChains.includes(chainId)) {
      // Show chain switch UI
      showChainSwitchPrompt(supportedChains);

      // Try to switch chain programmatically
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${COMMON_CHAIN_IDS.SEPOLIA.toString(16)}` }],
        });
      } catch (switchError) {
        // User rejected or doesn't have chain added
        showAddChainInstructions();
      }
    }
  } catch (error) {
    handleError(error);
  }
}
```

**CHAIN_MISMATCH**: Wallet and application expect different chains

```typescript
// User's wallet is on chain A, app expects chain B
// Similar to UNSUPPORTED_CHAIN but more specific
```

### 3. SDK Initialization Errors

**SDK_LOAD_FAILED**: Failed to load FHEVM SDK library

```typescript
try {
  const fhevm = await initializeFhevm();
} catch (error) {
  // Message: "The FHEVM SDK library could not be loaded."
  // Actions: Check internet, hard refresh, clear cache
  // Retryable: true
}
```

**Recovery Pattern:**

```typescript
async function loadSdkWithRecovery(): Promise<any> {
  // Retry with exponential backoff
  const result = await retryAsyncOrThrow(
    async () => {
      // Clear service workers that might be caching old version
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        registrations.forEach(reg => reg.unregister());
      }

      return await initializeFhevm();
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      onRetry: (attempt, error) => {
        console.log(`SDK load attempt ${attempt} failed, retrying...`);
        if (attempt === 2) {
          // Last attempt - suggest hard refresh
          console.log("If problem persists, try hard refresh (Ctrl+Shift+R)");
        }
      }
    }
  );

  return result;
}
```

**SDK_INIT_FAILED**: Failed to initialize FHEVM SDK

```typescript
try {
  await sdk.initialize(config);
} catch (error) {
  // Message: "The FHEVM SDK could not be initialized."
  // Actions: Check provider config, ensure on supported network, reload
  // Retryable: true
}
```

### 4. Encryption/Decryption Errors

**ENCRYPTION_FAILED**: Encryption operation failed

```typescript
try {
  const encrypted = await instance.encrypt(value, type);
} catch (error) {
  // Message: "Failed to encrypt the provided value."
  // Actions: Verify value valid for type, check contract address, check instance
  // Retryable: true
}
```

**Recovery Pattern:**

```typescript
async function encryptWithValidation(
  instance: any,
  address: string,
  value: unknown,
  type: FhevmEncryptedType
): Promise<string> {
  // Validate before attempting
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
    {
      maxRetries: 2,
      initialDelayMs: 500,
      onRetry: () => {
        console.log("Encryption failed, retrying...");
      }
    }
  );
}
```

**INVALID_FHEVM_TYPE**: Invalid FHEVM type specified

```typescript
try {
  const encrypted = await instance.encrypt(42, "euint999");
} catch (error) {
  // Message: "The specified FHEVM type is not recognized..."
  // Valid types: ebool, euint8, euint16, euint32, euint64, euint128, euint256, eaddress
  // Retryable: false
}
```

**Recovery Pattern:**

```typescript
import { getValidFhevmTypes } from "@fhevm-sdk";

function validateAndSuggestType(userType: string): FhevmEncryptedType {
  const validTypes = getValidFhevmTypes();

  if (validTypes.includes(userType as any)) {
    return userType as FhevmEncryptedType;
  }

  // Suggest closest match
  console.error(`Invalid type "${userType}"`);
  console.error(`Valid types are: ${validTypes.join(", ")}`);

  // Auto-select appropriate type based on value?
  showTypeSelectionUI(validTypes);
  throw new Error("Invalid FHEVM type");
}
```

**INVALID_ENCRYPTION_VALUE**: Value out of range for type

```typescript
try {
  const encrypted = await instance.encrypt(999, "euint8"); // Max is 255
} catch (error) {
  // Message: "The value cannot be encrypted with the specified FHEVM type."
  // Actions: Use correct range, update input, check type
  // Retryable: false
}
```

**Recovery Pattern:**

```typescript
import { validateEncryptionValue } from "@fhevm-sdk";

function validateValueWithHint(value: unknown, type: FhevmEncryptedType): void {
  if (!validateEncryptionValue(value, type)) {
    // Define type ranges locally
    const typeRanges: Record<FhevmEncryptedType, { min: bigint; max: bigint }> = {
      ebool: { min: 0n, max: 1n },
      euint8: { min: 0n, max: 255n },
      euint16: { min: 0n, max: 65535n },
      euint32: { min: 0n, max: 4294967295n },
      euint64: { min: 0n, max: 18446744073709551615n },
      euint128: { min: 0n, max: 340282366920938463463374607431768211455n },
      euint256: { min: 0n, max: 115792089237316195423570985008687907853269984665640564039457584007913129639935n },
      eaddress: { min: 0n, max: 1n }, // Not used
    };

    const range = typeRanges[type];
    throw new Error(
      `Value ${value} is out of range for ${type}. ` +
      `Must be between ${range.min} and ${range.max}. ` +
      `Try a smaller value or a larger type (e.g., euint16 instead of euint8).`
    );
  }
}
```

**DECRYPTION_FAILED**: Decryption operation failed

```typescript
try {
  const decrypted = await instance.decrypt(encryptedHandle);
} catch (error) {
  // Message: "Failed to decrypt the encrypted value."
  // Actions: Check signature, verify handle, verify contract address, signature may be expired
  // Retryable: true
}
```

**Recovery Pattern:**

```typescript
async function decryptWithSignatureRefresh(
  instance: any,
  handle: string,
  contractAddress: string
): Promise<any> {
  try {
    // Try decryption
    return await instance.decrypt(handle);
  } catch (error) {
    const suggestion = getErrorRecoverySuggestion(error);

    // Check if signature might be expired
    if (suggestion.message.includes("signature")) {
      console.log("Attempting to get fresh signature...");

      // Request new signature
      try {
        const signature = await instance.getDecryptionSignature(contractAddress);

        // Try decryption again with new signature
        return await instance.decrypt(handle, signature);
      } catch (signError) {
        console.error("Failed to get new signature:", signError);
        throw error; // Original error
      }
    }

    throw error;
  }
}
```

### 5. Signature Errors

**SIGNATURE_FAILED**: Failed to create/load signature

```typescript
try {
  const signature = await signer.signMessage(message);
} catch (error) {
  // Message: "Failed to create or load the decryption signature."
  // Actions: Try signing again, ensure wallet connected, check wallet, try private window
  // Retryable: true
}
```

**SIGNATURE_REJECTED**: User rejected signature

```typescript
try {
  const signature = await signer.signMessage(message);
} catch (error) {
  // User clicked "Cancel" in wallet
  // Message: "You rejected the signature request in your wallet."
  // Actions: Approve next time, may need to sign multiple times per address
  // Retryable: true
}
```

**Recovery Pattern:**

```typescript
function handleSignatureRejection(): void {
  // This is a user action error - don't retry automatically
  showUserMessage({
    title: "Signature Required",
    message: "Please approve the signature request to continue",
    type: "info",
    actions: [
      "Check your wallet for signature prompt",
      "You may need to sign for each contract address",
    ]
  });
}
```

**SIGNATURE_EXPIRED**: Signature is no longer valid

```typescript
try {
  const decrypted = await instance.decrypt(handle, oldSignature);
} catch (error) {
  // Message: "The decryption signature has expired..."
  // Actions: Request new signature, sign it, try again
  // Retryable: false - need new signature
}
```

**Recovery Pattern:**

```typescript
async function decryptWithSignatureRefresh(
  instance: any,
  handle: string,
  contractAddress: string
): Promise<any> {
  // Check if stored signature exists and might be expired
  const existingSignature = await loadStoredSignature(contractAddress);

  if (existingSignature) {
    try {
      // Try with existing signature
      return await instance.decrypt(handle, existingSignature);
    } catch (error) {
      if (error instanceof FhevmError &&
          error.code === FhevmErrorCode.SIGNATURE_EXPIRED) {
        console.log("Signature expired, requesting new one...");
      } else {
        throw error;
      }
    }
  }

  // Get fresh signature
  const signature = await instance.getDecryptionSignature(contractAddress);
  await saveStoredSignature(contractAddress, signature);

  // Try again
  return await instance.decrypt(handle, signature);
}
```

### 6. Storage Errors

**STORAGE_ERROR**: Browser storage operation failed

```typescript
try {
  await storage.set(key, value);
} catch (error) {
  // Message: "An error occurred while accessing browser storage."
  // Actions: Check storage not disabled, ensure disk space, clear cache, disable private mode
  // Retryable: true
}
```

**STORAGE_QUOTA_EXCEEDED**: Browser storage full

```typescript
try {
  await storage.set(key, largeValue);
} catch (error) {
  // Message: "Browser storage quota has been exceeded."
  // Actions: Clear browser cache, delete old data, try again
  // Retryable: true
}
```

**Recovery Pattern:**

```typescript
async function setStorageWithCleanup(
  storage: Storage,
  key: string,
  value: any
): Promise<void> {
  try {
    await storage.set(key, value);
  } catch (error) {
    const suggestion = getErrorRecoverySuggestion(error);

    if (suggestion.message.includes("quota")) {
      console.log("Storage full, cleaning up old entries...");

      // Get all stored entries
      const entries = await storage.getAll();

      // Remove oldest entries (assuming they're sorted by timestamp)
      const sorted = Object.entries(entries)
        .sort((a: any, b: any) => a[1]?.timestamp - b[1]?.timestamp);

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

**STORAGE_NOT_AVAILABLE**: Storage unavailable (private mode)

```typescript
try {
  const storage = await getIndexedDBStorage();
} catch (error) {
  // Message: "Browser storage is not available (possibly in private browsing mode)."
  // Actions: Disable private mode, use regular window
  // Retryable: false
}
```

**Recovery Pattern:**

```typescript
async function getStorageWithFallback(): Promise<Storage> {
  // Try IndexedDB first
  try {
    return await getIndexedDBStorage();
  } catch (error) {
    console.log("IndexedDB not available, using fallback...");

    // Fall back to localStorage
    if (canUseLocalStorage()) {
      return getLocalStorageBackend();
    }

    // Fall back to in-memory
    return getInMemoryStorage();
  }
}
```

### 7. Input Validation Errors

**INVALID_INPUT**: Invalid input provided

```typescript
try {
  assertRequiredParams(params, ["address", "value"]);
} catch (error) {
  // Message: "Invalid input was provided to an SDK function."
  // Actions: Check function docs, verify inputs, ensure required params
  // Retryable: false
}
```

**INVALID_ADDRESS**: Invalid Ethereum address

```typescript
try {
  assertValidAddress(address);
} catch (error) {
  // Message: "The provided Ethereum address is not valid."
  // Actions: Check format (42 chars, 0x prefix), ensure hex chars only
  // Retryable: false
}
```

**MISSING_PARAMETER**: Required parameter missing

```typescript
try {
  assertDefined(value, "contractAddress");
} catch (error) {
  // Message: "A required parameter is missing from the function call."
  // Actions: Check function signature, docs, examples
  // Retryable: false
}
```

## Recovery Suggestions

### Error Structure

```typescript
interface ErrorRecoverySuggestion {
  title: string;           // "Encryption Failed"
  message: string;         // User-friendly explanation
  actions: string[];       // ["1. ...", "2. ...", "3. ..."]
  retryable: boolean;      // true/false
}
```

### Getting Suggestions

```typescript
import {
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
} from "@fhevm-sdk";

try {
  await operation();
} catch (error) {
  // Get structured suggestion
  const suggestion = getErrorRecoverySuggestion(error);

  // Format for display
  const formatted = formatErrorSuggestion(suggestion);

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
import { getErrorRecoverySuggestion } from "@fhevm-sdk";

try {
  await operation();
} catch (error) {
  const suggestion = getErrorRecoverySuggestion(error);
  console.error(`Error: ${suggestion.title}`);
  console.error(`${suggestion.message}`);
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
    // User needs to take action (reject signature, switch chain, etc.)
    showUserActionRequired(error);
  } else if (isRetryable(error)) {
    // System error that can be retried
    retryAutomatically();
  } else {
    // Fatal error
    showFatalError(error);
  }
}
```

### Pattern 3: Automatic Retry

```typescript
import { retryAsyncOrThrow, isRetryable } from "@fhevm-sdk";

try {
  const result = await retryAsyncOrThrow(
    () => operation(),
    {
      maxRetries: 3,
      onRetry: (attempt, error, delay) => {
        if (isRetryable(error)) {
          console.log(`Retrying (${attempt}/3) in ${delay}ms...`);
        }
      }
    }
  );
} catch (error) {
  handlePermanentError(error);
}
```

### Pattern 4: Custom Error Handling

```typescript
function createErrorHandler() {
  return (error: unknown) => {
    const suggestion = getErrorRecoverySuggestion(error);

    // Log error
    logger.error({
      code: error instanceof FhevmError ? error.code : "unknown",
      message: suggestion.message,
      timestamp: new Date(),
    });

    // Show to user
    showNotification({
      title: suggestion.title,
      message: suggestion.message,
      type: "error",
      action: suggestion.actions[0],
    });

    // Report to monitoring
    if (!suggestion.retryable) {
      reportToBugTracker(error);
    }
  };
}
```

## User-Facing Error UI

### Simple Error Display

```typescript
function ErrorDisplay({ error }: { error: unknown }) {
  const suggestion = getErrorRecoverySuggestion(error);

  return (
    <div className="error-container">
      <h2>{suggestion.title}</h2>
      <p>{suggestion.message}</p>

      {suggestion.actions.length > 0 && (
        <div className="actions">
          <h3>What to do:</h3>
          <ol>
            {suggestion.actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        </div>
      )}

      {suggestion.retryable && (
        <button onClick={() => location.reload()}>
          Try Again
        </button>
      )}
    </div>
  );
}
```

### Error Notification Toast

```typescript
function showErrorNotification(error: unknown) {
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

### Modal with Recovery Steps

```typescript
function ErrorModal({ error, onClose }: { error: unknown; onClose: () => void }) {
  const suggestion = getErrorRecoverySuggestion(error);
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <Modal isOpen={true} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{suggestion.title}</ModalHeader>

        <ModalBody>
          <p>{suggestion.message}</p>

          {suggestion.actions.length > 0 && (
            <div className="steps">
              {suggestion.actions.map((action, i) => (
                <div
                  key={i}
                  className={`step ${i === currentStep ? "active" : ""} ${i < currentStep ? "completed" : ""}`}
                >
                  <span className="step-number">{i + 1}</span>
                  <span className="step-text">{action}</span>
                </div>
              ))}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {suggestion.retryable && (
            <Button variant="primary" onClick={() => retryOperation()}>
              Try Again
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
```

## Error Recovery Strategies

### Strategy 1: Exponential Backoff Retry

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
      if (elapsed > 60000) { // 60 second timeout
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
import { retryAsync } from "@fhevm-sdk";

async function operateWithFallback(address: string) {
  // Try primary method
  let result = await retryAsync(
    () => primaryMethod(address),
    { maxRetries: 2 }
  );

  if (!result.success) {
    console.log("Primary method failed, trying fallback...");

    // Try fallback method
    result = await retryAsync(
      () => fallbackMethod(address),
      { maxRetries: 2 }
    );
  }

  if (result.success) {
    return result.result;
  }

  throw result.error;
}
```

### Strategy 4: Graceful Degradation

```typescript
import { isNotQuotaExceeded } from "@fhevm-sdk";

async function storeWithFallback(storage: Storage, key: string, value: any) {
  try {
    // Try to store in IndexedDB
    await storage.set(key, value);
  } catch (error) {
    // If quota exceeded, store in memory instead
    if (!isNotQuotaExceeded(error)) {
      console.log("Storage quota exceeded, using in-memory storage");
      inMemoryCache.set(key, value);
      return;
    }

    throw error;
  }
}
```
