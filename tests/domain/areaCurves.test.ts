import { describe, expect, it } from "vitest";
import { areaCurves } from "../../src/domain/areaCurves";
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

describe("areaCurves", () => {
  it("accumulates valid start months by area and official type", () => {
    const curves = areaCurves([
      caso({ id: "1", fechaInicial: "2026-01-05", tipo: "RECLAMO" }),
      caso({ id: "2", fechaInicial: "2026-03-02", tipo: "RECLAMO" }),
      caso({ id: "3", fechaInicial: "2026-01-20", tipo: "QUEJA" }),
      caso({ id: "4", fechaInicial: null, fechaInicialInvalida: true, tipo: "RECLAMO" }),
      caso({ id: "5", area: null, tipo: null, fechaInicial: "2026-02-02" }),
    ]);
    expect(curves).toEqual([
      {
        area: "(sin valor)",
        series: [{ tipo: "(sin valor)", points: [{ mes: "2026-02", acumulado: 1 }] }],
      },
      {
        area: "A",
        series: [
          {
            tipo: "QUEJA",
            points: [
              { mes: "2026-01", acumulado: 1 },
              { mes: "2026-03", acumulado: 1 },
            ],
          },
          {
            tipo: "RECLAMO",
            points: [
              { mes: "2026-01", acumulado: 1 },
              { mes: "2026-03", acumulado: 2 },
            ],
          },
        ],
      },
    ]);
  });
});
