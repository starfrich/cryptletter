/**
 * Debug Helper Wrapper for Next.js
 *
 * Debug and logging utilities with localStorage persistence.
 * Wraps SDK debug utilities with Next.js-specific logic.
 */

import {
  enableDebugLogging,
  disableDebugLogging,
  getDebugState,
  debug,
  info,
  warn,
  error,
  startTimer,
  measureAsync,
  type PerformanceMetric,
} from "@fhevm-sdk/utils";

const DEBUG_MODE_KEY = "FHEVM_DEBUG";

/**
 * Initialize debug mode from localStorage
 *
 * Should be called on app initialization to restore debug state
 * from previous session
 */
export function initializeDebugMode(): void {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem(DEBUG_MODE_KEY);
  if (stored === "true") {
    enableDebugLogging({ verbose: true });
  }
}

/**
 * Toggle debug mode on/off
 *
 * @returns true if debug mode is now enabled, false if disabled
 *
 * @example
 * ```tsx
 * const isDebugEnabled = toggleDebugMode();
 * ```
 */
export function toggleDebugMode(): boolean {
  if (typeof window === "undefined") return false;

  const currentState = getDebugState();
  const newState = !(currentState.verbose ?? false);

  if (newState) {
    enableDebugLogging({ verbose: true });
    localStorage.setItem(DEBUG_MODE_KEY, "true");
  } else {
    disableDebugLogging();
    localStorage.setItem(DEBUG_MODE_KEY, "false");
  }

  return newState;
}

/**
 * Get current debug state
 *
 * @returns Current debug state options
 */
export function getDebugModeState() {
  return getDebugState();
}

/**
 * Check if debug mode is currently enabled
 *
 * @returns true if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return getDebugState().verbose ?? false;
}

/**
 * Log debug message
 *
 * @param message - Message to log
 * @param data - Optional data to include
 */
export function logDebug(message: string, data?: unknown): void {
  debug(message, data);
}

/**
 * Log info message
 *
 * @param message - Message to log
 * @param data - Optional data to include
 */
export function logInfo(message: string, data?: unknown): void {
  info(message, data);
}

/**
 * Log warning message
 *
 * @param message - Message to log
 * @param data - Optional data to include
 */
export function logWarn(message: string, data?: unknown): void {
  warn(message, data);
}

/**
 * Log error message
 *
 * @param message - Message to log
 * @param err - Optional error to include
 */
export function logError(message: string, err?: unknown): void {
  error(message, err);
}

/**
 * Start a performance timer
 *
 * Returns a function to stop the timer and get the performance metric
 *
 * @param label - Label for the timer
 * @returns Function to call when done timing, returns performance metric
 *
 * @example
 * ```tsx
 * const timer = startPerformanceTimer("encryption");
 * await encryptData(data);
 * const metric = timer(); // Returns PerformanceMetric with durationMs
 * ```
 */
export function startPerformanceTimer(label: string): () => PerformanceMetric {
  return startTimer(label);
}

/**
 * Measure async operation performance
 *
 * @param label - Label for the operation
 * @param fn - Async function to measure
 * @returns Promise that resolves to the function result
 *
 * @example
 * ```tsx
 * const result = await measureOperationPerformance("fetch-data", async () => {
 *   return await fetch(url).then(r => r.json());
 * });
 * ```
 */
export async function measureOperationPerformance<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  return measureAsync(label, fn);
}

/**
 * Get performance metrics for an operation
 *
 * @param label - Label of the operation (placeholder for future use)
 * @returns Array of performance metrics for that operation
 * @deprecated SDK doesn't expose getMetricsForOperation yet, this is a placeholder
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getOperationMetrics(label: string): PerformanceMetric[] {
  return [];
  // Note: SDK doesn't expose getMetricsForOperation yet,
  // this is a placeholder for future use
}

/**
 * Log performance metrics to console
 *
 * Useful for debugging and performance analysis
 *
 * @example
 * ```tsx
 * // In browser console
 * logPerformanceMetrics();
 * ```
 */
export function logPerformanceMetrics(): void {
  logDebug("Performance metrics requested - check console");
}
