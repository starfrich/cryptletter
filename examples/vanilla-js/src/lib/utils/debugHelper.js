/**
 * Debug Helper Wrapper for Vanilla JS
 *
 * Simplified debug and logging utilities with localStorage persistence.
 * Uses console logging - no Activity Log in UI.
 * Wraps SDK debug utilities with vanilla JS state management.
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
} from '@fhevm-sdk'

const DEBUG_MODE_KEY = 'FHEVM_DEBUG'

/**
 * Create a debug manager with reactive state
 *
 * @returns Object with debug functions and state
 *
 * @example
 * ```js
 * const debugMgr = createDebugManager()
 *
 * debugMgr.on('debugModeChange', (enabled) => {
 *   console.log('Debug mode:', enabled)
 *   // Update UI
 * })
 *
 * debugMgr.initializeDebugMode()
 * const stopTimer = debugMgr.startPerformanceTimer('operation')
 * // ... do work
 * const metric = stopTimer()
 * ```
 */
export function createDebugManager() {
  // State
  const state = {
    verbose: false,
    enabled: false,
  }

  const performanceMetrics = []

  // Event listeners
  const listeners = {
    debugModeChange: [],
    metricsUpdate: [],
  }

  /**
   * Register event listener
   *
   * @param event - Event name ('debugModeChange' or 'metricsUpdate')
   * @param callback - Callback function
   */
  function on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = []
    }
    listeners[event].push(callback)
  }

  /**
   * Unregister event listener
   *
   * @param event - Event name
   * @param callback - Callback function
   */
  function off(event, callback) {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((cb) => cb !== callback)
    }
  }

  /**
   * Emit event to all listeners
   *
   * @param event - Event name
   * @param data - Event data
   */
  function emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach((cb) => cb(data))
    }
  }

  /**
   * Update state and emit change event
   *
   * @param updates - State updates
   */
  function updateState(updates) {
    Object.assign(state, updates)
    if (updates.enabled !== undefined) {
      emit('debugModeChange', state.enabled)
    }
  }

  /**
   * Initialize debug mode from localStorage
   *
   * Should be called on app initialization to restore debug state
   * from previous session
   */
  function initializeDebugMode() {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(DEBUG_MODE_KEY)
    if (stored === 'true') {
      enableDebugLogging({ verbose: true })
      updateState({ verbose: true, enabled: true })
    }
  }

  /**
   * Toggle debug mode on/off
   *
   * @returns true if debug mode is now enabled, false if disabled
   */
  function toggleDebugMode() {
    if (typeof window === 'undefined') return false

    const currentState = getDebugState()
    const newState = !(currentState.verbose ?? false)

    if (newState) {
      enableDebugLogging({ verbose: true })
      localStorage.setItem(DEBUG_MODE_KEY, 'true')
      updateState({ verbose: true, enabled: true })
    } else {
      disableDebugLogging()
      localStorage.setItem(DEBUG_MODE_KEY, 'false')
      updateState({ verbose: false, enabled: false })
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
  function isDebugEnabled() {
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
  function startPerformanceTimer(label) {
    const stopFn = startTimer(label)
    return () => {
      const metric = stopFn()
      performanceMetrics.push(metric)
      emit('metricsUpdate', performanceMetrics)
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
  async function measureOperationPerformance(label, fn) {
    return measureAsync(label, fn)
  }

  /**
   * Get performance metrics for an operation
   *
   * @param label - Optional label filter
   * @returns Array of performance metrics
   */
  function getMetrics(label) {
    if (!label) return performanceMetrics
    return performanceMetrics.filter((m) => m.label === label)
  }

  /**
   * Clear all performance metrics
   */
  function clearMetrics() {
    performanceMetrics.length = 0
    emit('metricsUpdate', performanceMetrics)
  }

  /**
   * Export metrics as JSON
   *
   * @returns JSON string of all metrics
   */
  function exportMetrics() {
    return JSON.stringify(performanceMetrics, null, 2)
  }

  /**
   * Log performance metrics to console
   *
   * Useful for debugging and performance analysis
   */
  function logPerformanceMetrics() {
    console.log('📊 Performance metrics:')
    console.table(performanceMetrics)
  }

  /**
   * Get current debug state
   *
   * @returns Current state object
   */
  function getState() {
    return { ...state }
  }

  return {
    state,
    performanceMetrics,
    getState,
    on,
    off,
    emit,
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
export function initializeDebugMode() {
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
export function toggleDebugMode() {
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
export function isDebugEnabled() {
  return getDebugState().verbose ?? false
}

/**
 * Helper function - Log debug message
 *
 * @param message - Message to log
 * @param data - Optional data
 */
export function logDebug(message, data) {
  debug(message, data)
}

/**
 * Helper function - Log info message
 *
 * @param message - Message to log
 * @param data - Optional data
 */
export function logInfo(message, data) {
  info(message, data)
}

/**
 * Helper function - Log warning message
 *
 * @param message - Message to log
 * @param data - Optional data
 */
export function logWarn(message, data) {
  warn(message, data)
}

/**
 * Helper function - Log error message
 *
 * @param message - Message to log
 * @param err - Optional error
 */
export function logError(message, err) {
  error(message, err)
}

/**
 * Helper function - Start performance timer
 *
 * @param label - Timer label
 * @returns Function to stop timer
 */
export function startPerformanceTimer(label) {
  return startTimer(label)
}

/**
 * Helper function - Measure async operation
 *
 * @param label - Operation label
 * @param fn - Async function
 * @returns Promise with result
 */
export async function measureOperationPerformance(label, fn) {
  return measureAsync(label, fn)
}

/**
 * Helper function - Log performance metrics
 */
export function logPerformanceMetrics() {
  console.log('📊 Performance metrics requested - check console')
}
