/**
 * Debug Helper Wrapper for Vue
 *
 * Simplified debug and logging utilities with localStorage persistence.
 * Uses console logging (like Next.js pattern) - no Activity Log in UI.
 * Wraps SDK debug utilities with Vue-specific logic.
 */

import { reactive } from 'vue'
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
} from '@fhevm-sdk/utils'

const DEBUG_MODE_KEY = 'FHEVM_DEBUG'

/**
 * Vue composable for debug mode management
 *
 * Provides debug mode toggle and logging utilities.
 * Uses console logging (like Next.js) - no Activity Log in UI.
 *
 * @returns Object with debug functions and reactive debug state
 *
 * @example
 * ```ts
 * const { isDebugEnabled, toggleDebugMode, startPerformanceTimer } = useDebugMode()
 *
 * const stopTimer = startPerformanceTimer('operation')
 * // ... do work
 * const metric = stopTimer()
 * ```
 */
export function useDebugMode() {
  const debugState = reactive({
    verbose: false,
    enabled: false,
  })

  const performanceMetrics: PerformanceMetric[] = []

  /**
   * Initialize debug mode from localStorage
   *
   * Should be called on app initialization to restore debug state
   * from previous session
   */
  function initializeDebugMode(): void {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(DEBUG_MODE_KEY)
    if (stored === 'true') {
      enableDebugLogging({ verbose: true })
      debugState.verbose = true
      debugState.enabled = true
    }
  }

  /**
   * Toggle debug mode on/off
   *
   * @returns true if debug mode is now enabled, false if disabled
   */
  function toggleDebugMode(): boolean {
    if (typeof window === 'undefined') return false

    const currentState = getDebugState()
    const newState = !(currentState.verbose ?? false)

    if (newState) {
      enableDebugLogging({ verbose: true })
      localStorage.setItem(DEBUG_MODE_KEY, 'true')
      debugState.verbose = true
      debugState.enabled = true
    } else {
      disableDebugLogging()
      localStorage.setItem(DEBUG_MODE_KEY, 'false')
      debugState.verbose = false
      debugState.enabled = false
    }

    return newState
  }

  /**
   * Get current debug state
   *
   * @returns Current debug state options
   */
  function getDebugModeState() {
    return getDebugState()
  }

  /**
   * Check if debug mode is currently enabled
   *
   * @returns true if debug mode is enabled
   */
  function isDebugEnabled(): boolean {
    return getDebugState().verbose ?? false
  }

  /**
   * Start a performance timer
   *
   * Returns a function to stop the timer and get the performance metric
   *
   * @param label - Label for the timer
   * @returns Function to call when done timing, returns performance metric
   */
  function startPerformanceTimer(label: string): () => PerformanceMetric {
    const stopFn = startTimer(label)
    return () => {
      const metric = stopFn()
      performanceMetrics.push(metric)
      return metric
    }
  }

  /**
   * Measure async operation performance
   *
   * @param label - Label for the operation
   * @param fn - Async function to measure
   * @returns Promise that resolves to the function result
   */
  async function measureOperationPerformance<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return measureAsync(label, fn)
  }

  /**
   * Get performance metrics for an operation
   *
   * @param label - Optional label filter
   * @returns Array of performance metrics
   */
  function getMetrics(label?: string): PerformanceMetric[] {
    if (!label) return performanceMetrics
    return performanceMetrics.filter((m: any) => m.label === label)
  }

  /**
   * Clear all performance metrics
   */
  function clearMetrics(): void {
    performanceMetrics.length = 0
  }

  /**
   * Export metrics as JSON
   *
   * @returns JSON string of all metrics
   */
  function exportMetrics(): string {
    return JSON.stringify(performanceMetrics, null, 2)
  }

  /**
   * Log performance metrics to console
   *
   * Useful for debugging and performance analysis
   */
  function logPerformanceMetrics(): void {
    console.log('📊 Performance metrics:')
    console.table(performanceMetrics)
  }

  return {
    debugState,
    performanceMetrics,
    initializeDebugMode,
    toggleDebugMode,
    getDebugModeState,
    isDebugEnabled,
    startPerformanceTimer,
    measureOperationPerformance,
    getMetrics,
    clearMetrics,
    exportMetrics,
    logPerformanceMetrics,
  }
}

/**
 * Helper function - Initialize debug mode
 */
export function initializeDebugMode(): void {
  if (typeof window === 'undefined') return

  const stored = localStorage.getItem(DEBUG_MODE_KEY)
  if (stored === 'true') {
    enableDebugLogging({ verbose: true })
  }
}

/**
 * Helper function - Toggle debug mode
 *
 * @returns true if debug mode is now enabled
 */
export function toggleDebugMode(): boolean {
  if (typeof window === 'undefined') return false

  const currentState = getDebugState()
  const newState = !(currentState.verbose ?? false)

  if (newState) {
    enableDebugLogging({ verbose: true })
    localStorage.setItem(DEBUG_MODE_KEY, 'true')
  } else {
    disableDebugLogging()
    localStorage.setItem(DEBUG_MODE_KEY, 'false')
  }

  return newState
}

/**
 * Helper function - Check if debug enabled
 *
 * @returns true if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return getDebugState().verbose ?? false
}

/**
 * Helper function - Log debug message
 *
 * @param message - Message to log
 * @param data - Optional data
 */
export function logDebug(message: string, data?: unknown): void {
  debug(message, data)
}

/**
 * Helper function - Log info message
 *
 * @param message - Message to log
 * @param data - Optional data
 */
export function logInfo(message: string, data?: unknown): void {
  info(message, data)
}

/**
 * Helper function - Log warning message
 *
 * @param message - Message to log
 * @param data - Optional data
 */
export function logWarn(message: string, data?: unknown): void {
  warn(message, data)
}

/**
 * Helper function - Log error message
 *
 * @param message - Message to log
 * @param err - Optional error
 */
export function logError(message: string, err?: unknown): void {
  error(message, err)
}

/**
 * Helper function - Start performance timer
 *
 * @param label - Timer label
 * @returns Function to stop timer
 */
export function startPerformanceTimer(label: string): () => PerformanceMetric {
  return startTimer(label)
}

/**
 * Helper function - Measure async operation
 *
 * @param label - Operation label
 * @param fn - Async function
 * @returns Promise with result
 */
export async function measureOperationPerformance<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  return measureAsync(label, fn)
}

/**
 * Helper function - Log performance metrics
 */
export function logPerformanceMetrics(): void {
  console.log('📊 Performance metrics requested - check console')
}
