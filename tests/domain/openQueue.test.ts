import { describe, expect, it } from "vitest";
import { bogotaToday, openQueue } from "../../src/domain/openQueue";
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

describe("bogotaToday", () => {
  it("uses the America/Bogota calendar date", () => {
    expect(bogotaToday(new Date("2026-01-20T02:30:00Z"))).toBe("2026-01-19");
    expect(bogotaToday(new Date("2026-01-20T05:30:00Z"))).toBe("2026-01-20");
  });
});

describe("openQueue", () => {
  it("includes an open case whose business-day age is greater than 15", () => {
    const queued = openQueue([caso({ id: "2026-2" })], ["2026-01-01"], "2026-01-26");
    expect(queued.map((row) => row.id)).toEqual(["2026-2"]);
  });

  it("excludes a case that is exactly 15 business days old, closed, or missing a valid start", () => {
    const rows = [
      caso({ id: "exact" }),
      caso({ id: "closed", fechaSolucion: "2026-01-06", diasSolucion: 1 }),
      caso({ id: "bad-start", fechaInicial: null, fechaInicialInvalida: true }),
    ];
    expect(openQueue(rows, ["2026-01-01"], "2026-01-23")).toEqual([]);
  });

  it("does not count a stored holiday as a business day", () => {
    expect(openQueue([caso({ id: "2026-2" })], ["2026-01-12"], "2026-01-26")).toEqual([]);
  });

  it("throws when no holidays are loaded", () => {
    expect(() => openQueue([caso({ id: "2026-2" })], [], "2026-01-19")).toThrow(/holidays/);
  });
});
