import { describe, expect, it } from "vitest";
import { closeRates } from "../../src/domain/closeRate";
import type { PqrCase } from "../../src/domain/types";

function caso(over: Partial<PqrCase> & Pick<PqrCase, "id">): PqrCase {
  return {
    sheetYear: 2026,
    rowNumber: 2,
    fechaInicial: "2026-01-05",
    fechaSolucion: null,
    fechaInicialInvalida: false,
    fechaSolucionInvalida: false,
    diasSolucion: null,
    area: "A",
    areaOriginal: "A",
    idOrden: null,
    asociado: null,
    correo: null,
    fuente: null,
    fuenteOriginal: null,
    tipo: "RECLAMO",
    tipoOriginal: "RECLAMO",
    tema: null,
    temaOriginal: null,
    motivo: null,
    solucion: null,
    ...over,
  };
}

describe("closeRates", () => {
  it("divides closed cases by the official type total and labels an empty type", () => {
    const rates = closeRates([
      caso({ id: "1", tipo: "RECLAMO", fechaSolucion: "2026-01-06" }),
      caso({ id: "2", tipo: "RECLAMO" }),
      caso({ id: "3", tipo: null, fechaSolucion: "2026-01-08" }),
      caso({ id: "4", tipo: "QUEJA", fechaSolucion: null }),
    ]);
    expect(rates).toEqual([
      { tipo: "RECLAMO", entrados: 2, cerrados: 1, tasa: 0.5 },
      { tipo: "(sin valor)", entrados: 1, cerrados: 1, tasa: 1 },
      { tipo: "QUEJA", entrados: 1, cerrados: 0, tasa: 0 },
    ]);
  });
});
