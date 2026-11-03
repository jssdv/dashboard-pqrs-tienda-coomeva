import { describe, expect, it } from "vitest";
import { monthSeries } from "../../src/domain/monthSeries";
import type { PqrCase } from "../../src/domain/types";

function caso(over: Partial<PqrCase> = {}): PqrCase {
  return {
    id: "2026-2",
    sheetYear: 2026,
    rowNumber: 2,
    fechaInicial: "2026-01-05",
    fechaSolucion: null,
    fechaInicialInvalida: false,
    fechaSolucionInvalida: false,
    diasSolucion: null,
    area: "Tienda",
    areaOriginal: "Tienda",
    idOrden: "1",
    asociado: "NOMBRE",
    correo: "a@b.co",
    fuente: "Correo Tienda",
    fuenteOriginal: "Correo Tienda",
    tipo: "RECLAMO",
    tipoOriginal: "RECLAMO",
    tema: "BOLETERIA",
    temaOriginal: "BOLETERIA",
    motivo: "texto",
    solucion: null,
    ...over,
  };
}

describe("monthSeries", () => {
  it("counts entrados and cerrados per month with running open balance and average days", () => {
    const points = monthSeries([
      caso({ id: "1", fechaInicial: "2026-01-05", fechaSolucion: "2026-02-03", diasSolucion: 4 }),
      caso({ id: "2", fechaInicial: "2026-01-20", fechaSolucion: "2026-02-10", diasSolucion: 6 }),
      caso({ id: "3", fechaInicial: "2026-02-02" }),
    ]);
    expect(points).toEqual([
      { mes: "2026-01", entrados: 2, cerrados: 0, abiertosAlCierre: 2, diasPromedio: null },
      { mes: "2026-02", entrados: 1, cerrados: 2, abiertosAlCierre: 1, diasPromedio: 5 },
    ]);
  });

  it("fills months without movement so the series is contiguous", () => {
    const points = monthSeries([
      caso({ id: "1", fechaInicial: "2026-01-05" }),
      caso({ id: "2", fechaInicial: "2026-04-05" }),
    ]);
    expect(points.map((p) => p.mes)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(points[1]).toEqual({ mes: "2026-02", entrados: 0, cerrados: 0, abiertosAlCierre: 1, diasPromedio: null });
    expect(points[3].abiertosAlCierre).toBe(2);
  });

  it("ignores invalid dates", () => {
    const points = monthSeries([
      caso({ id: "1", fechaInicial: "1999-01-01", fechaInicialInvalida: true }),
      caso({ id: "2", fechaInicial: "2026-01-05", fechaSolucion: "2999-01-01", fechaSolucionInvalida: true }),
    ]);
    expect(points).toEqual([{ mes: "2026-01", entrados: 1, cerrados: 0, abiertosAlCierre: 1, diasPromedio: null }]);
  });

  it("returns an empty list without cases", () => {
    expect(monthSeries([])).toEqual([]);
  });
});
