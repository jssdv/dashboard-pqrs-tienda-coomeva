// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { tipoColor, TIPO_ORDER } from "./palette";
import { THEME_KEY } from "./theme";
import { useChartColors } from "./useChartColors";

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("style");
  localStorage.clear();
});

it("assigns five distinct colors per mode in a fixed order", () => {
  for (const mode of ["light", "dark"] as const) {
    const colors = TIPO_ORDER.map((tipo) => tipoColor(tipo, mode));
    expect(new Set(colors).size).toBe(5);
  }
  expect(tipoColor("SOLICITUD", "light")).toBe("#2a78d6");
});

it("gives unknown or empty types the neutral gray, never a generated hue", () => {
  expect(tipoColor("OTRO", "light")).toBe("#8b8a85");
  expect(tipoColor(null, "dark")).toBe("#8a948e");
});

it("reads the active theme's CSS variables", () => {
  document.documentElement.style.setProperty("--primary", "#112233");
  const { result } = renderHook(() => useChartColors());
  expect(result.current.primary).toBe("#112233");
  expect(result.current.tipo.RECLAMO).toBe(tipoColor("RECLAMO", "light"));
});

it("recomputes when the theme changes", () => {
  document.documentElement.style.setProperty("--primary", "#112233");
  const { result, rerender } = renderHook(() => useChartColors());
  expect(result.current.tipo.SOLICITUD).toBe("#2a78d6");
  localStorage.setItem(THEME_KEY, "dark");
  window.dispatchEvent(new CustomEvent("pqr-theme-change", { detail: "dark" }));
  rerender();
  expect(result.current.tipo.SOLICITUD).toBe("#3987e5");
});
