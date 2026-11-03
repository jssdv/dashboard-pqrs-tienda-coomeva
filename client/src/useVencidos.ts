import { useEffect, useState } from "react";
import { getSummary } from "./api";

export function useVencidos(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSummary().then(
      (summary) => {
        if (!cancelled) setCount(summary.colaVencida);
      },
      () => {
        if (!cancelled) setCount(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return count;
}
