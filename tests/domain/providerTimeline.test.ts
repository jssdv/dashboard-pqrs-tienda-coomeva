import { describe, expect, it } from "vitest";
import { providerTimeline } from "../../src/domain/providerTimeline";
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

describe("providerTimeline", () => {
  it("counts entrados by start month and cerrados and average days by close month", () => {
    const points = providerTimeline(
      [
        caso({ id: "1", fechaInicial: "2026-01-05", fechaSolucion: "2026-02-03", diasSolucion: 4 }),
        caso({ id: "2", fechaInicial: "2026-01-20", fechaSolucion: "2026-02-10", diasSolucion: 6 }),
        caso({ id: "3", fechaInicial: "2026-02-02" }),
        caso({ id: "4", area: "Otro", fechaInicial: "2026-01-05" }),
      ],
      "Tienda",
    );
    expect(points).toEqual([
      { mes: "2026-01", entrados: 2, cerrados: 0, diasPromedio: null },
      { mes: "2026-02", entrados: 1, cerrados: 2, diasPromedio: 5 },
    ]);
  });

  it("ignores invalid dates", () => {
    const points = providerTimeline(
      [
        caso({ id: "1", fechaInicial: "1999-01-05", fechaInicialInvalida: true }),
        caso({
          id: "2",
          fechaInicial: "2026-01-05",
          fechaSolucion: "2999-01-01",
          fechaSolucionInvalida: true,
        }),
      ],
      "Tienda",
    );
    expect(points).toEqual([{ mes: "2026-01", entrados: 1, cerrados: 0, diasPromedio: null }]);
  });

  it("returns an empty list for an unknown provider", () => {
    expect(providerTimeline([caso({ id: "1" })], "Nadie")).toEqual([]);
  });

  it("selects cases with a null provider through (sin valor)", () => {
    const points = providerTimeline([caso({ id: "1", area: null })], "(sin valor)");
    expect(points).toHaveLength(1);
  });
});
