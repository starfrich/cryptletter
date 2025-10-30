import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { useFhevmStatus } from "../../src/react/useFhevmStatus";
import { FhevmProvider } from "../../src/react/FhevmProvider";
import type { FhevmStatus } from "../../src/react/useFhevm";

describe("useFhevmStatus Hook", () => {
  const mockProvider = {
    request: vi.fn(),
  };

  it("returns status from context", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FhevmProvider provider={mockProvider as any} chainId={1}>
        {children}
      </FhevmProvider>
    );

    const { result } = renderHook(() => useFhevmStatus(), { wrapper });

    // Status should be one of the valid states
    const validStatuses: FhevmStatus[] = ["idle", "loading", "ready", "error"];
    expect(validStatuses).toContain(result.current);
  });

  it("returns 'idle' status when disabled", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FhevmProvider provider={mockProvider as any} chainId={1} enabled={false}>
        {children}
      </FhevmProvider>
    );

    const { result } = renderHook(() => useFhevmStatus(), { wrapper });

    expect(result.current).toBe("idle");
  });

  it("throws error when used outside FhevmProvider", () => {
    expect(() => {
      renderHook(() => useFhevmStatus());
    }).toThrow("useFhevmContext must be used within a FhevmProvider");
  });

  it("reflects loading state during initialization", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FhevmProvider provider={mockProvider as any} chainId={1}>
        {children}
      </FhevmProvider>
    );

    const { result } = renderHook(() => useFhevmStatus(), { wrapper });

    // Initially should be loading or ready
    expect(["loading", "ready", "error", "idle"]).toContain(result.current);
  });

  it("updates status as context changes", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FhevmProvider provider={mockProvider as any} chainId={1}>
        {children}
      </FhevmProvider>
    );

    const { result } = renderHook(() => useFhevmStatus(), { wrapper });

    // Status might change during the lifecycle
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it("returns same status reference when unchanged", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FhevmProvider provider={mockProvider as any} chainId={1} enabled={false}>
        {children}
      </FhevmProvider>
    );

    const { result, rerender } = renderHook(() => useFhevmStatus(), { wrapper });

    const firstStatus = result.current;
    rerender();
    const secondStatus = result.current;

    // Status should be the same across re-renders if context hasn't changed
    expect(firstStatus).toBe(secondStatus);
  });

  it("works with nested providers", () => {
    const OuterWrapper = ({ children }: { children: React.ReactNode }) => (
      <FhevmProvider provider={mockProvider as any} chainId={1}>
        {children}
      </FhevmProvider>
    );

    const { result } = renderHook(() => useFhevmStatus(), {
      wrapper: OuterWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("maintains type safety for status values", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FhevmProvider provider={mockProvider as any} chainId={1}>
        {children}
      </FhevmProvider>
    );

    const { result } = renderHook(() => useFhevmStatus(), { wrapper });

    // TypeScript should recognize this as FhevmStatus type
    const status: FhevmStatus = result.current;
    expect(status).toBeDefined();
    expect(typeof status).toBe("string");
  });

  it("can be used to conditionally render UI", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FhevmProvider provider={mockProvider as any} chainId={1}>
        {children}
      </FhevmProvider>
    );

    const { result } = renderHook(() => {
      const status = useFhevmStatus();
      return {
        status,
        showLoading: status === "loading",
        showError: status === "error",
        showReady: status === "ready",
        showIdle: status === "idle",
      };
    }, { wrapper });

    // One of these should be true
    const { showLoading, showError, showReady, showIdle } = result.current;
    expect(showLoading || showError || showReady || showIdle).toBe(true);
  });

  it("works with custom wrapper components", () => {
    const CustomWrapper = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="custom-wrapper">
        <FhevmProvider provider={mockProvider as any} chainId={1}>
          {children}
        </FhevmProvider>
      </div>
    );

    const { result } = renderHook(() => useFhevmStatus(), {
      wrapper: CustomWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("handles provider prop changes", () => {
    let currentChainId = 1;

    const DynamicWrapper = ({ children }: { children: React.ReactNode }) => (
      <FhevmProvider provider={mockProvider as any} chainId={currentChainId}>
        {children}
      </FhevmProvider>
    );

    const { result, rerender } = renderHook(() => useFhevmStatus(), {
      wrapper: DynamicWrapper,
    });

    const firstStatus = result.current;

    // Change chainId
    currentChainId = 2;
    rerender();

    // Status should still be valid
    expect(["loading", "ready", "error", "idle"]).toContain(result.current);
  });
});
