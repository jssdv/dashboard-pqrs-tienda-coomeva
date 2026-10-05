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

describe("summarize months and days", () => {
  it("groups valid start months ascending and ignores invalid or null starts", () => {
    const cases = [
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, fechaInicial: "2026-03-01" }),
      caso({ id: "2026-3", sheetYear: 2026, rowNumber: 3, fechaInicial: "2026-01-15" }),
      caso({ id: "2026-4", sheetYear: 2026, rowNumber: 4, fechaInicial: "2026-01-20" }),
      caso({
        id: "2026-5",
        sheetYear: 2026,
        rowNumber: 5,
        fechaInicial: "1999-01-01",
        fechaInicialInvalida: true,
      }),
      caso({ id: "2026-6", sheetYear: 2026, rowNumber: 6, fechaInicial: null }),
    ];
    expect(summarize(cases).porMes).toEqual([
      { key: "2026-01", count: 2 },
      { key: "2026-03", count: 1 },
    ]);
  });

  it("averages days only when both dates are valid and diasSolucion is set", () => {
    const cases = [
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, diasSolucion: 1 }),
      caso({ id: "2026-3", sheetYear: 2026, rowNumber: 3, diasSolucion: 3 }),
      caso({
        id: "2026-4",
        sheetYear: 2026,
        rowNumber: 4,
        fechaSolucionInvalida: true,
        diasSolucion: 9,
      }),
      caso({ id: "2026-5", sheetYear: 2026, rowNumber: 5, diasSolucion: null }),
    ];
    expect(summarize(cases).dias).toEqual({ casos: 2, promedio: 2 });
  });

  it("counts the open queue only when holidays and a Bogotá date are provided", () => {
    const summary = summarize(
      [caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, fechaSolucion: null, diasSolucion: null })],
      { holidays: ["2026-01-01"], today: "2026-01-19" },
    );
    expect(summary.colaVencida).toBe(1);
    expect(summary.colaError).toBeNull();
    expect(summary.antiguedad).toEqual([
      { key: "0-5", count: 0 },
      { key: "6-10", count: 0 },
      { key: "mas-10", count: 1 },
    ]);
    expect(summary.cierrePorTipo).toEqual([
      { tipo: "RECLAMO", entrados: 1, cerrados: 0, tasa: 0 },
    ]);
  });

  it("leaves aging empty when holidays are missing", () => {
    const summary = summarize([
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, fechaSolucion: null, diasSolucion: null }),
    ]);
    expect(summary.colaVencida).toBeNull();
    expect(summary.antiguedad).toBeNull();
    expect(summary.colaError).toBeTruthy();
  });
});

describe("summarize open work", () => {
  it("splits entries and closures by month and ignores invalid dates", () => {
    const cases = [
      caso({
        id: "2026-2",
        sheetYear: 2026,
        rowNumber: 2,
        fechaInicial: "2026-01-05",
        fechaSolucion: "2026-02-02",
      }),
      caso({
        id: "2026-3",
        sheetYear: 2026,
        rowNumber: 3,
        fechaInicial: "2026-01-20",
        fechaSolucion: null,
        diasSolucion: null,
      }),
      caso({
        id: "2026-4",
        sheetYear: 2026,
        rowNumber: 4,
        fechaInicial: "2026-03-01",
        fechaInicialInvalida: true,
        fechaSolucion: "2026-03-02",
        fechaSolucionInvalida: true,
      }),
    ];
    expect(summarize(cases).flujoPorMes).toEqual([
      { mes: "2026-01", entrados: 2, cerrados: 0 },
      { mes: "2026-02", entrados: 0, cerrados: 1 },
    ]);
  });

  it("ages only open cases with a valid start date", () => {
    const holidays = ["2026-01-01"];
    const today = "2026-01-20";
    const cases = [
      caso({
        id: "recent",
        sheetYear: 2026,
        rowNumber: 2,
        fechaInicial: "2026-01-20",
        fechaSolucion: null,
        diasSolucion: null,
      }),
      caso({
        id: "risk",
        sheetYear: 2026,
        rowNumber: 3,
        fechaInicial: "2026-01-12",
        fechaSolucion: null,
        diasSolucion: null,
      }),
      caso({
        id: "late",
        sheetYear: 2026,
        rowNumber: 4,
        fechaInicial: "2026-01-05",
        fechaSolucion: null,
        diasSolucion: null,
      }),
      caso({
        id: "closed",
        sheetYear: 2026,
        rowNumber: 5,
        fechaInicial: "2026-01-05",
        fechaSolucion: "2026-01-06",
      }),
      caso({
        id: "invalid",
        sheetYear: 2026,
        rowNumber: 6,
        fechaInicial: "2026-01-05",
        fechaInicialInvalida: true,
        fechaSolucion: null,
        diasSolucion: null,
      }),
    ];
    expect(summarize(cases, { holidays, today }).antiguedad).toEqual([
      { key: "0-5", count: 1 },
      { key: "6-10", count: 1 },
      { key: "mas-10", count: 1 },
    ]);
  });

  it("counts area and theme only for open cases", () => {
    const cases = [
      caso({
        id: "open-b",
        sheetYear: 2026,
        rowNumber: 2,
        fechaSolucion: null,
        diasSolucion: null,
        area: "B",
        tema: "CINE",
      }),
      caso({
        id: "open-b2",
        sheetYear: 2026,
        rowNumber: 3,
        fechaSolucion: null,
        diasSolucion: null,
        area: "B",
        tema: null,
      }),
      caso({ id: "closed-a", sheetYear: 2026, rowNumber: 4, area: "A", tema: "CINE" }),
    ];
    const summary = summarize(cases);
    expect(summary.abiertosPorArea).toEqual([{ key: "B", count: 2 }]);
    expect(summary.abiertosPorTema).toEqual([
      { key: "(sin valor)", count: 1 },
      { key: "CINE", count: 1 },
    ]);
    expect(summary.porArea).toEqual([
      { key: "B", count: 2 },
      { key: "A", count: 1 },
    ]);
  });
});

describe("summarize matrizProveedorTipo", () => {
  it("includes the provider by type matrix", () => {
    expect(summarize([]).matrizProveedorTipo).toEqual([]);
  });
});

describe("summarize sinFechaValida", () => {
  it("counts open cases without a usable start date", () => {
    const open = { fechaSolucion: null, diasSolucion: null };
    const result = summarize([
      caso({ id: "a", sheetYear: 2026, rowNumber: 2, ...open, fechaInicial: null }),
      caso({ id: "b", sheetYear: 2026, rowNumber: 3, ...open, fechaInicialInvalida: true }),
      caso({ id: "c", sheetYear: 2026, rowNumber: 4, ...open }),
      caso({ id: "d", sheetYear: 2026, rowNumber: 5, fechaInicial: null }),
    ]);
    expect(result.sinFechaValida).toBe(2);
    expect(summarize([]).sinFechaValida).toBe(0);
  });
});
