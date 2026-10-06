import type { PqrCase } from "./types.js";

export interface MonthPoint {
  mes: string;
  entrados: number;
  cerrados: number;
  abiertosAlCierre: number;
  diasPromedio: number | null;
}

function nextMonth(mes: string): string {
  const [year, month] = mes.split("-").map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function monthSeries(cases: readonly PqrCase[]): MonthPoint[] {
  const months = new Map<string, { entrados: number; cerrados: number; dias: number[] }>();
  const bucket = (mes: string) => {
    const found = months.get(mes) ?? { entrados: 0, cerrados: 0, dias: [] };
    months.set(mes, found);
    return found;
  };
  for (const row of cases) {
    if (row.fechaInicial !== null && !row.fechaInicialInvalida) {
      bucket(row.fechaInicial.slice(0, 7)).entrados += 1;
    }
    if (row.fechaSolucion !== null && !row.fechaSolucionInvalida) {
      const found = bucket(row.fechaSolucion.slice(0, 7));
      found.cerrados += 1;
      if (row.diasSolucion !== null) found.dias.push(row.diasSolucion);
    }
  }
  const keys = [...months.keys()].sort();
  if (keys.length === 0) return [];
  const points: MonthPoint[] = [];
  let open = 0;
  for (let mes = keys[0]; mes <= keys[keys.length - 1]; mes = nextMonth(mes)) {
    const found = months.get(mes) ?? { entrados: 0, cerrados: 0, dias: [] };
    open += found.entrados - found.cerrados;
    points.push({
      mes,
      entrados: found.entrados,
      cerrados: found.cerrados,
      abiertosAlCierre: open,
      diasPromedio:
        found.dias.length === 0 ? null : found.dias.reduce((sum, n) => sum + n, 0) / found.dias.length,
    });
  }
  return points;
}
