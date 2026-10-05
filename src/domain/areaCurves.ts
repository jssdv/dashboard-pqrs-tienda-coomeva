import type { PqrCase } from "./types.js";

const SIN_VALOR = "(sin valor)";

export interface CurvePoint {
  mes: string;
  acumulado: number;
}

export interface CurveSeries {
  tipo: string;
  points: CurvePoint[];
}

export interface AreaCurve {
  area: string;
  series: CurveSeries[];
}

export function areaCurves(cases: readonly PqrCase[]): AreaCurve[] {
  const areas = new Map<string, Map<string, Map<string, number>>>();
  for (const row of cases) {
    if (row.fechaInicial === null || row.fechaInicialInvalida) continue;
    const area = row.area ?? SIN_VALOR;
    const tipo = row.tipo ?? SIN_VALOR;
    const mes = row.fechaInicial.slice(0, 7);
    const tipos = areas.get(area) ?? new Map<string, Map<string, number>>();
    const months = tipos.get(tipo) ?? new Map<string, number>();
    months.set(mes, (months.get(mes) ?? 0) + 1);
    tipos.set(tipo, months);
    areas.set(area, tipos);
  }

  return [...areas.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([area, tipos]) => {
      const months = [...new Set([...tipos.values()].flatMap((counts) => [...counts.keys()]))].sort();
      const series = [...tipos.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([tipo, counts]) => {
          let acumulado = 0;
          return {
            tipo,
            points: months.map((mes) => {
              acumulado += counts.get(mes) ?? 0;
              return { mes, acumulado };
            }),
          };
        });
      return { area, series };
    });
}
