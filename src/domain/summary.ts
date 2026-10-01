import type { CatalogField, PqrCase } from "./types.js";

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

const SIN_VALOR = "(sin valor)";

function catalogBuckets(cases: PqrCase[], field: CatalogField): CountBucket[] {
  const counts = new Map<string, number>();
  for (const row of cases) {
    const raw = row[field];
    const key = raw === null ? SIN_VALOR : raw;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function summarize(cases: PqrCase[]): DashboardSummary {
  const total = cases.length;
  const abiertos = cases.filter((row) => row.fechaSolucion === null).length;
  const fechasInvalidas = cases.filter(
    (row) => row.fechaInicialInvalida || row.fechaSolucionInvalida,
  ).length;

  const years = new Map<number, number>();
  for (const row of cases) {
    years.set(row.sheetYear, (years.get(row.sheetYear) ?? 0) + 1);
  }
  const porAnio = [...years.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ key: String(year), count }));

  const months = new Map<string, number>();
  for (const row of cases) {
    if (row.fechaInicial === null || row.fechaInicialInvalida) continue;
    const month = row.fechaInicial.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  const porMes = [...months.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));

  const withDays = cases.filter(
    (row) =>
      !row.fechaInicialInvalida && !row.fechaSolucionInvalida && row.diasSolucion !== null,
  );
  const casos = withDays.length;
  const promedio =
    casos === 0
      ? null
      : withDays.reduce((sum, row) => sum + (row.diasSolucion as number), 0) / casos;

  return {
    total,
    abiertos,
    cerrados: total - abiertos,
    fechasInvalidas,
    porAnio,
    porArea: catalogBuckets(cases, "area"),
    porFuente: catalogBuckets(cases, "fuente"),
    porTipo: catalogBuckets(cases, "tipo"),
    porTema: catalogBuckets(cases, "tema"),
    porMes,
    dias: { casos, promedio },
  };
}
