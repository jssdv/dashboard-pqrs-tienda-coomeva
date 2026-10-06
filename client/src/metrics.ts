export function deltaPct(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function tasaCierre(point: { entrados: number; cerrados: number }): number | null {
  return point.entrados === 0 ? null : point.cerrados / point.entrados;
}
