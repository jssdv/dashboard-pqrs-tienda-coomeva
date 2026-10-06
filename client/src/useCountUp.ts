import { useEffect, useRef, useState } from "react";

function canAnimate(): boolean {
  return typeof window.matchMedia === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(() => (canAnimate() ? 0 : target));
  const from = useRef(value);

  useEffect(() => {
    if (!canAnimate()) {
      from.current = target;
      setValue(target);
      return;
    }
    const origin = from.current;
    let start: number | null = null;
    let frame = 0;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = t >= 1 ? target : origin + (target - origin) * eased;
      from.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

export function parseCount(text: string): { n: number; decimals: number; suffix: string } | null {
  const match = text.match(/^(-?\d+(?:\.(\d+))?)(.*)$/);
  if (!match) return null;
  return { n: Number(match[1]), decimals: match[2]?.length ?? 0, suffix: match[3] };
}

export function formatCount(n: number, decimals: number, suffix: string): string {
  return `${n.toFixed(decimals)}${suffix}`;
}
