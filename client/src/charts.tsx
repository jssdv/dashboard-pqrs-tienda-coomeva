import { useEffect, useState, type ReactNode } from "react";

import type { ChartColors } from "./useChartColors";

export const axisTick = (colors: ChartColors) => ({ fontSize: 12, fill: colors.axis }) as const;

export function useMotion() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setOn(!media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return on;
}

export function ChartTip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">{children}</div>
  );
}

export function Meter({ value, max }: { value: number; max: number }) {
  return (
    <div className="mt-1 h-1.5 overflow-hidden bg-muted">
      <div
        className="grow-x h-full w-full origin-left bg-primary"
        style={{ transform: `scaleX(${max === 0 ? 0 : value / max})` }}
      />
    </div>
  );
}
