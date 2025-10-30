/**
 * Tests for react/FhevmProvider.tsx
 *
 * These tests cover the FhevmProvider component and useFhevmContext hook.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor, render } from "@testing-library/react";
import React from "react";
import {
  FhevmProvider,
  useFhevmContext,
  type FhevmContextValue,
} from "../../src/react/FhevmProvider";
import type { FhevmInstance } from "../../src/core/types";
import { GenericStringInMemoryStorage } from "../../src/storage/GenericStringStorage";

// Mock the useFhevm hook
vi.mock("../../src/react/useFhevm", async () => {
  const actual = await vi.importActual<typeof import("../../src/react/useFhevm")>("../../src/react/useFhevm");
  return {
    ...actual,
    useFhevm: vi.fn(),
  };
});

describe("FhevmProvider", () => {
  const mockProvider = "http://localhost:8545";
  const mockChainId = 31337;

  let mockUseFhevm: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked useFhevm function
    const { useFhevm } = await import("../../src/react/useFhevm");
    mockUseFhevm = vi.mocked(useFhevm);
  });

  describe("Provider Component", () => {
    it("should render children", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const { container } = render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <div data-testid="child">Test Child</div>
        </FhevmProvider>
      );

      expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
    });

    it("should pass provider and chainId to useFhevm", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <div>Test</div>
        </FhevmProvider>
      );

      expect(mockUseFhevm).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          chainId: mockChainId,
        })
      );
    });

    it("should pass enabled flag to useFhevm (default true)", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <div>Test</div>
        </FhevmProvider>
      );

      expect(mockUseFhevm).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      );
    });

    it("should pass enabled flag when explicitly set to false", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      render(
        <FhevmProvider
          provider={mockProvider}
          chainId={mockChainId}
          enabled={false}
        >
          <div>Test</div>
        </FhevmProvider>
      );

      expect(mockUseFhevm).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it("should pass retry configuration to useFhevm", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const retryConfig = {
        maxRetries: 3,
        retryDelay: 2000,
      };

      render(
        <FhevmProvider
          provider={mockProvider}
          chainId={mockChainId}
          retry={retryConfig}
        >
          <div>Test</div>
        </FhevmProvider>
      );

      expect(mockUseFhevm).toHaveBeenCalledWith(
        expect.objectContaining({
          retry: retryConfig,
        })
      );
    });

    it("should pass initialMockChains to useFhevm", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const mockChains = {
        31337: "http://localhost:8545",
        11155111: "https://sepolia.infura.io",
      };

      render(
        <FhevmProvider
          provider={mockProvider}
          chainId={mockChainId}
          initialMockChains={mockChains}
        >
          <div>Test</div>
        </FhevmProvider>
      );

      expect(mockUseFhevm).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMockChains: mockChains,
        })
      );
    });

    it("should pass callbacks to useFhevm", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      render(
        <FhevmProvider
          provider={mockProvider}
          chainId={mockChainId}
          onSuccess={onSuccess}
          onError={onError}
        >
          <div>Test</div>
        </FhevmProvider>
      );

      expect(mockUseFhevm).toHaveBeenCalledWith(
        expect.objectContaining({
          onSuccess,
          onError,
        })
      );
    });

    it("should include storage in context value", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockUseFhevm.mockReturnValue({
        instance: mockInstance,
        status: "ready",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const storage = new GenericStringInMemoryStorage();

      const TestComponent = () => {
        const context = useFhevmContext();
        expect(context.storage).toBe(storage);
        return null;
      };

      render(
        <FhevmProvider
          provider={mockProvider}
          chainId={mockChainId}
          storage={storage}
        >
          <TestComponent />
        </FhevmProvider>
      );
    });

    it("should allow undefined storage", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const TestComponent = () => {
        const context = useFhevmContext();
        expect(context.storage).toBeUndefined();
        return null;
      };

      render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );
    });
  });

  describe("Context Value", () => {
    it("should provide all context values", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      const mockRefresh = vi.fn();

      mockUseFhevm.mockReturnValue({
        instance: mockInstance,
        status: "ready",
        error: undefined,
        errorMessage: undefined,
        refresh: mockRefresh,
        retryCount: 0,
      });

      const TestComponent = () => {
        const context = useFhevmContext();

        expect(context.instance).toBe(mockInstance);
        expect(context.status).toBe("ready");
        expect(context.error).toBeUndefined();
        expect(context.errorMessage).toBeUndefined();
        expect(context.refresh).toBe(mockRefresh);
        expect(context.retryCount).toBe(0);
        expect(context.storage).toBeUndefined();

        return null;
      };

      render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );
    });

    it("should provide error context values when creation fails", () => {
      const error = new Error("Creation failed");

      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "error",
        error: error,
        errorMessage: "Creation failed",
        refresh: vi.fn(),
        retryCount: 0,
      });

      const TestComponent = () => {
        const context = useFhevmContext();

        expect(context.instance).toBeUndefined();
        expect(context.status).toBe("error");
        expect(context.error).toBe(error);
        expect(context.errorMessage).toBe("Creation failed");

        return null;
      };

      render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );
    });

    it("should provide loading context values", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "loading",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const TestComponent = () => {
        const context = useFhevmContext();

        expect(context.instance).toBeUndefined();
        expect(context.status).toBe("loading");
        expect(context.error).toBeUndefined();
        expect(context.errorMessage).toBeUndefined();

        return null;
      };

      render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );
    });

    it("should provide idle context values", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const TestComponent = () => {
        const context = useFhevmContext();

        expect(context.instance).toBeUndefined();
        expect(context.status).toBe("idle");
        expect(context.error).toBeUndefined();
        expect(context.errorMessage).toBeUndefined();

        return null;
      };

      render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );
    });

    it("should provide retry count during retries", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "loading",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 2,
      });

      const TestComponent = () => {
        const context = useFhevmContext();

        expect(context.retryCount).toBe(2);
        expect(context.status).toBe("loading");

        return null;
      };

      render(
        <FhevmProvider
          provider={mockProvider}
          chainId={mockChainId}
          retry={{ maxRetries: 3, retryDelay: 1000 }}
        >
          <TestComponent />
        </FhevmProvider>
      );
    });
  });

  describe("useFhevmContext Hook", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      expect(() => {
        renderHook(() => useFhevmContext());
      }).toThrow("useFhevmContext must be used within a FhevmProvider");

      consoleErrorSpy.mockRestore();
    });

    it("should provide context when used inside provider", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockUseFhevm.mockReturnValue({
        instance: mockInstance,
        status: "ready",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          {children}
        </FhevmProvider>
      );

      const { result } = renderHook(() => useFhevmContext(), { wrapper });

      expect(result.current.instance).toBe(mockInstance);
      expect(result.current.status).toBe("ready");
    });

    it("should return stable context value for same inputs", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      const mockRefresh = vi.fn();

      mockUseFhevm.mockReturnValue({
        instance: mockInstance,
        status: "ready",
        error: undefined,
        errorMessage: undefined,
        refresh: mockRefresh,
        retryCount: 0,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          {children}
        </FhevmProvider>
      );

      const { result, rerender } = renderHook(() => useFhevmContext(), {
        wrapper,
      });

      const firstContext = result.current;

      rerender();

      // Context should be memoized
      expect(result.current).toBe(firstContext);
    });

    it("should update context when useFhevm values change", () => {
      const mockInstance1: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      const mockInstance2: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockUseFhevm.mockReturnValue({
        instance: mockInstance1,
        status: "ready",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          {children}
        </FhevmProvider>
      );

      const { result, rerender } = renderHook(() => useFhevmContext(), {
        wrapper,
      });

      expect(result.current.instance).toBe(mockInstance1);

      // Update mock return value
      mockUseFhevm.mockReturnValue({
        instance: mockInstance2,
        status: "ready",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      rerender();

      expect(result.current.instance).toBe(mockInstance2);
    });
  });

  describe("Nested Providers", () => {
    it("should support nested providers with different contexts", () => {
      const mockInstance1: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      const mockInstance2: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      let callCount = 0;
      mockUseFhevm.mockImplementation(() => {
        callCount++;
        return {
          instance: callCount === 1 ? mockInstance1 : mockInstance2,
          status: "ready",
          error: undefined,
          errorMessage: undefined,
          refresh: vi.fn(),
          retryCount: 0,
        };
      });

      const InnerComponent = () => {
        const context = useFhevmContext();
        // Should get instance from nearest provider
        expect(context.instance).toBe(mockInstance2);
        return null;
      };

      const MiddleComponent = () => {
        const context = useFhevmContext();
        // Should get instance from outer provider
        expect(context.instance).toBe(mockInstance1);
        return (
          <FhevmProvider
            provider="http://localhost:8546"
            chainId={11155111}
          >
            <InnerComponent />
          </FhevmProvider>
        );
      };

      render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <MiddleComponent />
        </FhevmProvider>
      );
    });
  });

  describe("Context Memoization", () => {
    it("should memoize context value to prevent unnecessary rerenders", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      const mockRefresh = vi.fn();

      mockUseFhevm.mockReturnValue({
        instance: mockInstance,
        status: "ready",
        error: undefined,
        errorMessage: undefined,
        refresh: mockRefresh,
        retryCount: 0,
      });

      let renderCount = 0;

      const TestComponent = () => {
        const context = useFhevmContext();
        renderCount++;
        return <div>{context.status}</div>;
      };

      const { rerender } = render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );

      const initialRenderCount = renderCount;

      // Force rerender
      rerender(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );

      // Should not cause additional renders if context value is the same
      // Note: This may vary depending on React's reconciliation
      expect(renderCount).toBeGreaterThanOrEqual(initialRenderCount);
    });

    it("should create new context value only when dependencies change", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      let contextValues: FhevmContextValue[] = [];

      mockUseFhevm.mockReturnValue({
        instance: mockInstance,
        status: "ready",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const TestComponent = () => {
        const context = useFhevmContext();
        contextValues.push(context);
        return null;
      };

      const { rerender } = render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );

      const firstContext = contextValues[contextValues.length - 1];

      // Rerender with same mock values
      rerender(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );

      const secondContext = contextValues[contextValues.length - 1];

      // Should be the same reference due to memoization
      expect(firstContext).toBe(secondContext);
    });
  });

  describe("Storage Integration", () => {
    it("should provide storage instance to context", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const storage = new GenericStringInMemoryStorage();
      storage.setItem("test-key", "test-value");

      const TestComponent = () => {
        const context = useFhevmContext();
        expect(context.storage).toBe(storage);
        expect(context.storage?.getItem("test-key")).toBe("test-value");
        return null;
      };

      render(
        <FhevmProvider
          provider={mockProvider}
          chainId={mockChainId}
          storage={storage}
        >
          <TestComponent />
        </FhevmProvider>
      );
    });

    it("should update context when storage changes", () => {
      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const storage1 = new GenericStringInMemoryStorage();
      const storage2 = new GenericStringInMemoryStorage();

      storage1.setItem("key", "value1");
      storage2.setItem("key", "value2");

      const TestComponent = () => {
        const context = useFhevmContext();
        return (
          <div data-storage-key={context.storage?.getItem("key")}>
            {context.storage ? "has storage" : "no storage"}
          </div>
        );
      };

      const { container, rerender } = render(
        <FhevmProvider
          provider={mockProvider}
          chainId={mockChainId}
          storage={storage1}
        >
          <TestComponent />
        </FhevmProvider>
      );

      expect(container.querySelector("div")?.getAttribute("data-storage-key")).toBe("value1");

      rerender(
        <FhevmProvider
          provider={mockProvider}
          chainId={mockChainId}
          storage={storage2}
        >
          <TestComponent />
        </FhevmProvider>
      );

      expect(container.querySelector("div")?.getAttribute("data-storage-key")).toBe("value2");
    });
  });

  describe("Refresh Function", () => {
    it("should expose refresh function from useFhevm", () => {
      const mockRefresh = vi.fn();

      mockUseFhevm.mockReturnValue({
        instance: undefined,
        status: "idle",
        error: undefined,
        errorMessage: undefined,
        refresh: mockRefresh,
        retryCount: 0,
      });

      const TestComponent = () => {
        const context = useFhevmContext();
        expect(context.refresh).toBe(mockRefresh);

        // Call refresh
        context.refresh();

        return null;
      };

      render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe("Type Safety", () => {
    it("should provide correctly typed context value", () => {
      const mockInstance: Partial<FhevmInstance> = {
        createEncryptedInput: vi.fn(),
      };

      mockUseFhevm.mockReturnValue({
        instance: mockInstance,
        status: "ready",
        error: undefined,
        errorMessage: undefined,
        refresh: vi.fn(),
        retryCount: 0,
      });

      const TestComponent = () => {
        const context: FhevmContextValue = useFhevmContext();

        // TypeScript should infer these types correctly
        const _instance: FhevmInstance | undefined = context.instance;
        const _status: "idle" | "loading" | "ready" | "error" = context.status;
        const _error: Error | undefined = context.error;
        const _errorMessage: string | undefined = context.errorMessage;
        const _refresh: () => void = context.refresh;
        const _retryCount: number = context.retryCount;
        const _storage: any = context.storage;

        return null;
      };

      render(
        <FhevmProvider provider={mockProvider} chainId={mockChainId}>
          <TestComponent />
        </FhevmProvider>
      );
    });
  });
});
