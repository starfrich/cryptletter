# Debug Logging & Performance Monitoring

Guide to debugging FHEVM SDK applications with structured logging and performance analysis.

## Overview

The debug logging system provides:

- **Structured logging** at multiple levels (debug, info, warn, error)
- **Performance metrics** tracking with millisecond precision
- **Debug groups** for organizing operations
- **Performance summaries** with aggregated statistics

```typescript
import {
  enableDebugLogging,
  debug,
  info,
  warn,
  error,
  startTimer,
  measureAsync,
  getPerformanceSummary,
} from "@fhevm-sdk";

// Enable debugging
enableDebugLogging({
  verbose: true,
  metrics: true,
  level: "debug",
});

// Log messages
debug("Operation started", { userId: 123 });
info("Operation completed");

// Measure performance
const result = await measureAsync("encrypt", () => encryptValue(...));

// Get summary
console.table(getPerformanceSummary());
```

## Enabling Debug Mode

### Quick Start

```typescript
import { enableDebugLogging, disableDebugLogging } from "@fhevm-sdk";

// Enable with defaults
enableDebugLogging();

// Disable
disableDebugLogging();
```

### Configuration

```typescript
enableDebugLogging({
  verbose: true,              // Enable verbose logging
  metrics: true,              // Record performance metrics
  stackTrace: true,           // Include stack traces
  prefix: "[My App]",         // Custom log prefix
  level: "debug",             // Log level: debug, info, warn, error
});
```

### Log Levels

```typescript
import { setDebugLevel } from "@fhevm-sdk";

setDebugLevel("debug");  // Show all messages
setDebugLevel("info");   // Show info, warn, error
setDebugLevel("warn");   // Show warn, error only
setDebugLevel("error");  // Show errors only
```

### Conditional Debugging

```typescript
// Development only
if (process.env.NODE_ENV === "development") {
  enableDebugLogging({ verbose: true, metrics: true });
} else {
  enableDebugLogging({ level: "warn" }); // Production: warnings only
}
```

## Logging Functions

### Log Levels

```typescript
import { debug, info, warn, error } from "@fhevm-sdk";

debug("Detailed debugging", { address, value, type });
info("Operation completed", { result, durationMs: 145 });
warn("Deprecated API usage", { apiName: "oldFunction" });
error("Operation failed", errorObject);
```

### Example: Logging an Operation

```typescript
async function encryptAndStore(instance, address, value, type, storage) {
  const timer = startTimer("encrypt_and_store");

  try {
    debug("Starting encryption", { address, value, type });

    const encrypted = await instance.encrypt(value, type);
    info("Encryption successful", { handle: encrypted });

    await storage.set(`encrypted_${Date.now()}`, encrypted);
    info("Value stored successfully");

    const metric = timer();
    info(`Completed in ${metric.durationMs}ms`);
  } catch (err) {
    error("Encryption failed", err);
    throw err;
  }
}
```

## Performance Monitoring

### Manual Timing

```typescript
import { startTimer } from "@fhevm-sdk";

const stopTimer = startTimer("my_operation", { userId: 123 });

await someAsyncWork();

const metric = stopTimer();
console.log(`Took ${metric.durationMs}ms`);
// metric: { name, durationMs, timestamp, metadata }
```

### Measuring Async Functions

```typescript
import { measureAsync } from "@fhevm-sdk";

// Auto start/stop timing
const result = await measureAsync(
  "create_instance",
  () => createFhevmInstance(params)
);

// With metadata
const encrypted = await measureAsync(
  "encrypt_batch",
  () => encryptBatch(values, type),
  { batchSize: values.length }
);
```

### Measuring Sync Functions

```typescript
import { measureSync } from "@fhevm-sdk";

const isValid = measureSync(
  "validate_address",
  () => validateAddress(address)
);
```

### Getting Metrics

```typescript
import {
  getMetrics,
  getMetricsForOperation,
  getAverageDuration,
  getPerformanceSummary,
  clearMetrics,
} from "@fhevm-sdk";

// All metrics
const allMetrics = getMetrics();

// Metrics for specific operation
const encryptMetrics = getMetricsForOperation("encrypt");

// Average duration
const avgTime = getAverageDuration("encrypt");

// Summary table
const summary = getPerformanceSummary();
console.table(summary);
// [
//   { name: 'encrypt', count: 10, avgDurationMs: 245.67, minDurationMs: 200.12, maxDurationMs: 310.45 }
// ]

// Clear metrics
clearMetrics();
```

### Performance Summary

```typescript
import { printPerformanceSummary } from "@fhevm-sdk";

printPerformanceSummary();

// Output:
// [FHEVM SDK] Performance Summary:
// ┌─────────┬───────┬──────────────┬────────────┬──────────────┐
// │ name    │ count │ avgDurationMs│ minDurationMs│ maxDurationMs│
// ├─────────┼───────┼──────────────┼────────────┼──────────────┤
// │ encrypt │    10 │     245.67   │    200.12  │    310.45    │
// └─────────┴───────┴──────────────┴────────────┴──────────────┘
```

## Advanced Patterns

### Debug Groups

```typescript
import { createDebugGroup } from "@fhevm-sdk";

const { log, end } = createDebugGroup("Encryption Process");

log("Validating inputs...");
log("Value:", 42);
log("Type:", "euint32");
log("Encrypting...");
log("Handle:", "0xabcd1234");

end();

// Output:
// [FHEVM SDK] Encryption Process
//   Validating inputs...
//   Value: 42
//   Type: euint32
//   Encrypting...
//   Handle: 0xabcd1234
```

### Object Formatting

```typescript
import { formatObject } from "@fhevm-sdk";

const obj = {
  user: { id: 123, name: "John Doe" },
  data: [1, 2, 3, 4, 5, 6, 7, 8],
  nested: { deep: { value: "test" } },
};

console.log(formatObject(obj, 2));
// {user: {id: 123, name: John Doe}, data: [1, 2, 3, 4, 5, ... (3 more)], nested: {...}}
```

### Performance Benchmarking

```typescript
import { measureAsync, getPerformanceSummary, clearMetrics } from "@fhevm-sdk";

async function benchmarkEncryption(iterations = 100) {
  clearMetrics();

  // Warm up
  await measureAsync("encrypt", () => encryptValue(...));

  // Benchmark
  for (let i = 0; i < iterations; i++) {
    await measureAsync("encrypt", () => encryptValue(...));
  }

  // Results
  const summary = getPerformanceSummary();
  const stats = summary.find(s => s.name === "encrypt");

  console.log(`Encryption Benchmark (${iterations} iterations):`);
  console.log(`  Average: ${stats.avgDurationMs.toFixed(2)}ms`);
  console.log(`  Min: ${stats.minDurationMs.toFixed(2)}ms`);
  console.log(`  Max: ${stats.maxDurationMs.toFixed(2)}ms`);
}
```

## Troubleshooting

### Debug logs not showing

```typescript
// Check current state
const state = getDebugState();
console.log("Debug state:", state);

// Enable correctly
enableDebugLogging({
  verbose: true,
  level: "debug", // Must be "debug" to see debug logs
});
```

### Metrics not recorded

```typescript
// Enable metrics
enableDebugLogging({
  metrics: true,
  verbose: true,
});

// Use startTimer or measureAsync
const stop = startTimer("test");
stop();

// Check
console.log("Metrics:", getMetrics().length);
```

### Memory concerns

```typescript
// Metrics are limited to 1000 entries
// Clear periodically if needed
setInterval(() => {
  clearMetrics();
}, 60000); // Every minute

// Or disable metrics
enableDebugLogging({
  verbose: true,
  metrics: false,
});
```

### Debug output too verbose

```typescript
// Reduce verbosity
setDebugLevel("warn");  // Only warnings and errors
setDebugLevel("error"); // Only errors
```
