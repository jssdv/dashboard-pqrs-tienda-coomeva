import type { PqrCase } from "./types.js";

const SIN_VALOR = "(sin valor)";

export interface CloseRate {
  tipo: string;
  entrados: number;
  cerrados: number;
  tasa: number;
}

export function closeRates(cases: readonly PqrCase[]): CloseRate[] {
  const buckets = new Map<string, { entrados: number; cerrados: number }>();
  for (const row of cases) {
    const tipo = row.tipo === null ? SIN_VALOR : row.tipo;
    const bucket = buckets.get(tipo) ?? { entrados: 0, cerrados: 0 };
    bucket.entrados += 1;
    if (row.fechaSolucion !== null) bucket.cerrados += 1;
    buckets.set(tipo, bucket);
  }
  return [...buckets.entries()]
    .map(([tipo, bucket]) => ({
      tipo,
      entrados: bucket.entrados,
      cerrados: bucket.cerrados,
      tasa: bucket.cerrados / bucket.entrados,
    }))
    .sort((a, b) => b.entrados - a.entrados || a.tipo.localeCompare(b.tipo));
}
