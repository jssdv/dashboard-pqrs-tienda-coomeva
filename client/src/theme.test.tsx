// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { applyTheme, THEME_KEY, useTheme } from "./theme";

function stubSystem(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: dark, addEventListener: () => {}, removeEventListener: () => {} })),
  );
}

beforeEach(() => {
  document.documentElement.classList.remove("dark", "theme-switching");
  localStorage.clear();
  stubSystem(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("applyTheme toggles the dark class and returns the resolved theme", () => {
  expect(applyTheme("dark")).toBe("dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(applyTheme("light")).toBe("light");
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});

it("system follows prefers-color-scheme", () => {
  stubSystem(true);
  expect(applyTheme("system")).toBe("dark");
  stubSystem(false);
  expect(applyTheme("system")).toBe("light");
});

it("useTheme reads the stored mode and falls back to system for invalid values", () => {
  localStorage.setItem(THEME_KEY, "dark");
  expect(renderHook(() => useTheme()).result.current.mode).toBe("dark");
  cleanup();
  localStorage.setItem(THEME_KEY, "morado");
  expect(renderHook(() => useTheme()).result.current.mode).toBe("system");
});

it("setMode stores and applies the mode", () => {
  const { result } = renderHook(() => useTheme());
  act(() => result.current.setMode("dark"));
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  expect(result.current.resolved).toBe("dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});

it("keeps working when localStorage throws", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  });
  const { result } = renderHook(() => useTheme());
  expect(result.current.mode).toBe("system");
  act(() => result.current.setMode("dark"));
  expect(result.current.resolved).toBe("dark");
});

it("setMode marks the page as switching for about 300 ms, but the first apply does not", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useTheme());
  expect(document.documentElement.classList.contains("theme-switching")).toBe(false);
  act(() => result.current.setMode("dark"));
  expect(document.documentElement.classList.contains("theme-switching")).toBe(true);
  act(() => {
    vi.advanceTimersByTime(400);
  });
  expect(document.documentElement.classList.contains("theme-switching")).toBe(false);
  vi.useRealTimers();
});
