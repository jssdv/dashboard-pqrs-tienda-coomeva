import { useMemo } from "react";
import { tipoColor, TIPO_ORDER } from "./palette";

export interface ChartColors {
  primary: string;
  warning: string;
  danger: string;
  muted: string;
  grid: string;
  axis: string;
  surface: string;
  tipo: Record<string, string>;
}

function cssVar(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim();
  return value || fallback;
}

// SVG presentation attributes do not resolve var(--token), so chart colors are
// read from the theme's CSS variables.
export function useChartColors(): ChartColors {
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const tipo: Record<string, string> = {};
    for (const name of TIPO_ORDER) tipo[name] = tipoColor(name);
    return {
      primary: cssVar(style, "--primary", "#00843d"),
      warning: cssVar(style, "--warning", "#d97706"),
      danger: cssVar(style, "--destructive", "#b91c1c"),
      muted: cssVar(style, "--muted", "#f4f4f5"),
      grid: cssVar(style, "--border", "#e7e5e4"),
      axis: cssVar(style, "--muted-foreground", "#52525b"),
      surface: cssVar(style, "--card", "#ffffff"),
      tipo,
    };
  }, []);
}
