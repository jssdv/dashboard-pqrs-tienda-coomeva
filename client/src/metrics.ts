export function deltaPct(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function tasaCierre(point: { entrados: number; cerrados: number }): number | null {
  return point.entrados === 0 ? null : point.cerrados / point.entrados;
}

export function bogotaMonth(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit" })
    .format(now)
    .slice(0, 7);
}

export function completeMonths<T extends { mes: string }>(serie: readonly T[], currentMonth: string): T[] {
  const last = serie[serie.length - 1];
  return last && last.mes === currentMonth ? serie.slice(0, -1) : [...serie];
}
