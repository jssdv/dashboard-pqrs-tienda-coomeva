import { useEffect, useState, type ReactNode } from "react";

// SVG presentation attributes do not resolve var(--token), so these mirror
// --primary, --warning, --border and --muted-foreground from index.css.
export const PRIMARY = "#00843d";
export const WARNING = "#d97706";
export const GRID = "#e7e5e4";
export const AXIS = { fontSize: 12, fill: "#52525b" } as const;

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
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full w-full origin-left bg-primary"
        style={{ transform: `scaleX(${max === 0 ? 0 : value / max})` }}
      />
    </div>
  );
}
