import { describe, expect, it } from "vitest";
import { riskOf } from "../../src/domain/risk";
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

const HOLIDAYS = ["2026-01-01"];

describe("riskOf", () => {
  it("is en-plazo at 5 business days", () => {
    expect(riskOf(caso(), HOLIDAYS, "2026-01-09")).toEqual({
      diasAbiertos: 5,
      diasParaVencer: 5,
      estado: "en-plazo",
    });
  });

  it("is por-vencer at 6 business days", () => {
    expect(riskOf(caso(), HOLIDAYS, "2026-01-12")).toMatchObject({
      diasAbiertos: 6,
      estado: "por-vencer",
    });
  });

  it("is por-vencer with 0 days left at 10 business days", () => {
    expect(riskOf(caso(), HOLIDAYS, "2026-01-16")).toEqual({
      diasAbiertos: 10,
      diasParaVencer: 0,
      estado: "por-vencer",
    });
  });

  it("is vencido at 11 business days", () => {
    expect(riskOf(caso(), HOLIDAYS, "2026-01-19")).toEqual({
      diasAbiertos: 11,
      diasParaVencer: -1,
      estado: "vencido",
    });
  });

  it("clamps a future start date to 0 days", () => {
    expect(riskOf(caso({ fechaInicial: "2026-02-02" }), HOLIDAYS, "2026-01-19")).toMatchObject({
      diasAbiertos: 0,
      estado: "en-plazo",
    });
  });

  it("returns null for closed cases and unusable start dates", () => {
    expect(riskOf(caso({ fechaSolucion: "2026-01-06" }), HOLIDAYS, "2026-01-19")).toBeNull();
    expect(riskOf(caso({ fechaInicial: null }), HOLIDAYS, "2026-01-19")).toBeNull();
    expect(riskOf(caso({ fechaInicialInvalida: true }), HOLIDAYS, "2026-01-19")).toBeNull();
  });

  it("throws without holidays", () => {
    expect(() => riskOf(caso(), [], "2026-01-19")).toThrow("no holidays loaded");
  });
});
