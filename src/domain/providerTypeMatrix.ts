import type { PqrCase } from "./types.js";

const SIN_VALOR = "(sin valor)";

export interface MatrixCell {
  tipo: string;
  total: number;
  abiertos: number;
}

export interface MatrixRow {
  area: string;
  total: number;
  abiertos: number;
  celdas: MatrixCell[];
}

export function providerTypeMatrix(cases: readonly PqrCase[]): MatrixRow[] {
  const areas = new Map<string, Map<string, { total: number; abiertos: number }>>();
  const tipos = new Set<string>();
  for (const row of cases) {
    const area = row.area ?? SIN_VALOR;
    const tipo = row.tipo ?? SIN_VALOR;
    tipos.add(tipo);
    const cells = areas.get(area) ?? new Map<string, { total: number; abiertos: number }>();
    const cell = cells.get(tipo) ?? { total: 0, abiertos: 0 };
    cell.total += 1;
    if (row.fechaSolucion === null) cell.abiertos += 1;
    cells.set(tipo, cell);
    areas.set(area, cells);
  }
  const columns = [...tipos].sort((a, b) => a.localeCompare(b));
  return [...areas.entries()]
    .map(([area, cells]) => {
      const celdas = columns.map((tipo) => ({
        tipo,
        total: cells.get(tipo)?.total ?? 0,
        abiertos: cells.get(tipo)?.abiertos ?? 0,
      }));
      return {
        area,
        total: celdas.reduce((sum, cell) => sum + cell.total, 0),
        abiertos: celdas.reduce((sum, cell) => sum + cell.abiertos, 0),
        celdas,
      };
    })
    .sort((a, b) => b.total - a.total || a.area.localeCompare(b.area));
}
