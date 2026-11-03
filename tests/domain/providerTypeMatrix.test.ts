import { describe, expect, it } from "vitest";
import { providerTypeMatrix } from "../../src/domain/providerTypeMatrix";
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

describe("providerTypeMatrix", () => {
  it("counts total and open cases per provider and type", () => {
    const rows = providerTypeMatrix([
      caso({ id: "1", area: "A", tipo: "QUEJA" }),
      caso({ id: "2", area: "A", tipo: "QUEJA", fechaSolucion: "2026-01-06" }),
      caso({ id: "3", area: "A", tipo: "RECLAMO" }),
      caso({ id: "4", area: "B", tipo: "RECLAMO" }),
    ]);
    expect(rows.map((row) => row.area)).toEqual(["A", "B"]);
    expect(rows[0]).toEqual({
      area: "A",
      total: 3,
      abiertos: 2,
      celdas: [
        { tipo: "QUEJA", total: 2, abiertos: 1 },
        { tipo: "RECLAMO", total: 1, abiertos: 1 },
      ],
    });
  });

  it("fills missing cells with zeros so every row has the same columns", () => {
    const rows = providerTypeMatrix([
      caso({ id: "1", area: "A", tipo: "QUEJA" }),
      caso({ id: "2", area: "B", tipo: "RECLAMO" }),
    ]);
    expect(rows[1].celdas).toEqual([
      { tipo: "QUEJA", total: 0, abiertos: 0 },
      { tipo: "RECLAMO", total: 1, abiertos: 1 },
    ]);
  });

  it("groups null provider and null type as (sin valor)", () => {
    const rows = providerTypeMatrix([caso({ id: "1", area: null, tipo: null })]);
    expect(rows[0].area).toBe("(sin valor)");
    expect(rows[0].celdas[0].tipo).toBe("(sin valor)");
  });

  it("sorts providers by total descending then name", () => {
    const rows = providerTypeMatrix([
      caso({ id: "1", area: "B" }),
      caso({ id: "2", area: "A" }),
      caso({ id: "3", area: "C" }),
      caso({ id: "4", area: "C" }),
    ]);
    expect(rows.map((row) => row.area)).toEqual(["C", "A", "B"]);
  });

  it("returns an empty list without cases", () => {
    expect(providerTypeMatrix([])).toEqual([]);
  });
});
