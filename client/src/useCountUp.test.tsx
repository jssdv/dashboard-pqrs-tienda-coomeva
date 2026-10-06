// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { formatCount, parseCount, useCountUp } from "./useCountUp";

function stubMotion(reduced: boolean | "absent") {
  if (reduced === "absent") {
    vi.stubGlobal("matchMedia", undefined);
    return;
  }
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduced, addEventListener: () => {}, removeEventListener: () => {} })),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("returns the target immediately when matchMedia is unavailable", () => {
  stubMotion("absent");
  expect(renderHook(() => useCountUp(245)).result.current).toBe(245);
});

it("returns the target immediately with prefers-reduced-motion", () => {
  stubMotion(true);
  expect(renderHook(() => useCountUp(245)).result.current).toBe(245);
});

it("counts up from 0 to the target in about 600 ms, never overshooting", () => {
  stubMotion(false);
  const { result } = renderHook(() => useCountUp(100));
  expect(result.current).toBe(0);
  const seen: number[] = [];
  for (let step = 0; step < 8; step += 1) {
    act(() => {
      vi.advanceTimersByTime(100);
    });
    seen.push(result.current);
  }
  expect(seen[seen.length - 1]).toBe(100);
  expect(Math.max(...seen)).toBeLessThanOrEqual(100);
  for (let i = 1; i < seen.length; i += 1) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
  expect(seen[1]).toBeGreaterThan(0);
  expect(seen[1]).toBeLessThan(100);
});

it("animates from the previous value when the target changes", () => {
  stubMotion(false);
  const { result, rerender } = renderHook(({ target }) => useCountUp(target), { initialProps: { target: 10 } });
  act(() => {
    vi.advanceTimersByTime(700);
  });
  expect(result.current).toBe(10);
  rerender({ target: 50 });
  act(() => {
    vi.advanceTimersByTime(100);
  });
  expect(result.current).toBeGreaterThan(10);
  expect(result.current).toBeLessThan(50);
  act(() => {
    vi.advanceTimersByTime(700);
  });
  expect(result.current).toBe(50);
});

it("parseCount splits the number from its suffix and keeps the decimals", () => {
  expect(parseCount("245")).toEqual({ n: 245, decimals: 0, suffix: "" });
  expect(parseCount("89.6%")).toEqual({ n: 89.6, decimals: 1, suffix: "%" });
  expect(parseCount("13.1")).toEqual({ n: 13.1, decimals: 1, suffix: "" });
  expect(parseCount("—")).toBeNull();
  expect(parseCount("Sin festivos")).toBeNull();
});

it("formatCount rounds to the original decimals and re-attaches the suffix", () => {
  expect(formatCount(89.5999, 1, "%")).toBe("89.6%");
  expect(formatCount(12.4, 0, "")).toBe("12");
});
