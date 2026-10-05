import { closeRates, type CloseRate } from "./closeRate.js";
import { bogotaToday, openQueue } from "./openQueue.js";
import { providerTypeMatrix, type MatrixRow } from "./providerTypeMatrix.js";
import { riskOf } from "./risk.js";
import type { CatalogField, PqrCase } from "./types.js";

export interface CountBucket {
  key: string;
  count: number;
}

export interface MonthFlow {
  mes: string;
  entrados: number;
  cerrados: number;
}

export interface AgingBucket {
  key: "0-5" | "6-10" | "mas-10";
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
  flujoPorMes: MonthFlow[];
  antiguedad: AgingBucket[] | null;
  abiertosPorArea: CountBucket[];
  abiertosPorTema: CountBucket[];
  dias: { casos: number; promedio: number | null };
  colaVencida: number | null;
  colaError: string | null;
  cierrePorTipo: CloseRate[];
  sinFechaValida: number;
  matrizProveedorTipo: MatrixRow[];
}

const SIN_VALOR = "(sin valor)";

function monthOf(iso: string | null, invalid: boolean): string | null {
  if (iso === null || invalid) return null;
  return iso.slice(0, 7);
}

function monthFlow(cases: readonly PqrCase[]): MonthFlow[] {
  const months = new Map<string, { entrados: number; cerrados: number }>();
  const bump = (mes: string, field: "entrados" | "cerrados") => {
    const row = months.get(mes) ?? { entrados: 0, cerrados: 0 };
    row[field] += 1;
    months.set(mes, row);
  };
  for (const row of cases) {
    const entrada = monthOf(row.fechaInicial, row.fechaInicialInvalida);
    if (entrada) bump(entrada, "entrados");
    const cierre = monthOf(row.fechaSolucion, row.fechaSolucionInvalida);
    if (cierre) bump(cierre, "cerrados");
  }
  return [...months.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([mes, counts]) => ({ mes, entrados: counts.entrados, cerrados: counts.cerrados }));
}

function agingBuckets(
  cases: readonly PqrCase[],
  holidays: readonly string[],
  today: string,
): AgingBucket[] {
  const counts = { "0-5": 0, "6-10": 0, "mas-10": 0 };
  const bucket = { "en-plazo": "0-5", "por-vencer": "6-10", vencido: "mas-10" } as const;
  for (const row of cases) {
    const risk = riskOf(row, holidays, today);
    if (risk) counts[bucket[risk.estado]] += 1;
  }
  return [
    { key: "0-5", count: counts["0-5"] },
    { key: "6-10", count: counts["6-10"] },
    { key: "mas-10", count: counts["mas-10"] },
  ];
}

function catalogBuckets(cases: readonly PqrCase[], field: CatalogField): CountBucket[] {
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

export function summarize(
  cases: PqrCase[],
  clock: { holidays: readonly string[]; today: string } = { holidays: [], today: bogotaToday() },
): DashboardSummary {
  let colaVencida: number | null = null;
  let colaError: string | null = null;
  let antiguedad: AgingBucket[] | null = null;
  try {
    colaVencida = openQueue(cases, clock.holidays, clock.today).length;
    antiguedad = agingBuckets(cases, clock.holidays, clock.today);
  } catch (error) {
    colaError = error instanceof Error ? error.message : String(error);
  }
  const abiertosCasos = cases.filter((row) => row.fechaSolucion === null);
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
    flujoPorMes: monthFlow(cases),
    antiguedad,
    abiertosPorArea: catalogBuckets(abiertosCasos, "area"),
    abiertosPorTema: catalogBuckets(abiertosCasos, "tema"),
    dias: { casos, promedio },
    colaVencida,
    colaError,
    cierrePorTipo: closeRates(cases),
    sinFechaValida: abiertosCasos.filter(
      (row) => row.fechaInicial === null || row.fechaInicialInvalida,
    ).length,
    matrizProveedorTipo: providerTypeMatrix(cases),
  };
}
