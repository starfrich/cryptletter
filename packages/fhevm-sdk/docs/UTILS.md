# FHEVM SDK Utils Guide

Comprehensive guide to using the FHEVM SDK utilities for error handling, retries, validation, and debugging.

## Table of Contents

1. [Overview](#overview)
2. [Error Handling](#error-handling)
3. [Retry Logic](#retry-logic)
4. [Input Validation](#input-validation)
5. [Debug Logging](#debug-logging)
6. [Best Practices](#best-practices)

## Overview

The FHEVM SDK provides a complete toolkit for building robust, production-ready applications:

- **Error Handling**: Comprehensive error types with user-friendly recovery suggestions
- **Retry Logic**: Exponential backoff with jitter for resilient operations
- **Validation**: Type-safe input validation with helpful error messages
- **Debug Logging**: Structured logging and performance monitoring

### Quick Start

```typescript
import {
  // Error handling
  getErrorRecoverySuggestion,
  isRetryable,

  // Retry logic
  retryAsync,
  retryAsyncOrThrow,

  // Validation
  assertValidAddress,
  assertValidFhevmType,

  // Debug logging
  enableDebugLogging,
  measureAsync,
} from "@fhevm-sdk";
```

## Error Handling

The SDK provides structured error handling with automatic recovery suggestions for users.

### Error Types

```typescript
// FhevmError - Main error type for SDK errors
try {
  await someOperation();
} catch (error) {
  if (error instanceof FhevmError) {
    console.error(error.message); // User-friendly message
    console.error(error.code);    // Error code (FhevmErrorCode)
  }
}
```

### Getting Recovery Suggestions

```typescript
import {
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
} from "@fhevm-sdk";

try {
  await encryptValue(instance, address, user, value, type);
} catch (error) {
  // Get structured recovery suggestion
  const suggestion = getErrorRecoverySuggestion(error);

  console.error(suggestion.title);           // e.g., "Encryption Failed"
  console.error(suggestion.message);         // User-friendly explanation
  console.error(suggestion.actions);         // Array of recovery steps
  console.error(suggestion.retryable);       // true/false

  // Or format it for display
  const formatted = formatErrorSuggestion(suggestion);
  console.error(formatted);
}
```

### Checking Error Properties

```typescript
import {
  isRetryable,
  isUserActionError,
  createFhevmErrorWithSuggestion,
} from "@fhevm-sdk";

try {
  // Some operation
} catch (error) {
  if (isRetryable(error)) {
    // Error can be retried
    console.log("Error is retryable, will try again");
  }

  if (isUserActionError(error)) {
    // User rejected signature, switched chain, etc.
    console.log("User action required");
  }
}
```

### Common Error Codes

| Code | Meaning | Retryable |
|------|---------|-----------|
| `PROVIDER_NOT_FOUND` | No Ethereum provider (MetaMask) | No |
| `NETWORK_ERROR` | Network connectivity issue | Yes |
| `UNSUPPORTED_CHAIN` | Chain not supported | No |
| `CHAIN_MISMATCH` | Wallet on wrong chain | No |
| `ENCRYPTION_FAILED` | Encryption operation failed | Yes |
| `DECRYPTION_FAILED` | Decryption operation failed | Yes |
| `SIGNATURE_REJECTED` | User rejected signature | Yes |
| `OPERATION_TIMEOUT` | Operation took too long | Yes |
| `STORAGE_QUOTA_EXCEEDED` | Browser storage full | Yes |

## Retry Logic

The SDK provides sophisticated retry mechanisms with exponential backoff and jitter.

### Basic Retry

```typescript
import { retryAsync, retryAsyncOrThrow } from "@fhevm-sdk";

// Option 1: Get retry result
const result = await retryAsync(
  async () => {
    return await createFhevmInstance(params);
  }
);

if (result.success) {
  const instance = result.result;
  console.log(`Success after ${result.attempts} attempts`);
} else {
  console.error(`Failed after ${result.attempts} attempts`, result.error);
  console.log(`Total time spent: ${result.totalTimeMs}ms`);
}

// Option 2: Throw on failure
try {
  const instance = await retryAsyncOrThrow(
    async () => createFhevmInstance(params)
  );
} catch (error) {
  console.error("Failed to create instance:", error);
}
```

### Retry Configuration

```typescript
import { retryAsync, type RetryOptions } from "@fhevm-sdk";

const options: RetryOptions = {
  maxRetries: 5,              // Number of retry attempts (default: 3)
  initialDelayMs: 100,        // First retry delay (default: 100ms)
  maxDelayMs: 10000,          // Maximum delay (default: 5000ms)
  backoffMultiplier: 2,       // Exponential backoff factor (default: 2)
  useJitter: true,            // Add random jitter (default: true)

  // Optional callbacks
  onRetry: (attempt, error, nextDelayMs) => {
    console.log(`Attempt ${attempt} failed, retrying in ${nextDelayMs}ms`);
    console.log(`Error: ${error.message}`);
  },

  // Optional abort signal to cancel retries
  signal: abortController.signal,
};

const result = await retryAsync(
  async () => createFhevmInstance(params),
  options
);
```

### Retry with Timeout

```typescript
import { retryAsyncWithTimeout } from "@fhevm-sdk";

// Retry with total timeout constraint
const result = await retryAsyncWithTimeout(
  async () => createFhevmInstance(params),
  10000,  // 10 second total timeout
  {
    maxRetries: 3,
    initialDelayMs: 100,
  }
);
```

### Wrapping Functions

```typescript
import { retryWrap } from "@fhevm-sdk";

// Create a retryable version of a function
const createInstanceWithRetry = retryWrap(
  async (params: any) => createFhevmInstance(params),
  { maxRetries: 5, initialDelayMs: 200 }
);

// Use like a normal function
const result = await createInstanceWithRetry(params);
if (result.success) {
  const instance = result.result;
}
```

### Sync vs Async

```typescript
import { retrySync, retrySyncOrThrow } from "@fhevm-sdk";

// Synchronous retry
const result = retrySync(
  () => validateAddress(address),
  { maxRetries: 2 }
);

// Synchronous with throw
const isValid = retrySyncOrThrow(
  () => validateAddress(address),
  { maxRetries: 2 }
);
```

## Input Validation

The SDK provides comprehensive validation utilities to ensure correct inputs with helpful error messages.

### Address Validation

```typescript
import {
  isValidAddress,
  assertValidAddress,
  validateAddresses,
} from "@fhevm-sdk";

// Check if address is valid
if (!isValidAddress(address)) {
  console.error("Invalid address format");
}

// Assert and throw on invalid
try {
  assertValidAddress(address, "contractAddress");
} catch (error) {
  console.error(error.message);
}

// Validate multiple addresses
const results = validateAddresses([addr1, addr2, addr3], true);
results.forEach((isValid, i) => {
  console.log(`Address ${i}: ${isValid ? "valid" : "invalid"}`);
});
```

### FHEVM Type Validation

```typescript
import {
  isValidFhevmType,
  assertValidFhevmType,
  getValidFhevmTypes,
} from "@fhevm-sdk";

// Check FHEVM type
if (!isValidFhevmType("euint32")) {
  console.error("Invalid FHEVM type");
}

// Assert and throw
try {
  assertValidFhevmType(userInputType);
} catch (error) {
  console.error(`Invalid type: ${error.message}`);
}

// Get list of valid types
const validTypes = getValidFhevmTypes();
// ["ebool", "euint8", "euint16", "euint32", "euint64", "euint128", "euint256", "eaddress"]
```

### Value Validation

```typescript
import {
  validateEncryptionValue,
  assertValidEncryptionValue,
} from "@fhevm-sdk";

// Validate value for a specific FHEVM type
const isValid = validateEncryptionValue(userValue, "euint32");

if (isValid) {
  console.log("Value is valid for euint32");
} else {
  console.log("Value is out of range for euint32");
}

// Assert and throw with details
try {
  assertValidEncryptionValue(userValue, "euint8");
} catch (error) {
  // Error includes helpful range information
  console.error(error.message);
}
```

Value ranges by type:

| Type | Min | Max |
|------|-----|-----|
| `ebool` | 0 | 1 |
| `euint8` | 0 | 255 |
| `euint16` | 0 | 65,535 |
| `euint32` | 0 | 4,294,967,295 |
| `euint64` | 0 | 18,446,744,073,709,551,615 |
| `euint128` | 0 | 340,282,366,920,938,463,463,374,607,431,768,211,455 |
| `euint256` | 0 | 115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457,584,007,913,129,639,935 |

### Chain Validation

```typescript
import {
  isValidChainId,
  isEthereumCompatibleChain,
  COMMON_CHAIN_IDS,
} from "@fhevm-sdk";

// Validate chain ID
if (!isValidChainId(chainId)) {
  console.error("Invalid chain ID");
}

// Check if chain is Ethereum-compatible
if (isEthereumCompatibleChain(31337)) {
  console.log("Chain is Ethereum-compatible");
}

// Use common chain IDs
console.log(COMMON_CHAIN_IDS.HARDHAT);        // 31337
console.log(COMMON_CHAIN_IDS.SEPOLIA);        // 11155111
console.log(COMMON_CHAIN_IDS.ETHEREUM);       // 1
console.log(COMMON_CHAIN_IDS.POLYGON);        // 137
console.log(COMMON_CHAIN_IDS.POLYGON_MUMBAI); // 80001
```

### Hex String Validation

```typescript
import {
  isValidHex,
  normalizeHex,
} from "@fhevm-sdk";

// Check if valid hex
if (!isValidHex("0xdeadbeef")) {
  console.error("Invalid hex string");
}

// Normalize hex (ensure 0x prefix)
const normalized = normalizeHex("deadbeef");
console.log(normalized); // "0xdeadbeef"
```

### Parameter Validation

```typescript
import {
  assertDefined,
  assertRequiredParams,
  assertNotEmpty,
  assertNotEmptyArray,
} from "@fhevm-sdk";

// Check parameter is defined
try {
  assertDefined(userInput, "userInput");
} catch {
  console.error("userInput is required");
}

// Check multiple required parameters
try {
  assertRequiredParams(params, ["address", "value", "type"]);
} catch {
  console.error("Missing required parameters");
}

// Check string is not empty
try {
  assertNotEmpty(userMessage, "Message");
} catch {
  console.error("Message cannot be empty");
}

// Check array is not empty
try {
  assertNotEmptyArray(items, "Items");
} catch {
  console.error("Items array cannot be empty");
}
```

## Debug Logging

The SDK provides structured debug logging with performance monitoring.

### Enable Debug Logging

```typescript
import {
  enableDebugLogging,
  disableDebugLogging,
  setDebugLevel,
} from "@fhevm-sdk";

// Enable with all options
enableDebugLogging({
  verbose: true,              // Enable verbose logging
  metrics: true,              // Record performance metrics
  stackTrace: true,           // Include stack traces in logs
  prefix: "[My App]",         // Custom log prefix
  level: "debug",             // Log level: debug, info, warn, error
});

// Or just enable verbose mode
enableDebugLogging({ verbose: true });

// Change log level
setDebugLevel("warn");

// Disable all logging
disableDebugLogging();
```

### Logging Functions

```typescript
import {
  debug,
  info,
  warn,
  error,
} from "@fhevm-sdk";

// Log at different levels
debug("Detailed debugging information", { data: value });
info("Operation completed", { result });
warn("Deprecated API being used", { apiName: "oldFunction" });
error("Operation failed", errorObject);
```

### Performance Monitoring

```typescript
import {
  startTimer,
  measureAsync,
  measureSync,
  getMetrics,
  getPerformanceSummary,
  clearMetrics,
} from "@fhevm-sdk";

// Measure async operation
const result = await measureAsync(
  "create_instance",
  () => createFhevmInstance(params)
);

// Or use startTimer for manual control
const stopTimer = startTimer("encryption", { value: 42 });
await encryptValue(instance, address, user, value, type);
const metric = stopTimer();
console.log(`Took ${metric.durationMs}ms`);

// Measure sync operation
const result = measureSync(
  "validate_address",
  () => validateAddress(address)
);

// Get all recorded metrics
const metrics = getMetrics();
metrics.forEach(m => {
  console.log(`${m.name}: ${m.durationMs}ms`);
});

// Get performance summary
const summary = getPerformanceSummary();
console.table(summary);
// [
//   { name: 'encrypt', count: 5, avgDurationMs: 245, minDurationMs: 200, maxDurationMs: 310 },
//   { name: 'decrypt', count: 3, avgDurationMs: 180, minDurationMs: 150, maxDurationMs: 210 }
// ]

// Clear metrics
clearMetrics();
```

### Debug Groups

```typescript
import { createDebugGroup } from "@fhevm-sdk";

const { log, end } = createDebugGroup("Encryption Process");
log("Starting encryption...");
log("Value:", value);
log("Type:", type);
end();

// Output:
// [FHEVM SDK] Encryption Process
//   Starting encryption...
//   Value: 42
//   Type: euint32
```

### Object Formatting

```typescript
import { formatObject } from "@fhevm-sdk";

const complex = {
  name: "John",
  data: [1, 2, 3],
  nested: { key: "value" }
};

const formatted = formatObject(complex, 2);
console.log(formatted);
// {name: John, data: [1, 2, 3], nested: {key: value}}
```

## Best Practices

### Error Handling Patterns

```typescript
// 1. Get recovery suggestions and show to user
try {
  await operation();
} catch (error) {
  const suggestion = getErrorRecoverySuggestion(error);
  // Show suggestion to user in UI
  displayErrorToUser({
    title: suggestion.title,
    message: suggestion.message,
    actions: suggestion.actions,
  });
}

// 2. Retry with user feedback
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
  handleError(error);
}

// 3. Combine error handling with UI feedback
function handleError(error: unknown) {
  if (isUserActionError(error)) {
    // User needs to take action
    showUserActionRequired(error);
  } else if (isRetryable(error)) {
    // Could be retried automatically
    retryOperation();
  } else {
    // Fatal error
    showFatalError(error);
  }
}
```

### Validation Patterns

```typescript
// 1. Validate early in functions
async function encryptUserValue(address: string, value: unknown, type: string) {
  assertValidAddress(address, "address");
  assertValidFhevmType(type);
  assertValidEncryptionValue(value, type as FhevmEncryptedType);

  // Proceed with validated inputs
  return await encryptValue(instance, address, user, value, type);
}

// 2. Provide helpful error messages
try {
  assertValidAddress(userInput);
} catch {
  throw new Error(
    "Invalid contract address. Expected 42-character hex string starting with 0x"
  );
}

// 3. Batch validate multiple inputs
async function processValues(
  addresses: unknown[],
  values: unknown[]
) {
  assertNotEmptyArray(addresses, "addresses");
  assertNotEmptyArray(values, "values");

  if (addresses.length !== values.length) {
    throw new Error("addresses and values must have same length");
  }

  // Validate all addresses
  addresses.forEach((addr, i) => {
    try {
      assertValidAddress(addr, `addresses[${i}]`);
    } catch (error) {
      throw new Error(`Invalid address at index ${i}: ${error.message}`);
    }
  });

  // Process valid inputs
}
```

### Performance Monitoring Patterns

```typescript
// 1. Profile critical operations
async function criticalOperation() {
  return await measureAsync(
    "critical_operation",
    () => expensiveOperation(),
    { userId: currentUser.id, operationType: "batch" }
  );
}

// 2. Monitor performance over time
setInterval(() => {
  const summary = getPerformanceSummary();
  const slowOperations = summary.filter(s => s.avgDurationMs > 1000);

  if (slowOperations.length > 0) {
    console.warn("Slow operations detected:", slowOperations);
  }
}, 60000); // Every minute

// 3. Debug performance issues
enableDebugLogging({
  metrics: true,
  verbose: true,
});

// ... run operations ...

const metrics = getMetrics();
const byName = new Map();
metrics.forEach(m => {
  if (!byName.has(m.name)) {
    byName.set(m.name, []);
  }
  byName.get(m.name).push(m);
});

// Analyze outliers
byName.forEach((metrics, name) => {
  const durations = metrics.map(m => m.durationMs);
  const avg = durations.reduce((a, b) => a + b) / durations.length;
  const outliers = durations.filter(d => d > avg * 2);

  if (outliers.length > 0) {
    console.log(`${name} has ${outliers.length} slow executions:`, outliers);
  }
});
```

### Debug Logging Patterns

```typescript
// 1. Context-aware debugging
function createDebugContext(operation: string) {
  const { log, end } = createDebugGroup(operation);
  const startTime = performance.now();

  return {
    log,
    step: (stepName: string, data?: any) => {
      const elapsed = performance.now() - startTime;
      log(`[${elapsed.toFixed(0)}ms] ${stepName}`, data);
    },
    end,
  };
}

// Usage
const debug = createDebugContext("Encryption");
debug.step("Validating inputs", { value });
await validateInputs(value);
debug.step("Creating encryption", { type });
const encrypted = await createEncryption(value, type);
debug.end();

// 2. Conditional debugging
function debugIf(condition: boolean, message: string, data?: any) {
  if (condition) {
    debug(message, data);
  }
}

const isDevMode = process.env.NODE_ENV === "development";
debugIf(isDevMode, "Development mode enabled");
debugIf(isDevMode, "Current state", globalState);
```
