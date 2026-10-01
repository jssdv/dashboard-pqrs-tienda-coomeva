import { describe, expect, it } from "vitest";
import type { PqrCase } from "../../src/domain/types";

describe("PqrCase", () => {
  it("accepts a closed case with official and original tema", () => {
    const row: PqrCase = {
      id: "2026-2",
      sheetYear: 2026,
      rowNumber: 2,
      fechaInicial: "2026-01-05",
      fechaSolucion: "2026-01-05",
      fechaInicialInvalida: false,
      fechaSolucionInvalida: false,
      diasSolucion: 1,
      area: "Coomeva Recreacion",
      areaOriginal: "Coomeva Recreacion",
      idOrden: "1582011103751-01",
      asociado: "MIRIAN BENAVIDES",
      correo: "mimirosario@hotmail.com",
      fuente: "Correo Tienda",
      fuenteOriginal: "Correo Tienda",
      tipo: "RECLAMO",
      tipoOriginal: "RECLAMO",
      tema: "BOLETERIA",
      temaOriginal: "BOLETERIA",
      motivo: "texto",
      solucion: "texto",
      valorDevolucion: null,
      mesCompra: null,
      tipoDevolucion: null,
      fechaSolicitud: null,
      observaciones: null,
    };
    expect(row.id).toBe("2026-2");
    expect(row.temaOriginal).toBe(row.tema);
  });
});
