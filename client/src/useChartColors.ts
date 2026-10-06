import { useMemo } from "react";
import { tipoColor, TIPO_ORDER } from "./palette";
import { useTheme } from "./theme";

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
// read from the active theme's CSS variables and recomputed when the theme changes.
export function useChartColors(): ChartColors {
  const { resolved } = useTheme();
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const dark = resolved === "dark";
    const tipo: Record<string, string> = {};
    for (const name of TIPO_ORDER) tipo[name] = tipoColor(name, resolved);
    return {
      primary: cssVar(style, "--primary", dark ? "#3dce7a" : "#00843d"),
      warning: cssVar(style, "--warning", dark ? "#fbbf24" : "#d97706"),
      danger: cssVar(style, "--destructive", dark ? "#f87171" : "#b91c1c"),
      muted: cssVar(style, "--muted", dark ? "#1c2620" : "#f4f4f5"),
      grid: cssVar(style, "--border", dark ? "#2a3830" : "#e7e5e4"),
      axis: cssVar(style, "--muted-foreground", dark ? "#a1a1aa" : "#52525b"),
      surface: cssVar(style, "--card", dark ? "#141c18" : "#ffffff"),
      tipo,
    };
  }, [resolved]);
}
