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
  it("is en-plazo at 7 business days", () => {
    expect(riskOf(caso(), HOLIDAYS, "2026-01-13")).toEqual({
      diasAbiertos: 7,
      diasParaVencer: 8,
      estado: "en-plazo",
      vence: "2026-01-23",
    });
  });

  it("is por-vencer at 8 business days", () => {
    expect(riskOf(caso(), HOLIDAYS, "2026-01-14")).toMatchObject({
      diasAbiertos: 8,
      estado: "por-vencer",
    });
  });

  it("is por-vencer with 0 days left at 15 business days", () => {
    expect(riskOf(caso(), HOLIDAYS, "2026-01-23")).toEqual({
      diasAbiertos: 15,
      diasParaVencer: 0,
      estado: "por-vencer",
      vence: "2026-01-23",
    });
  });

  it("is vencido at 16 business days", () => {
    expect(riskOf(caso(), HOLIDAYS, "2026-01-26")).toEqual({
      diasAbiertos: 16,
      diasParaVencer: -1,
      estado: "vencido",
      vence: "2026-01-23",
    });
  });

  it("uses the provider's own plazo", () => {
    const plazos = new Map([["Tienda", 4]]);
    expect(riskOf(caso({ area: "Tienda" }), HOLIDAYS, "2026-01-12", plazos)).toMatchObject({
      estado: "vencido",
      diasParaVencer: -2,
      vence: "2026-01-08",
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
