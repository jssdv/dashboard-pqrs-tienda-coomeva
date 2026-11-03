import type { PqrCase } from "./types.js";

const SIN_VALOR = "(sin valor)";

export interface TimelinePoint {
  mes: string;
  entrados: number;
  cerrados: number;
  diasPromedio: number | null;
}

export function providerTimeline(cases: readonly PqrCase[], area: string): TimelinePoint[] {
  const months = new Map<string, { entrados: number; cerrados: number; dias: number[] }>();
  const bucket = (mes: string) => {
    const found = months.get(mes) ?? { entrados: 0, cerrados: 0, dias: [] };
    months.set(mes, found);
    return found;
  };
  for (const row of cases) {
    if ((row.area ?? SIN_VALOR) !== area) continue;
    if (row.fechaInicial !== null && !row.fechaInicialInvalida) {
      bucket(row.fechaInicial.slice(0, 7)).entrados += 1;
    }
    if (row.fechaSolucion !== null && !row.fechaSolucionInvalida) {
      const found = bucket(row.fechaSolucion.slice(0, 7));
      found.cerrados += 1;
      if (row.diasSolucion !== null) found.dias.push(row.diasSolucion);
    }
  }
  return [...months.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, found]) => ({
      mes,
      entrados: found.entrados,
      cerrados: found.cerrados,
      diasPromedio:
        found.dias.length === 0 ? null : found.dias.reduce((sum, n) => sum + n, 0) / found.dias.length,
    }));
}
