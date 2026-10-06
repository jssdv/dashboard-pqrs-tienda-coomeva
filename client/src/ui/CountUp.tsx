import { formatCount, parseCount, useCountUp } from "../useCountUp";

export function CountUp({ value }: { value: string }) {
  const parsed = parseCount(value);
  const n = useCountUp(parsed?.n ?? 0);
  if (!parsed) return <>{value}</>;
  return <>{formatCount(n, parsed.decimals, parsed.suffix)}</>;
}
