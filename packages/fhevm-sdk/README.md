# FHEVM SDK

A comprehensive, zero-config SDK for building privacy-preserving applications with Zama's Fully Homomorphic Encryption Virtual Machine (FHEVM).

## Features

- 🔐 **Complete FHEVM Integration** - Full support for encrypted computation on Ethereum
- ⚛️ **Framework Support** - React, Vue, and Node.js adapters with identical APIs
- 🎯 **Zero Configuration** - Works out of the box with sensible defaults
- 📝 **Type Safe** - Full TypeScript support with comprehensive type definitions
- 🛡️ **Robust Error Handling** - Detailed error types with user-friendly recovery suggestions
- ⚡ **Smart Retry Logic** - Automatic exponential backoff for transient failures
- ✅ **Input Validation** - Comprehensive validation utilities with helpful error messages
- 🐛 **Debug Logging** - Structured logging and performance monitoring

## Quick Start

> **Note**: This SDK is currently part of the [fhevm-react-template](https://github.com/zama-ai/fhevm-react-template) monorepo and is not yet published to npm. To use it, clone the template repository.

### Installation

```bash
# Clone the template repository
git clone https://github.com/zama-ai/fhevm-react-template
cd fhevm-react-template

# Install dependencies
pnpm install

# Build the SDK
pnpm sdk:build
```

### Basic Usage

```typescript
import {
  useFhevm,
  useFHEEncryption,
  useWalletCallbacks,
} from "@fhevm-sdk/react";

export function Counter() {
  const { instance } = useFhevm();
  const { getAddress } = useWalletCallbacks();

  const { encryptWith, isEncrypting } = useFHEEncryption({
    instance,
    getAddress,
    contractAddress: "0x...",
    onSuccess: (result) => console.log("Encrypted:", result),
    onError: (error) => console.error("Encryption failed:", error),
  });

  const handleEncrypt = async () => {
    await encryptWith((builder) => {
      builder.add32(42); // Encrypt uint32 value
    });
  };

  return (
    <button onClick={handleEncrypt} disabled={isEncrypting}>
      {isEncrypting ? "Encrypting..." : "Encrypt"}
    </button>
  );
}
```

## Core Concepts

### Three-Layer Architecture

```
1. Smart Contracts (Solidity + FHEVM)
   ↓
2. FHEVM SDK (Core Logic)
   ↓
3. React/Vue Components (UI Layer)
```

### Available Exports

The SDK provides multiple entry points for different use cases:

- `@fhevm-sdk` - Main entry (default React/Vue exports)
- `@fhevm-sdk/core` - Core utilities (no framework dependencies)
- `@fhevm-sdk/react` - React hooks and components
- `@fhevm-sdk/vue` - Vue 3 composables
- `@fhevm-sdk/vanilla` - Vanilla JavaScript client
- `@fhevm-sdk/storage` - Storage utilities (IndexedDB, localStorage)
- `@fhevm-sdk/utils` - Validation, retry, error handling utilities
- `@fhevm-sdk/types` - TypeScript type definitions

## Utilities Reference

The SDK includes comprehensive utilities for building robust applications:

### Error Handling

Handle FHEVM SDK errors with user-friendly recovery suggestions.

```typescript
import {
  getErrorRecoverySuggestion,
  formatErrorSuggestion,
  isRetryable,
  isUserActionError,
} from "@fhevm-sdk/react";

try {
  await encryptValue(instance, address, user, value, type);
} catch (error) {
  const suggestion = getErrorRecoverySuggestion(error);
  console.error(suggestion.title);        // "Encryption Failed"
  console.error(suggestion.message);      // User-friendly explanation
  console.error(suggestion.actions);      // Recovery steps
  console.error(suggestion.retryable);    // true/false
}
```

**Key Functions:**
- `getErrorRecoverySuggestion(error)` - Get structured recovery suggestion
- `formatErrorSuggestion(suggestion)` - Format for display
- `isRetryable(error)` - Check if operation can be retried
- `isUserActionError(error)` - Check if user action is required

📚 **Full Guide:** [`docs/ERROR_HANDLING.md`](docs/ERROR_HANDLING.md)

### Retry Logic

Automatically retry failed operations with exponential backoff and jitter.

```typescript
import { retryAsync, retryAsyncOrThrow } from "@fhevm-sdk/react";

// Get result object
const result = await retryAsync(
  () => createFhevmInstance(params),
  {
    maxRetries: 3,
    initialDelayMs: 100,
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt}, next delay: ${delay}ms`);
    }
  }
);

// Or throw on failure
try {
  const instance = await retryAsyncOrThrow(
    () => createFhevmInstance(params),
    { maxRetries: 3 }
  );
} catch (error) {
  console.error("Failed after retries:", error);
}
```

**Key Functions:**
- `retryAsync(operation, options)` - Retry with result object
- `retryAsyncOrThrow(operation, options)` - Retry with exception throwing
- `retryAsyncWithTimeout(operation, timeoutMs, options)` - Retry with timeout
- `retryWrap(operation, options)` - Wrap function with retry logic
- `retrySync(operation, options)` - Synchronous retry
- `calculateBackoffDelay(attempt, ...)` - Calculate exponential backoff

📚 **Full Guide:** [`docs/UTILS.md#retry-logic`](docs/UTILS.md#retry-logic)

### Input Validation

Validate inputs with helpful error messages.

```typescript
import {
  assertValidAddress,
  assertValidFhevmType,
  assertValidEncryptionValue,
  getValidFhevmTypes,
} from "@fhevm-sdk/react";

// Validate Ethereum address
assertValidAddress(address, "contractAddress");

// Validate FHEVM type
assertValidFhevmType(type);

// Validate value for type
assertValidEncryptionValue(value, type);

// Get list of valid types
const types = getValidFhevmTypes();
// ["ebool", "euint8", "euint16", "euint32", "euint64", "euint128", "euint256", "eaddress"]
```

**Value Ranges:**

| Type | Min | Max |
|------|-----|-----|
| `ebool` | 0 | 1 |
| `euint8` | 0 | 255 |
| `euint16` | 0 | 65,535 |
| `euint32` | 0 | 4,294,967,295 |
| `euint64` | 0 | 18,446,744,073,709,551,615 |
| `euint128` | 0 | 340,282,366,920,938,463,463,374,607,431,768,211,455 |
| `euint256` | 0 | 115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457,584,007,913,129,639,935 |

**Key Functions:**
- `assertValidAddress(address, paramName)` - Validate Ethereum address
- `isValidAddress(address)` - Check address validity
- `assertValidFhevmType(type)` - Validate FHEVM type
- `isValidFhevmType(type)` - Check type validity
- `getValidFhevmTypes()` - Get list of valid types
- `assertValidEncryptionValue(value, type)` - Validate encryption value
- `validateEncryptionValue(value, type)` - Check value validity
- `assertRequiredParams(params, keys)` - Validate required parameters
- `assertDefined(value, paramName)` - Check parameter defined
- `assertNotEmpty(value, description)` - Check string not empty
- `assertNotEmptyArray(array, description)` - Check array not empty

📚 **Full Guide:** [`docs/VALIDATION.md`](docs/VALIDATION.md)

### Debug Logging

Structured logging and performance monitoring.

```typescript
import {
  enableDebugLogging,
  debug,
  info,
  warn,
  error,
  measureAsync,
  getPerformanceSummary,
} from "@fhevm-sdk/react";

// Enable debugging
enableDebugLogging({
  verbose: true,
  metrics: true,
  level: "debug",
});

// Log at different levels
debug("Detailed info", { data });
info("Operation completed");
warn("Deprecated API");
error("Operation failed", errorObj);

// Measure performance
const result = await measureAsync(
  "encrypt",
  () => encryptValue(instance, address, user, value, type)
);

// Get performance summary
const summary = getPerformanceSummary();
console.table(summary);
// [
//   { name: 'encrypt', count: 5, avgDurationMs: 245.67, minDurationMs: 200.12, maxDurationMs: 310.45 },
//   { name: 'decrypt', count: 3, avgDurationMs: 180.23, minDurationMs: 150.01, maxDurationMs: 220.34 }
// ]
```

**Key Functions:**
- `enableDebugLogging(options)` - Enable debug mode
- `disableDebugLogging()` - Disable debug mode
- `debug(message, data)` - Log debug message
- `info(message, data)` - Log info message
- `warn(message, data)` - Log warning
- `error(message, errorObj)` - Log error
- `startTimer(name, metadata)` - Start performance timer
- `measureAsync(name, fn, metadata)` - Measure async function
- `measureSync(name, fn, metadata)` - Measure sync function
- `getMetrics()` - Get all recorded metrics
- `getPerformanceSummary()` - Get aggregated performance summary
- `clearMetrics()` - Clear metrics storage

📚 **Full Guide:** [`docs/DEBUG_LOGGING.md`](docs/DEBUG_LOGGING.md)

## Documentation

### Guides

- **[Migration Guide](docs/MIGRATION.md)** - Upgrade to FHEVM v0.9 and migrate from older SDK patterns
- **[Utils Overview](docs/UTILS.md)** - Complete utilities reference and examples
- **[Error Handling](docs/ERROR_HANDLING.md)** - Error recovery strategies and patterns
- **[Debug Logging](docs/DEBUG_LOGGING.md)** - Structured logging and performance monitoring
- **[Input Validation](docs/VALIDATION.md)** - Validation best practices

### Examples

- [Next.js Counter](../../packages/nextjs) - Full React example with utils integration
- [Vue 3 App](../../examples/vue-app) - Vue 3 example with Composition API
- [Vanilla JS](../../examples/vanilla-js) - Vanilla JavaScript example
- [Node.js Backend](../../examples/nodejs-backend) - Express.js backend API
- [Node.js Automation](../../examples/nodejs-automation) - Scheduled tasks and automation

## API Reference

### React Hooks

```typescript
// FHEVM Instance
import { useFhevm } from "@fhevm-sdk/react";
const { instance, isLoading, error } = useFhevm();

// Wallet Callbacks
import { useWalletCallbacks } from "@fhevm-sdk/react";
const { getAddress } = useWalletCallbacks();

// Encryption
import { useFHEEncryption } from "@fhevm-sdk/react";
const { encryptWith, encryptBatch, isEncrypting, error } = useFHEEncryption({
  instance,
  getAddress,
  contractAddress: "0x...",
});

// Decryption
import { useFHEDecrypt } from "@fhevm-sdk/react";
const { decrypt, isDecrypting, error } = useFHEDecrypt({
  instance,
  getAddress,
});

// Storage
import { useIndexedDBStorage } from "@fhevm-sdk/react";
const { storage, isReady } = useIndexedDBStorage();
```

### Storage Options

```typescript
// IndexedDB (Recommended)
import { useIndexedDBStorage } from "@fhevm-sdk/react";
const { storage } = useIndexedDBStorage({
  dbName: "fhevm-app",
  storeName: "signatures"
});

// localStorage
import { useLocalStorage } from "@fhevm-sdk/react";
const { storage } = useLocalStorage();

// In-memory
import { useInMemoryStorage } from "@fhevm-sdk/react";
const { storage } = useInMemoryStorage();
```

## Common Patterns

### Pattern 1: Validation + Retry + Error Handling

```typescript
import {
  assertValidAddress,
  assertValidEncryptionValue,
  retryAsyncOrThrow,
  getErrorRecoverySuggestion,
} from "@fhevm-sdk/react";

async function robustEncrypt(
  address: string,
  value: number,
  type: string
) {
  try {
    // 1. Validate early
    assertValidAddress(address);
    assertValidEncryptionValue(value, type);

    // 2. Retry with exponential backoff
    return await retryAsyncOrThrow(
      () => instance.encrypt(value, type),
      { maxRetries: 3, initialDelayMs: 100 }
    );
  } catch (error) {
    // 3. Get recovery suggestion
    const suggestion = getErrorRecoverySuggestion(error);
    console.error(`${suggestion.title}: ${suggestion.message}`);
    throw error;
  }
}
```

### Pattern 2: Performance Monitoring

```typescript
import { measureAsync, getPerformanceSummary } from "@fhevm-sdk/react";

// Measure operations
const encrypted = await measureAsync(
  "encrypt",
  () => instance.encrypt(value, type)
);

const decrypted = await measureAsync(
  "decrypt",
  () => instance.decrypt(handle)
);

// Check performance
const summary = getPerformanceSummary();
const slowOps = summary.filter(s => s.avgDurationMs > 1000);
if (slowOps.length > 0) {
  console.warn("Slow operations detected:", slowOps);
}
```

### Pattern 3: React Error Boundary

```typescript
import { getErrorRecoverySuggestion } from "@fhevm-sdk/react";

function ErrorBoundary({ error }: { error: Error }) {
  const suggestion = getErrorRecoverySuggestion(error);

  return (
    <div className="error">
      <h2>{suggestion.title}</h2>
      <p>{suggestion.message}</p>
      <ol>
        {suggestion.actions.map((action, i) => (
          <li key={i}>{action}</li>
        ))}
      </ol>
    </div>
  );
}
```

## Troubleshooting

### Common Issues

**Encryption fails with "Invalid value"**
- Check that value is within range for the FHEVM type
- Use `validateEncryptionValue(value, type)` to verify

**Decryption fails with "Signature expired"**
- Request a fresh signature: `await instance.getDecryptionSignature(address)`
- Store signatures for reuse: use `IndexedDB` storage

**MetaMask nonce errors with Hardhat**
- Clear MetaMask activity tab (Settings → Advanced → Clear Activity Tab)
- Restart browser after restarting Hardhat

**"SDK not initialized" errors**
- Ensure `useFhevm()` is called inside a provider
- Check that provider is properly configured

## Performance Tips

1. **Use IndexedDB storage** for persistent signature caching
2. **Enable metrics in development** to identify bottlenecks
3. **Batch operations** when encrypting multiple values
4. **Retry with exponential backoff** to handle transient failures
5. **Validate inputs early** to fail fast

## Best Practices

1. ✅ **Validate early** - Check inputs at function entry
2. ✅ **Use retry logic** - Automatically handle transient failures
3. ✅ **Show user errors** - Use recovery suggestions for UX
4. ✅ **Monitor performance** - Track metrics in development
5. ✅ **Handle errors gracefully** - Distinguish user vs system errors

## Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 15+
- Edge 90+

## Contribution

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.

## Support

- 📚 [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/)
- 💬 [Discord Community](https://discord.com/invite/zama)
- 🐛 [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues)

## Changelog

### Version 1.0.0

- Initial release
- Complete error handling utilities
- Retry logic with exponential backoff
- Input validation utilities
- Debug logging and performance monitoring
- React, Vue, and Node.js support
