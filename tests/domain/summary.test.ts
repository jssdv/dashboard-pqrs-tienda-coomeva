import { describe, expect, it } from "vitest";
import { summarize } from "../../src/domain/summary";
import type { PqrCase } from "../../src/domain/types";

function caso(over: Partial<PqrCase> & Pick<PqrCase, "id" | "sheetYear" | "rowNumber">): PqrCase {
  return {
    fechaInicial: "2026-01-05",
    fechaSolucion: "2026-01-06",
    fechaInicialInvalida: false,
    fechaSolucionInvalida: false,
    diasSolucion: 1,
    area: "Coomeva Recreacion",
    areaOriginal: "Coomeva Recreacion",
    idOrden: null,
    asociado: null,
    correo: null,
    fuente: "Correo Tienda",
    fuenteOriginal: "Correo Tienda",
    tipo: "RECLAMO",
    tipoOriginal: "RECLAMO",
    tema: "BOLETERIA",
    temaOriginal: "BOLETERIA",
    motivo: null,
    solucion: null,
    valorDevolucion: null,
    mesCompra: null,
    tipoDevolucion: null,
    fechaSolicitud: null,
    observaciones: null,
    ...over,
  };
}

describe("summarize totals", () => {
  it("returns zeros and a null average for an empty list", () => {
    const summary = summarize([]);
    expect(summary.total).toBe(0);
    expect(summary.abiertos).toBe(0);
    expect(summary.cerrados).toBe(0);
    expect(summary.fechasInvalidas).toBe(0);
    expect(summary.dias).toEqual({ casos: 0, promedio: null });
  });

  it("counts open, closed, and invalid dates", () => {
    const cases = [
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, fechaSolucion: null, diasSolucion: null }),
      caso({ id: "2026-3", sheetYear: 2026, rowNumber: 3 }),
      caso({
        id: "2025-4",
        sheetYear: 2025,
        rowNumber: 4,
        fechaInicialInvalida: true,
        fechaSolucion: null,
        diasSolucion: null,
      }),
    ];
    const summary = summarize(cases);
    expect(summary.total).toBe(3);
    expect(summary.abiertos).toBe(2);
    expect(summary.cerrados).toBe(1);
    expect(summary.fechasInvalidas).toBe(1);
  });
});

describe("summarize catalogs and years", () => {
  it("buckets official text, labels nulls, and sorts years ascending", () => {
    const cases = [
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, tema: null, area: "B" }),
      caso({ id: "2026-3", sheetYear: 2026, rowNumber: 3, tema: "BOLETERIA", area: "A" }),
      caso({ id: "2025-4", sheetYear: 2025, rowNumber: 4, tema: "BOLETERIA", area: "A", fuente: null }),
    ];
    const summary = summarize(cases);
    expect(summary.porTema).toEqual([
      { key: "BOLETERIA", count: 2 },
      { key: "(sin valor)", count: 1 },
    ]);
    expect(summary.porArea).toEqual([
      { key: "A", count: 2 },
      { key: "B", count: 1 },
    ]);
    expect(summary.porFuente).toEqual([
      { key: "Correo Tienda", count: 2 },
      { key: "(sin valor)", count: 1 },
    ]);
    expect(summary.porTipo).toEqual([{ key: "RECLAMO", count: 3 }]);
    expect(summary.porAnio).toEqual([
      { key: "2025", count: 1 },
      { key: "2026", count: 2 },
    ]);
  });

  it("breaks catalog ties by key ascending", () => {
    const cases = [
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, tipo: "Z" }),
      caso({ id: "2026-3", sheetYear: 2026, rowNumber: 3, tipo: "A" }),
    ];
    expect(summarize(cases).porTipo).toEqual([
      { key: "A", count: 1 },
      { key: "Z", count: 1 },
    ]);
  });
});
