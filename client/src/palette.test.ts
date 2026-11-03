// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { tipoColor, TIPO_ORDER } from "./palette";
import { useChartColors } from "./useChartColors";

beforeEach(() => {
  document.documentElement.removeAttribute("style");
});

it("assigns five distinct colors in a fixed order", () => {
  expect(new Set(TIPO_ORDER.map((tipo) => tipoColor(tipo))).size).toBe(5);
  expect(tipoColor("SOLICITUD")).toBe("#2a78d6");
});

it("gives unknown or empty types the neutral gray, never a generated hue", () => {
  expect(tipoColor("OTRO")).toBe("#8b8a85");
  expect(tipoColor(null)).toBe("#8b8a85");
});

it("reads the theme's CSS variables", () => {
  document.documentElement.style.setProperty("--primary", "#112233");
  const { result } = renderHook(() => useChartColors());
  expect(result.current.primary).toBe("#112233");
  expect(result.current.tipo.RECLAMO).toBe(tipoColor("RECLAMO"));
});
