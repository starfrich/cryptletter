import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  enableDebugLogging,
  disableDebugLogging,
  getDebugState,
  setDebugLevel,
  debug,
  info,
  warn,
  error,
  startTimer,
  measureAsync,
  measureSync,
  getMetrics,
  getMetricsForOperation,
  getAverageDuration,
  getPerformanceSummary,
  clearMetrics,
  printPerformanceSummary,
  createDebugGroup,
  formatObject,
  assert,
  type DebugOptions,
  type PerformanceMetric,
} from "../../src/utils/debug";

describe("Debug Utils", () => {
  // Mock console methods
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleTrace = console.trace;
  const originalConsoleGroup = console.group;
  const originalConsoleGroupEnd = console.groupEnd;
  const originalConsoleTable = console.table;

  beforeEach(() => {
    // Reset debug state before each test
    disableDebugLogging();
    clearMetrics();

    // Mock console methods
    console.log = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.trace = vi.fn();
    console.group = vi.fn();
    console.groupEnd = vi.fn();
    console.table = vi.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    console.trace = originalConsoleTrace;
    console.group = originalConsoleGroup;
    console.groupEnd = originalConsoleGroupEnd;
    console.table = originalConsoleTable;
  });

  describe("Debug Configuration", () => {
    it("should enable debug logging with default options", () => {
      enableDebugLogging();
      const state = getDebugState();

      expect(state.verbose).toBe(true);
      expect(state.metrics).toBe(false);
      expect(state.stackTrace).toBe(false);
      expect(state.prefix).toBe("[FHEVM SDK]");
      expect(state.level).toBe("debug");
    });

    it("should enable debug logging with custom options", () => {
      enableDebugLogging({
        verbose: true,
        metrics: true,
        stackTrace: true,
        prefix: "[CUSTOM]",
        level: "info",
      });
      const state = getDebugState();

      expect(state.verbose).toBe(true);
      expect(state.metrics).toBe(true);
      expect(state.stackTrace).toBe(true);
      expect(state.prefix).toBe("[CUSTOM]");
      expect(state.level).toBe("info");
    });

    it("should disable debug logging", () => {
      enableDebugLogging({ verbose: true, metrics: true });
      disableDebugLogging();
      const state = getDebugState();

      expect(state.verbose).toBe(false);
      expect(state.metrics).toBe(false);
      expect(state.stackTrace).toBe(false);
      expect(state.level).toBe("info");
    });

    it("should set debug level", () => {
      enableDebugLogging();
      setDebugLevel("warn");
      const state = getDebugState();

      expect(state.level).toBe("warn");
    });

    it("should get current debug state", () => {
      const state = getDebugState();

      expect(state).toHaveProperty("verbose");
      expect(state).toHaveProperty("metrics");
      expect(state).toHaveProperty("stackTrace");
      expect(state).toHaveProperty("prefix");
      expect(state).toHaveProperty("level");
    });
  });

  describe("Logging Functions", () => {
    describe("debug", () => {
      it("should log debug message when verbose is enabled and level is debug", () => {
        enableDebugLogging({ verbose: true, level: "debug" });
        debug("Test message");

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining("[DEBUG]"),
          "Test message"
        );
      });

      it("should log debug message with data", () => {
        enableDebugLogging({ verbose: true, level: "debug" });
        const data = { key: "value" };
        debug("Test message", data);

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining("[DEBUG]"),
          "Test message",
          data
        );
      });

      it("should not log when verbose is disabled", () => {
        disableDebugLogging();
        debug("Test message");

        expect(console.log).not.toHaveBeenCalled();
      });

      it("should not log when level is not debug", () => {
        enableDebugLogging({ verbose: true, level: "info" });
        debug("Test message");

        expect(console.log).not.toHaveBeenCalled();
      });

      it("should log stack trace when stackTrace is enabled", () => {
        enableDebugLogging({ verbose: true, level: "debug", stackTrace: true });
        debug("Test message");

        expect(console.trace).toHaveBeenCalled();
      });
    });

    describe("info", () => {
      it("should log info message when verbose is enabled", () => {
        enableDebugLogging({ verbose: true, level: "info" });
        info("Test info");

        expect(console.info).toHaveBeenCalledWith(
          expect.stringContaining("[INFO]"),
          "Test info"
        );
      });

      it("should log info message with data", () => {
        enableDebugLogging({ verbose: true, level: "info" });
        const data = { key: "value" };
        info("Test info", data);

        expect(console.info).toHaveBeenCalledWith(
          expect.stringContaining("[INFO]"),
          "Test info",
          data
        );
      });

      it("should not log when verbose is disabled", () => {
        disableDebugLogging();
        info("Test info");

        expect(console.info).not.toHaveBeenCalled();
      });

      it("should log when level is debug", () => {
        enableDebugLogging({ verbose: true, level: "debug" });
        info("Test info");

        expect(console.info).toHaveBeenCalled();
      });

      it("should log when level is warn", () => {
        enableDebugLogging({ verbose: true, level: "warn" });
        info("Test info");

        expect(console.info).toHaveBeenCalled();
      });

      it("should log when level is error", () => {
        enableDebugLogging({ verbose: true, level: "error" });
        info("Test info");

        expect(console.info).toHaveBeenCalled();
      });
    });

    describe("warn", () => {
      it("should log warning message when verbose is enabled", () => {
        enableDebugLogging({ verbose: true, level: "warn" });
        warn("Test warning");

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining("[WARN]"),
          "Test warning"
        );
      });

      it("should log warning message with data", () => {
        enableDebugLogging({ verbose: true, level: "warn" });
        const data = { error: "details" };
        warn("Test warning", data);

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining("[WARN]"),
          "Test warning",
          data
        );
      });

      it("should not log when verbose is disabled", () => {
        disableDebugLogging();
        warn("Test warning");

        expect(console.warn).not.toHaveBeenCalled();
      });

      it("should log stack trace when stackTrace is enabled", () => {
        enableDebugLogging({ verbose: true, level: "warn", stackTrace: true });
        warn("Test warning");

        expect(console.trace).toHaveBeenCalled();
      });

      it("should log when level is debug", () => {
        enableDebugLogging({ verbose: true, level: "debug" });
        warn("Test warning");

        expect(console.warn).toHaveBeenCalled();
      });

      it("should log when level is info", () => {
        enableDebugLogging({ verbose: true, level: "info" });
        warn("Test warning");

        expect(console.warn).toHaveBeenCalled();
      });
    });

    describe("error", () => {
      it("should log error message always", () => {
        disableDebugLogging();
        error("Test error");

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("[ERROR]"),
          "Test error"
        );
      });

      it("should log error message with error object", () => {
        const err = new Error("Something went wrong");
        error("Test error", err);

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("[ERROR]"),
          "Test error",
          err
        );
      });

      it("should log stack trace when stackTrace is enabled", () => {
        enableDebugLogging({ stackTrace: true });
        error("Test error");

        expect(console.trace).toHaveBeenCalled();
      });
    });
  });

  describe("Performance Monitoring", () => {
    describe("startTimer", () => {
      it("should create a timer and record metric", () => {
        const stopTimer = startTimer("test_operation");
        stopTimer();

        const metrics = getMetrics();
        expect(metrics).toHaveLength(1);
        expect(metrics[0].name).toBe("test_operation");
        expect(metrics[0].durationMs).toBeGreaterThanOrEqual(0);
      });

      it("should include metadata in metric", () => {
        const metadata = { type: "encryption" };
        const stopTimer = startTimer("test_operation", metadata);
        stopTimer();

        const metrics = getMetrics();
        expect(metrics[0].metadata).toEqual(metadata);
      });

      it("should log metric when metrics is enabled", () => {
        enableDebugLogging({ verbose: true, level: "debug", metrics: true });
        vi.clearAllMocks(); // Clear the log from enableDebugLogging itself

        const stopTimer = startTimer("test_operation");
        stopTimer();

        // The log should contain both the prefix and the performance message
        expect(console.log).toHaveBeenCalled();
        const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
        const hasPerformanceLog = calls.some((call) =>
          call.some((arg) =>
            typeof arg === 'string' &&
            arg.includes("Performance") &&
            arg.includes("test_operation")
          )
        );
        expect(hasPerformanceLog).toBe(true);
      });

      it("should return metric from stop function", () => {
        const stopTimer = startTimer("test_operation");
        const metric = stopTimer();

        expect(metric.name).toBe("test_operation");
        expect(metric.durationMs).toBeGreaterThanOrEqual(0);
        expect(metric.timestamp).toBeGreaterThan(0);
      });
    });

    describe("measureAsync", () => {
      it("should measure async function execution time", async () => {
        const asyncFn = async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return "result";
        };

        const result = await measureAsync("async_op", asyncFn);

        expect(result).toBe("result");
        const metrics = getMetrics();
        expect(metrics).toHaveLength(1);
        expect(metrics[0].name).toBe("async_op");
        expect(metrics[0].durationMs).toBeGreaterThanOrEqual(10);
      });

      it("should include metadata", async () => {
        const metadata = { type: "test" };
        await measureAsync("async_op", async () => {}, metadata);

        const metrics = getMetrics();
        expect(metrics[0].metadata).toEqual(metadata);
      });

      it("should record metric even if function throws", async () => {
        const asyncFn = async () => {
          throw new Error("Test error");
        };

        try {
          await measureAsync("async_op", asyncFn);
        } catch (err) {
          // Expected error
        }

        const metrics = getMetrics();
        expect(metrics).toHaveLength(1);
        expect(metrics[0].name).toBe("async_op");
      });
    });

    describe("measureSync", () => {
      it("should measure sync function execution time", () => {
        const syncFn = () => {
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += i;
          }
          return sum;
        };

        const result = measureSync("sync_op", syncFn);

        expect(result).toBeGreaterThan(0);
        const metrics = getMetrics();
        expect(metrics).toHaveLength(1);
        expect(metrics[0].name).toBe("sync_op");
      });

      it("should include metadata", () => {
        const metadata = { type: "test" };
        measureSync("sync_op", () => {}, metadata);

        const metrics = getMetrics();
        expect(metrics[0].metadata).toEqual(metadata);
      });

      it("should record metric even if function throws", () => {
        const syncFn = () => {
          throw new Error("Test error");
        };

        try {
          measureSync("sync_op", syncFn);
        } catch (err) {
          // Expected error
        }

        const metrics = getMetrics();
        expect(metrics).toHaveLength(1);
        expect(metrics[0].name).toBe("sync_op");
      });
    });

    describe("getMetrics", () => {
      it("should return all recorded metrics", () => {
        startTimer("op1")();
        startTimer("op2")();
        startTimer("op3")();

        const metrics = getMetrics();
        expect(metrics).toHaveLength(3);
      });

      it("should return a copy of metrics array", () => {
        startTimer("op1")();
        const metrics1 = getMetrics();
        const metrics2 = getMetrics();

        expect(metrics1).not.toBe(metrics2);
        expect(metrics1).toEqual(metrics2);
      });
    });

    describe("getMetricsForOperation", () => {
      it("should filter metrics by operation name", () => {
        startTimer("op1")();
        startTimer("op2")();
        startTimer("op1")();

        const op1Metrics = getMetricsForOperation("op1");
        expect(op1Metrics).toHaveLength(2);
        expect(op1Metrics.every((m) => m.name === "op1")).toBe(true);
      });

      it("should return empty array for non-existent operation", () => {
        const metrics = getMetricsForOperation("non_existent");
        expect(metrics).toEqual([]);
      });
    });

    describe("getAverageDuration", () => {
      it("should calculate average duration", () => {
        // Create metrics with known durations using performance.now()
        const start1 = performance.now();
        const stopTimer1 = startTimer("test_op");
        const end1 = performance.now();
        stopTimer1();

        const start2 = performance.now();
        const stopTimer2 = startTimer("test_op");
        const end2 = performance.now();
        stopTimer2();

        const avg = getAverageDuration("test_op");
        expect(avg).toBeGreaterThanOrEqual(0);
      });

      it("should return 0 for operation with no metrics", () => {
        const avg = getAverageDuration("non_existent");
        expect(avg).toBe(0);
      });
    });

    describe("getPerformanceSummary", () => {
      it("should generate summary for all operations", () => {
        startTimer("op1")();
        startTimer("op1")();
        startTimer("op2")();

        const summary = getPerformanceSummary();
        expect(summary).toHaveLength(2);

        const op1Summary = summary.find((s) => s.name === "op1");
        expect(op1Summary).toBeDefined();
        expect(op1Summary!.count).toBe(2);
        expect(op1Summary!.avgDurationMs).toBeGreaterThanOrEqual(0);
        expect(op1Summary!.minDurationMs).toBeGreaterThanOrEqual(0);
        expect(op1Summary!.maxDurationMs).toBeGreaterThanOrEqual(0);
      });

      it("should calculate correct min and max durations", () => {
        // Create multiple measurements
        for (let i = 0; i < 5; i++) {
          startTimer("test_op")();
        }

        const summary = getPerformanceSummary();
        const testOpSummary = summary.find((s) => s.name === "test_op");

        expect(testOpSummary).toBeDefined();
        expect(testOpSummary!.minDurationMs).toBeLessThanOrEqual(
          testOpSummary!.maxDurationMs
        );
      });

      it("should return empty array when no metrics", () => {
        const summary = getPerformanceSummary();
        expect(summary).toEqual([]);
      });
    });

    describe("clearMetrics", () => {
      it("should clear all metrics", () => {
        startTimer("op1")();
        startTimer("op2")();

        expect(getMetrics()).toHaveLength(2);

        clearMetrics();

        expect(getMetrics()).toHaveLength(0);
      });
    });

    describe("printPerformanceSummary", () => {
      it("should print summary to console", () => {
        startTimer("op1")();
        printPerformanceSummary();

        expect(console.table).toHaveBeenCalled();
      });

      it("should print message when no metrics", () => {
        printPerformanceSummary();

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining("No performance metrics")
        );
      });
    });

    it("should prevent memory leak by limiting stored metrics", () => {
      // Create more than MAX_METRICS (1000)
      for (let i = 0; i < 1100; i++) {
        startTimer(`op_${i}`)();
      }

      const metrics = getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe("Debug Utilities", () => {
    describe("createDebugGroup", () => {
      it("should create debug group when verbose is enabled", () => {
        enableDebugLogging({ verbose: true });
        const { log, end } = createDebugGroup("Test Group");

        expect(console.group).toHaveBeenCalledWith(
          expect.stringContaining("Test Group")
        );

        log("Test message");
        expect(console.log).toHaveBeenCalledWith("Test message");

        log("Test with data", { key: "value" });
        expect(console.log).toHaveBeenCalledWith("Test with data", {
          key: "value",
        });

        end();
        expect(console.groupEnd).toHaveBeenCalled();
      });

      it("should not create group when verbose is disabled", () => {
        disableDebugLogging();
        const { log, end } = createDebugGroup("Test Group");

        expect(console.group).not.toHaveBeenCalled();

        log("Test message");
        expect(console.log).not.toHaveBeenCalled();

        end();
        expect(console.groupEnd).not.toHaveBeenCalled();
      });
    });

    describe("formatObject", () => {
      it("should format null", () => {
        expect(formatObject(null)).toBe("null");
      });

      it("should format primitive types", () => {
        expect(formatObject("string")).toBe("string");
        expect(formatObject(123)).toBe("123");
        expect(formatObject(true)).toBe("true");
        expect(formatObject(false)).toBe("false");
      });

      it("should format arrays", () => {
        const arr = [1, 2, 3];
        const formatted = formatObject(arr);
        expect(formatted).toContain("1");
        expect(formatted).toContain("2");
        expect(formatted).toContain("3");
      });

      it("should truncate long arrays", () => {
        const arr = [1, 2, 3, 4, 5, 6, 7, 8];
        const formatted = formatObject(arr);
        expect(formatted).toContain("...");
        expect(formatted).toContain("3 more");
      });

      it("should format objects", () => {
        const obj = { key1: "value1", key2: "value2" };
        const formatted = formatObject(obj);
        expect(formatted).toContain("key1");
        expect(formatted).toContain("value1");
      });

      it("should truncate objects with many keys", () => {
        const obj = {
          key1: 1,
          key2: 2,
          key3: 3,
          key4: 4,
          key5: 5,
          key6: 6,
        };
        const formatted = formatObject(obj);
        expect(formatted).toContain("...");
        expect(formatted).toContain("more keys");
      });

      it("should respect depth parameter", () => {
        const nested = { a: { b: { c: "deep" } } };
        const formatted = formatObject(nested, 1);
        expect(formatted).toContain("...");
      });

      it("should handle nested arrays and objects", () => {
        const complex = {
          arr: [1, 2, 3],
          obj: { nested: "value" },
        };
        const formatted = formatObject(complex);
        expect(formatted).toBeDefined();
        expect(typeof formatted).toBe("string");
      });

      it("should handle errors gracefully", () => {
        const circular: any = {};
        circular.self = circular;
        const formatted = formatObject(circular);
        expect(typeof formatted).toBe("string");
      });
    });

    describe("assert", () => {
      it("should not throw when condition is true", () => {
        expect(() => {
          assert(true, "Should not throw");
        }).not.toThrow();
      });

      it("should log error when condition is false", () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        assert(false, "Test assertion failed");

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("[ERROR]"),
          expect.stringContaining("Assertion failed: Test assertion failed")
        );

        process.env.NODE_ENV = originalEnv;
      });

      it("should throw in development when condition is false", () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        expect(() => {
          assert(false, "Test assertion failed");
        }).toThrow("Assertion failed: Test assertion failed");

        process.env.NODE_ENV = originalEnv;
      });

      it("should log additional data", () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        const data = { key: "value" };
        assert(false, "Test assertion", data);

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("[ERROR]"),
          expect.stringContaining("Assertion failed"),
          data
        );

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe("Integration Tests", () => {
    it("should support full debug workflow", () => {
      enableDebugLogging({
        verbose: true,
        metrics: true,
        stackTrace: false,
        level: "debug",
      });

      const { log, end } = createDebugGroup("Encryption");
      log("Starting encryption process");

      const result = measureSync("encrypt_value", () => {
        return "encrypted_data";
      });

      log("Encryption completed", { result });
      end();

      const metrics = getMetrics();
      const summary = getPerformanceSummary();

      expect(metrics.length).toBeGreaterThan(0);
      expect(summary.length).toBeGreaterThan(0);
      expect(console.group).toHaveBeenCalled();
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it("should handle multiple operations with different log levels", () => {
      enableDebugLogging({ verbose: true, level: "info" });

      debug("This should not log");
      info("This should log");
      warn("This should log");
      error("This should log");

      expect(console.log).not.toHaveBeenCalled(); // debug
      expect(console.info).toHaveBeenCalled(); // info
      expect(console.warn).toHaveBeenCalled(); // warn
      expect(console.error).toHaveBeenCalled(); // error
    });

    it("should track performance across multiple operations", async () => {
      const operations = ["fetch", "decrypt", "validate"];

      for (const op of operations) {
        await measureAsync(op, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
        });
      }

      const summary = getPerformanceSummary();
      expect(summary).toHaveLength(3);

      for (const op of operations) {
        const opSummary = summary.find((s) => s.name === op);
        expect(opSummary).toBeDefined();
        expect(opSummary!.count).toBe(1);
      }
    });
  });
});
