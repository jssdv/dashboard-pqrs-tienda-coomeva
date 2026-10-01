import type { PqrCase } from "./types.js";

export interface CountBucket {
  key: string;
  count: number;
}

export interface DashboardSummary {
  total: number;
  abiertos: number;
  cerrados: number;
  fechasInvalidas: number;
  porAnio: CountBucket[];
  porArea: CountBucket[];
  porFuente: CountBucket[];
  porTipo: CountBucket[];
  porTema: CountBucket[];
  porMes: CountBucket[];
  dias: { casos: number; promedio: number | null };
}

const emptyBuckets = {
  porAnio: [] as CountBucket[],
  porArea: [] as CountBucket[],
  porFuente: [] as CountBucket[],
  porTipo: [] as CountBucket[],
  porTema: [] as CountBucket[],
  porMes: [] as CountBucket[],
  dias: { casos: 0, promedio: null as number | null },
};

export function summarize(cases: PqrCase[]): DashboardSummary {
  const total = cases.length;
  const abiertos = cases.filter((row) => row.fechaSolucion === null).length;
  const fechasInvalidas = cases.filter(
    (row) => row.fechaInicialInvalida || row.fechaSolucionInvalida,
  ).length;
  return {
    total,
    abiertos,
    cerrados: total - abiertos,
    fechasInvalidas,
    ...emptyBuckets,
  };
}
