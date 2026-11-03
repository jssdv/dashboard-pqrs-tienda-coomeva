import type { PqrCase } from "./types.js";

export interface Scorecard {
  cerrados: number;
  /** Porcentaje (0-100) de casos cerrados después del plazo, null sin cierres. */
  fueraDePlazoPct: number | null;
  /** Casos del mismo asociado y tema que ya había reclamado antes al proveedor. */
  reincidentes: number;
  causas: Array<{ key: string; count: number }>;
}

export function providerScorecard(cases: readonly PqrCase[], plazo: number): Scorecard {
  const closed = cases.filter((row) => row.fechaSolucion !== null && !row.fechaSolucionInvalida);
  const late = closed.filter((row) => row.diasSolucion !== null && row.diasSolucion > plazo).length;
  const seen = new Map<string, number>();
  for (const row of cases) {
    if (!row.asociado || !row.tema) continue;
    const key = `${row.asociado.trim().toLowerCase()}|${row.tema}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const causes = new Map<string, number>();
  for (const row of closed) {
    if (row.causaRaiz) causes.set(row.causaRaiz, (causes.get(row.causaRaiz) ?? 0) + 1);
  }
  return {
    cerrados: closed.length,
    fueraDePlazoPct: closed.length === 0 ? null : Math.round((late / closed.length) * 100),
    reincidentes: [...seen.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0),
    causas: [...causes.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "es")),
  };
}
