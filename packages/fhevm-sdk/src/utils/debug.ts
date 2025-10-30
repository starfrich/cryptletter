/**
 * Debug and Logging Utilities
 *
 * This module provides utilities for debugging FHEVM SDK operations
 * with verbose logging, performance monitoring, and structured output.
 *
 * @module utils/debug
 */

// ============================================================================
// Debug Configuration
// ============================================================================

/**
 * Debug options
 */
export interface DebugOptions {
  /** Enable verbose logging */
  verbose?: boolean;

  /** Include performance metrics */
  metrics?: boolean;

  /** Include stack traces in logs */
  stackTrace?: boolean;

  /** Custom log prefix */
  prefix?: string;

  /** Log level: debug, info, warn, error */
  level?: "debug" | "info" | "warn" | "error";
}

/**
 * Performance metric
 */
export interface PerformanceMetric {
  /** Metric name */
  name: string;

  /** Duration in milliseconds */
  durationMs: number;

  /** Timestamp when metric was recorded */
  timestamp: number;

  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Global debug state
 */
let globalDebugState: DebugOptions = {
  verbose: false,
  metrics: false,
  stackTrace: false,
  prefix: "[FHEVM SDK]",
  level: "info",
};

/**
 * Performance metrics storage
 */
const metricsStore: PerformanceMetric[] = [];

/**
 * Max stored metrics (prevent memory leak)
 */
const MAX_METRICS = 1000;

// ============================================================================
// Debug Configuration
// ============================================================================

/**
 * Enable debug logging for FHEVM SDK
 *
 * @param options - Debug options
 *
 * @example
 * ```typescript
 * enableDebugLogging({
 *   verbose: true,
 *   metrics: true,
 *   stackTrace: true
 * });
 * ```
 */
export function enableDebugLogging(options: DebugOptions = {}): void {
  globalDebugState = {
    verbose: options.verbose ?? true,
    metrics: options.metrics ?? false,
    stackTrace: options.stackTrace ?? false,
    prefix: options.prefix ?? "[FHEVM SDK]",
    level: options.level ?? "debug",
  };

  debug("Debug logging enabled", globalDebugState);
}

/**
 * Disable debug logging
 */
export function disableDebugLogging(): void {
  globalDebugState = {
    verbose: false,
    metrics: false,
    stackTrace: false,
    prefix: "[FHEVM SDK]",
    level: "info",
  };
}

/**
 * Get current debug state
 */
export function getDebugState(): DebugOptions {
  return { ...globalDebugState };
}

/**
 * Set debug level
 *
 * @param level - Log level: debug, info, warn, error
 */
export function setDebugLevel(
  level: "debug" | "info" | "warn" | "error"
): void {
  globalDebugState.level = level;
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * Log debug message
 *
 * @param message - Message to log
 * @param data - Optional data to log
 */
export function debug(message: string, data?: any): void {
  if (!globalDebugState.verbose || globalDebugState.level !== "debug") {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `${timestamp} ${globalDebugState.prefix} [DEBUG]`;

  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }

  if (globalDebugState.stackTrace) {
    console.trace();
  }
}

/**
 * Log info message
 *
 * @param message - Message to log
 * @param data - Optional data to log
 */
export function info(message: string, data?: any): void {
  const shouldLog =
    globalDebugState.verbose &&
    (globalDebugState.level === "debug" ||
      globalDebugState.level === "info" ||
      globalDebugState.level === "warn" ||
      globalDebugState.level === "error");

  if (!shouldLog) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `${timestamp} ${globalDebugState.prefix} [INFO]`;

  if (data !== undefined) {
    console.info(prefix, message, data);
  } else {
    console.info(prefix, message);
  }
}

/**
 * Log warning message
 *
 * @param message - Message to log
 * @param data - Optional data to log
 */
export function warn(message: string, data?: any): void {
  const shouldLog =
    globalDebugState.verbose &&
    (globalDebugState.level === "warn" ||
      globalDebugState.level === "info" ||
      globalDebugState.level === "debug" ||
      globalDebugState.level === "error");

  if (!shouldLog) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `${timestamp} ${globalDebugState.prefix} [WARN]`;

  if (data !== undefined) {
    console.warn(prefix, message, data);
  } else {
    console.warn(prefix, message);
  }

  if (globalDebugState.stackTrace) {
    console.trace();
  }
}

/**
 * Log error message
 *
 * @param message - Message to log
 * @param error - Error object
 */
export function error(message: string, error?: any): void {
  const timestamp = new Date().toISOString();
  const prefix = `${timestamp} ${globalDebugState.prefix} [ERROR]`;

  if (error) {
    console.error(prefix, message, error);
  } else {
    console.error(prefix, message);
  }

  if (globalDebugState.stackTrace) {
    console.trace();
  }
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Start a performance measurement
 *
 * Returns a function to stop the measurement and record the metric.
 *
 * @param name - Metric name
 * @param metadata - Optional metadata
 * @returns Function to stop the measurement
 *
 * @example
 * ```typescript
 * const stopTimer = startTimer("encryption");
 * await encryptValue(...);
 * stopTimer();
 * ```
 */
export function startTimer(
  name: string,
  metadata?: Record<string, any>
): () => PerformanceMetric {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const durationMs = endTime - startTime;

    const metric: PerformanceMetric = {
      name,
      durationMs,
      timestamp: Date.now(),
      metadata,
    };

    recordMetric(metric);

    if (globalDebugState.metrics) {
      debug(`⏱ Performance: ${name} took ${durationMs.toFixed(2)}ms`, metadata);
    }

    return metric;
  };
}

/**
 * Measure an async function's execution time
 *
 * @param name - Metric name
 * @param fn - Async function to measure
 * @param metadata - Optional metadata
 * @returns Promise with function result
 *
 * @example
 * ```typescript
 * const result = await measureAsync(
 *   "create_instance",
 *   () => createFhevmInstance(params)
 * );
 * ```
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const stopTimer = startTimer(name, metadata);

  try {
    return await fn();
  } finally {
    stopTimer();
  }
}

/**
 * Measure a sync function's execution time
 *
 * @param name - Metric name
 * @param fn - Sync function to measure
 * @param metadata - Optional metadata
 * @returns Function result
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  const stopTimer = startTimer(name, metadata);

  try {
    return fn();
  } finally {
    stopTimer();
  }
}

/**
 * Record a performance metric
 *
 * @param metric - Metric to record
 */
function recordMetric(metric: PerformanceMetric): void {
  metricsStore.push(metric);

  // Prevent memory leak
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }
}

/**
 * Get all recorded performance metrics
 *
 * @returns Array of metrics
 */
export function getMetrics(): PerformanceMetric[] {
  return [...metricsStore];
}

/**
 * Get metrics for a specific operation
 *
 * @param name - Operation name
 * @returns Metrics for that operation
 */
export function getMetricsForOperation(name: string): PerformanceMetric[] {
  return metricsStore.filter((m) => m.name === name);
}

/**
 * Calculate average duration for an operation
 *
 * @param name - Operation name
 * @returns Average duration in milliseconds or 0 if no metrics
 */
export function getAverageDuration(name: string): number {
  const metrics = getMetricsForOperation(name);
  if (metrics.length === 0) return 0;

  const total = metrics.reduce((sum, m) => sum + m.durationMs, 0);
  return total / metrics.length;
}

/**
 * Get performance summary
 *
 * @returns Summary of all recorded metrics
 *
 * @example
 * ```typescript
 * const summary = getPerformanceSummary();
 * console.table(summary);
 * ```
 */
export function getPerformanceSummary(): Array<{
  name: string;
  count: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
}> {
  const operationMap = new Map<
    string,
    { count: number; total: number; min: number; max: number }
  >();

  for (const metric of metricsStore) {
    const existing = operationMap.get(metric.name) || {
      count: 0,
      total: 0,
      min: Infinity,
      max: -Infinity,
    };

    operationMap.set(metric.name, {
      count: existing.count + 1,
      total: existing.total + metric.durationMs,
      min: Math.min(existing.min, metric.durationMs),
      max: Math.max(existing.max, metric.durationMs),
    });
  }

  return Array.from(operationMap.entries()).map(([name, stats]) => ({
    name,
    count: stats.count,
    avgDurationMs: stats.total / stats.count,
    minDurationMs: stats.min,
    maxDurationMs: stats.max,
  }));
}

/**
 * Clear all recorded metrics
 */
export function clearMetrics(): void {
  metricsStore.length = 0;
}

/**
 * Print performance summary to console
 */
export function printPerformanceSummary(): void {
  const summary = getPerformanceSummary();

  if (summary.length === 0) {
    console.log(`${globalDebugState.prefix} No performance metrics recorded`);
    return;
  }

  console.log(`${globalDebugState.prefix} Performance Summary:`);
  console.table(summary);
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Create a debug group for organizing related logs
 *
 * @param label - Group label
 * @returns Functions to log within group and close group
 *
 * @example
 * ```typescript
 * const { log, end } = createDebugGroup("Encryption");
 * log("Starting encryption...");
 * log("Value:", value);
 * end();
 * ```
 */
export function createDebugGroup(
  label: string
): {
  log: (message: string, data?: any) => void;
  end: () => void;
} {
  if (globalDebugState.verbose) {
    console.group(`${globalDebugState.prefix} ${label}`);
  }

  return {
    log: (message: string, data?: any) => {
      if (globalDebugState.verbose) {
        if (data !== undefined) {
          console.log(message, data);
        } else {
          console.log(message);
        }
      }
    },
    end: () => {
      if (globalDebugState.verbose) {
        console.groupEnd();
      }
    },
  };
}

/**
 * Format object for display in logs
 *
 * @param obj - Object to format
 * @param depth - Max depth for nested objects
 * @returns Formatted string
 */
export function formatObject(
  obj: any,
  depth: number = 2
): string {
  try {
    if (depth === 0) {
      return "...";
    }

    if (obj === null) {
      return "null";
    }

    if (typeof obj !== "object") {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      const items = obj
        .slice(0, 5)
        .map((item) => formatObject(item, depth - 1));
      if (obj.length > 5) {
        items.push(`... (${obj.length - 5} more)`);
      }
      return `[${items.join(", ")}]`;
    }

    const keys = Object.keys(obj).slice(0, 5);
    const pairs = keys.map(
      (key) => `${key}: ${formatObject(obj[key], depth - 1)}`
    );
    const objKeys = Object.keys(obj);
    if (objKeys.length > 5) {
      pairs.push(`... (${objKeys.length - 5} more keys)`);
    }
    return `{${pairs.join(", ")}}`;
  } catch {
    return String(obj);
  }
}

/**
 * Assert condition and log if false
 *
 * @param condition - Condition to check
 * @param message - Message to log if condition is false
 * @param data - Optional data to log
 */
export function assert(
  condition: boolean,
  message: string,
  data?: any
): asserts condition {
  if (!condition) {
    error(`Assertion failed: ${message}`, data);
    if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
}
