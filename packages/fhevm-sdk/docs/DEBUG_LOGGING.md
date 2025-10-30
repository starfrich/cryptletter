# Debug Logging & Performance Monitoring Guide

Comprehensive guide to debugging FHEVM SDK applications with structured logging and performance analysis.

## Table of Contents

1. [Overview](#overview)
2. [Enabling Debug Mode](#enabling-debug-mode)
3. [Logging Functions](#logging-functions)
4. [Performance Monitoring](#performance-monitoring)
5. [Advanced Patterns](#advanced-patterns)
6. [Troubleshooting](#troubleshooting)

## Overview

The debug logging system provides:

- **Structured logging** at multiple levels (debug, info, warn, error)
- **Performance metrics** tracking with millisecond precision
- **Debug groups** for organizing related operations
- **Performance summaries** with aggregated statistics
- **Object formatting** for readable output

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
  stackTrace: true,
});

// Log messages
debug("Starting operation", { userId: 123 });
info("Operation completed successfully");
warn("Deprecated API usage detected");
error("Operation failed", errorObject);

// Measure performance
const result = await measureAsync("encrypt", () => encryptValue(...));

// Get performance summary
const summary = getPerformanceSummary();
console.table(summary);
```

## Enabling Debug Mode

### Quick Start

```typescript
import { enableDebugLogging, disableDebugLogging } from "@fhevm-sdk";

// Enable with defaults
enableDebugLogging();

// Disable when done
disableDebugLogging();
```

### Configuration

```typescript
import { enableDebugLogging } from "@fhevm-sdk";

enableDebugLogging({
  // Enable verbose logging (required for debug logs to appear)
  verbose: true,

  // Record performance metrics
  metrics: true,

  // Include stack traces in logs
  stackTrace: true,

  // Custom log prefix
  prefix: "[My App]",

  // Log level filter: debug, info, warn, error
  level: "debug",
});
```

### Log Levels

```typescript
import { setDebugLevel } from "@fhevm-sdk";

// Show all messages
setDebugLevel("debug");

// Show info, warn, error (hide debug)
setDebugLevel("info");

// Show warn, error only
setDebugLevel("warn");

// Show errors only
setDebugLevel("error");
```

### Conditional Debugging

```typescript
// Enable debug only in development
if (process.env.NODE_ENV === "development") {
  enableDebugLogging({
    verbose: true,
    metrics: true,
    level: "debug",
  });
} else {
  enableDebugLogging({
    verbose: true,
    level: "warn", // Only warnings and errors in production
  });
}
```

### Debug State Management

```typescript
import {
  getDebugState,
  enableDebugLogging,
  disableDebugLogging,
} from "@fhevm-sdk";

// Get current debug state
const state = getDebugState();
console.log("Debug enabled:", state.verbose);
console.log("Metrics enabled:", state.metrics);
console.log("Log level:", state.level);

// Toggle debugging
function toggleDebug() {
  const current = getDebugState();
  if (current.verbose) {
    disableDebugLogging();
  } else {
    enableDebugLogging({ verbose: true });
  }
}
```

## Logging Functions

### Log Levels

```typescript
import { debug, info, warn, error } from "@fhevm-sdk";

// Debug level - detailed information, hidden by default
debug("Entering encryptValue function", {
  address: contractAddress,
  value: 42,
  type: "euint32",
});

// Info level - general information
info("Encryption completed successfully", {
  resultHandle: "0xabcd1234",
  durationMs: 145,
});

// Warn level - warning messages
warn("Deprecated storage backend selected", {
  backend: "localStorage",
  recommendation: "Use IndexedDB for better performance",
});

// Error level - error messages
error("Encryption failed", errorObject);
```

### Example: Logging an Operation

```typescript
import {
  debug,
  info,
  warn,
  error,
  startTimer,
} from "@fhevm-sdk";

async function encryptAndStore(
  instance: any,
  address: string,
  value: number,
  type: string,
  storage: Storage
) {
  const timer = startTimer("encrypt_and_store");

  try {
    debug("Starting encryption operation", { address, value, type });

    // Encrypt
    const encrypted = await instance.encrypt(value, type);
    info("Encryption successful", { handle: encrypted });

    // Store
    await storage.set(`encrypted_${Date.now()}`, encrypted);
    info("Value stored successfully");

    const metric = timer();
    info(`Operation completed in ${metric.durationMs}ms`);

  } catch (err) {
    warn("Encryption warning", { code: err?.code });
    error("Encryption failed", err);
    throw err;
  }
}
```

### Conditional Logging

```typescript
import { debug, getDebugState } from "@fhevm-sdk";

function logIfDebug(message: string, data?: any) {
  const { verbose } = getDebugState();
  if (verbose) {
    debug(message, data);
  }
}

// Usage
logIfDebug("Operation started", { userId: 123 });
```

## Performance Monitoring

### Manual Timing

```typescript
import { startTimer } from "@fhevm-sdk";

// Start timer
const stopTimer = startTimer("my_operation");

// ... do something ...
await someAsyncWork();

// Stop timer and get metric
const metric = stopTimer();
console.log(`Operation took ${metric.durationMs}ms`);

// Metric structure:
// {
//   name: "my_operation",
//   durationMs: 234.56,
//   timestamp: 1634567890123,
//   metadata?: { ... }
// }
```

### With Metadata

```typescript
import { startTimer } from "@fhevm-sdk";

const stopTimer = startTimer("encryption", {
  userId: user.id,
  valueSize: value.length,
  type: "euint32",
});

await encryptValue(instance, address, user, value, type);

const metric = stopTimer();
console.log(
  `Encrypted ${metric.metadata?.valueSize} bytes in ${metric.durationMs}ms`
);
```

### Measuring Async Functions

```typescript
import { measureAsync } from "@fhevm-sdk";

// Automatically start/stop timing
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

// With metadata
const validated = measureSync(
  "validate_batch",
  () => validateAddresses(addresses),
  { count: addresses.length }
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

// Get all metrics
const allMetrics = getMetrics();
console.log(`Total operations tracked: ${allMetrics.length}`);

// Get metrics for specific operation
const encryptMetrics = getMetricsForOperation("encrypt");
console.log(`Encryption operations: ${encryptMetrics.length}`);

// Get average duration
const avgEncryptTime = getAverageDuration("encrypt");
console.log(`Average encryption time: ${avgEncryptTime.toFixed(2)}ms`);

// Get performance summary
const summary = getPerformanceSummary();
console.table(summary);

// Clear metrics (useful before running tests or benchmarks)
clearMetrics();
```

### Performance Summary

```typescript
import { getPerformanceSummary, printPerformanceSummary } from "@fhevm-sdk";

// Get summary
const summary = getPerformanceSummary();

// Summary structure:
// [
//   {
//     name: "encrypt",
//     count: 10,
//     avgDurationMs: 245.67,
//     minDurationMs: 200.12,
//     maxDurationMs: 310.45
//   },
//   {
//     name: "decrypt",
//     count: 8,
//     avgDurationMs: 180.23,
//     minDurationMs: 150.01,
//     maxDurationMs: 220.34
//   }
// ]

// Print formatted table
printPerformanceSummary();

// Output:
// [FHEVM SDK] Performance Summary:
// ┌─────────┬───────┬──────────────┬────────────┬──────────────┐
// │ name    │ count │ avgDurationMs│ minDurationMs│ maxDurationMs│
// ├─────────┼───────┼──────────────┼────────────┼──────────────┤
// │ encrypt │    10 │     245.67   │    200.12  │    310.45    │
// │ decrypt │     8 │     180.23   │    150.01  │    220.34    │
// └─────────┴───────┴──────────────┴────────────┴──────────────┘
```

## Advanced Patterns

### Debug Groups

```typescript
import { createDebugGroup } from "@fhevm-sdk";

// Create a grouped debug context
const { log, end } = createDebugGroup("Encryption Process");

log("Validating inputs...");
log("Value:", 42);
log("Type:", "euint32");

log("Creating encryption...");
log("Encrypting...");

log("Storing result...");
log("Handle:", "0xabcd1234");

end();

// Output:
// [FHEVM SDK] Encryption Process
//   Validating inputs...
//   Value: 42
//   Type: euint32
//   Creating encryption...
//   Encrypting...
//   Storing result...
//   Handle: 0xabcd1234
```

### Nested Debug Groups

```typescript
import { createDebugGroup } from "@fhevm-sdk";

async function processOperations(operations: any[]) {
  const { log, end } = createDebugGroup("Processing Batch");

  for (const op of operations) {
    const { log: opLog, end: opEnd } = createDebugGroup(`Operation ${op.id}`);

    opLog("Starting...");
    await processOperation(op);
    opLog("Completed");

    opEnd();
  }

  end();
}
```

### Object Formatting

```typescript
import { formatObject } from "@fhevm-sdk";

const obj = {
  user: {
    id: 123,
    name: "John Doe",
    email: "john@example.com",
  },
  data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  nested: {
    deep: {
      value: "test",
    },
  },
};

// Default depth of 2
console.log(formatObject(obj));
// {user: {id: 123, name: John Doe, ...}, data: [1, 2, 3, 4, 5, ... (5 more)], nested: {...}}

// Increase depth
console.log(formatObject(obj, 3));
// {user: {id: 123, name: John Doe, email: john@example.com}, data: [1, 2, 3, 4, 5, ... (5 more)], nested: {deep: {value: test}}}
```

### Custom Debug Helper

```typescript
import {
  debug,
  info,
  startTimer,
  createDebugGroup,
  formatObject,
} from "@fhevm-sdk";

class DebugHelper {
  constructor(private operationName: string) {}

  logStep(step: string, data?: any) {
    const elapsed = performance.now() - this.startTime;
    debug(`[${this.operationName}] Step ${step}`, {
      elapsed: `${elapsed.toFixed(0)}ms`,
      data,
    });
  }

  logError(step: string, error: any) {
    const elapsed = performance.now() - this.startTime;
    console.error(`[${this.operationName}] Error at step ${step}`, {
      elapsed: `${elapsed.toFixed(0)}ms`,
      error: error?.message || error,
    });
  }

  private startTime = performance.now();
}

// Usage
const helper = new DebugHelper("EncryptValue");

helper.logStep("validate_inputs", { value: 42 });
try {
  await validateInputs(value);
  helper.logStep("inputs_valid");
} catch (error) {
  helper.logError("validate_inputs", error);
}

helper.logStep("encrypt", { type: "euint32" });
const encrypted = await encryptValue(instance, address, user, value, type);
helper.logStep("encrypt_success", { handle: encrypted });
```

### Performance Benchmarking

```typescript
import {
  startTimer,
  measureAsync,
  getPerformanceSummary,
  clearMetrics,
} from "@fhevm-sdk";

async function benchmarkEncryption(iterations: number = 100) {
  clearMetrics();

  // Warm up
  await measureAsync("encrypt", () => encryptValue(...));

  // Benchmark
  for (let i = 0; i < iterations; i++) {
    await measureAsync("encrypt", () => encryptValue(...));
  }

  // Results
  const summary = getPerformanceSummary();
  const encryptSummary = summary.find(s => s.name === "encrypt");

  if (encryptSummary) {
    console.log(`Encryption Benchmark (${iterations} iterations):`);
    console.log(`  Average: ${encryptSummary.avgDurationMs.toFixed(2)}ms`);
    console.log(`  Min: ${encryptSummary.minDurationMs.toFixed(2)}ms`);
    console.log(`  Max: ${encryptSummary.maxDurationMs.toFixed(2)}ms`);
    console.log(`  Total: ${(encryptSummary.avgDurationMs * iterations).toFixed(0)}ms`);
  }
}

// Run benchmark
benchmarkEncryption(100);
```

### Profiling with Metadata

```typescript
import {
  measureAsync,
  getMetrics,
  startTimer,
} from "@fhevm-sdk";

async function profileEncryption(values: number[]) {
  const results = [];

  for (const value of values) {
    const result = await measureAsync(
      "encrypt",
      () => encryptValue(instance, address, user, value, "euint32"),
      { value, size: String(value).length }
    );
    results.push(result);
  }

  // Analyze metrics with metadata
  const metrics = getMetrics();
  const byValueSize = new Map();

  metrics.forEach(m => {
    const size = m.metadata?.size || "unknown";
    if (!byValueSize.has(size)) {
      byValueSize.set(size, []);
    }
    byValueSize.get(size).push(m.durationMs);
  });

  // Print analysis
  console.log("Performance by value size:");
  byValueSize.forEach((durations, size) => {
    const avg = durations.reduce((a, b) => a + b) / durations.length;
    console.log(`  ${size} digits: ${avg.toFixed(2)}ms avg`);
  });
}
```

### Real-time Performance Dashboard

```typescript
import {
  getPerformanceSummary,
  getDebugState,
  startTimer,
} from "@fhevm-sdk";

class PerformanceDashboard {
  private updateInterval: NodeJS.Timeout | null = null;

  start() {
    this.updateInterval = setInterval(() => {
      const summary = getPerformanceSummary();

      console.clear();
      console.log("╔════════════════════════════════════════╗");
      console.log("║   FHEVM Performance Dashboard          ║");
      console.log("╚════════════════════════════════════════╝");

      for (const op of summary) {
        const bar =
          "█".repeat(Math.round(op.avgDurationMs / 10)) +
          "░".repeat(Math.max(0, 50 - Math.round(op.avgDurationMs / 10)));

        console.log(`${op.name.padEnd(15)} │${bar}│ ${op.avgDurationMs.toFixed(1)}ms`);
        console.log(
          `${"".padEnd(15)} └─ min: ${op.minDurationMs.toFixed(1)}ms, max: ${op.maxDurationMs.toFixed(1)}ms, count: ${op.count}`
        );
      }
    }, 1000);
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Usage
const dashboard = new PerformanceDashboard();
dashboard.start();

// ... run operations ...

dashboard.stop();
```

## Troubleshooting

### Debug logs not showing

```typescript
import { enableDebugLogging, getDebugState } from "@fhevm-sdk";

// Check current state
const state = getDebugState();
console.log("Debug state:", state);

// Make sure verbose is enabled
enableDebugLogging({
  verbose: true,
  level: "debug", // Important: must be "debug" to see debug logs
});

// Try logging
debug("This should now appear");
```

### Metrics not recorded

```typescript
import {
  enableDebugLogging,
  getMetrics,
  startTimer,
} from "@fhevm-sdk";

// Metrics must be enabled
enableDebugLogging({
  metrics: true,
  verbose: true,
});

// Use startTimer or measureAsync
const stop = startTimer("test");
// ... do something ...
stop();

// Check if metrics were recorded
const metrics = getMetrics();
console.log("Recorded metrics:", metrics.length);
```

### Performance summary empty

```typescript
import {
  getPerformanceSummary,
  getMetrics,
  measureAsync,
} from "@fhevm-sdk";

// Make sure operations have been measured
if (getMetrics().length === 0) {
  console.log("No metrics recorded yet. Run some operations first.");

  // Try measuring something
  await measureAsync("test", () => Promise.resolve("test"));
}

// Now get summary
const summary = getPerformanceSummary();
console.table(summary);
```

### Memory usage concerns

```typescript
import {
  clearMetrics,
  enableDebugLogging,
} from "@fhevm-sdk";

// Metrics are limited to 1000 entries to prevent memory leaks
// Clear them periodically if running long operations
setInterval(() => {
  clearMetrics();
}, 60000); // Every minute

// Or disable metrics if not needed
enableDebugLogging({
  verbose: true,
  metrics: false, // Disable metrics collection
});
```

### Debug output is too verbose

```typescript
import { setDebugLevel } from "@fhevm-sdk";

// Reduce verbosity
setDebugLevel("warn");  // Only warnings and errors
setDebugLevel("error"); // Only errors
setDebugLevel("info");  // Info and above

// Or use custom filtering
const { log, end } = createDebugGroup("Important Operation");
log("This will always show");
end();
```

### Stack traces not showing

```typescript
import { enableDebugLogging } from "@fhevm-sdk";

// Enable stack traces
enableDebugLogging({
  stackTrace: true,
  verbose: true,
});

// Stack traces will appear with warn() and error() calls
warn("Warning with stack trace");
error("Error with stack trace");
```
