import { describe, expect, it } from "vitest";
import { businessDays } from "../../src/domain/businessDays";
import {
  applyClose,
  caseFromCreate,
  validateClose,
  validateCreate,
} from "../../src/domain/caseForm";
import { Dictionary } from "../../src/domain/dictionary";
import type { PqrCase } from "../../src/domain/types";

const dictionary = new Dictionary(
  new Map([
    ["tipo:RECLAMOS", "RECLAMO"],
    ["area:ELECTROJAPONESA", "Electrojaponesa"],
    ["fuente:CORREO TIENDA", "Correo Tienda"],
    ["tema:CINE", "BOLETERIA"],
  ]),
);

const filled = {
  fechaInicial: "2026-01-05",
  area: "ElectroJaponesa",
  idOrden: "ORD-1",
  asociado: "Ana Ruiz",
  correo: "ana@coomeva.com.co",
  fuente: "correo Tienda",
  tipo: "RECLAMOS",
  tema: "CINE",
  motivo: "No llegó el pin",
};

function caso(): PqrCase {
  return caseFromCreate(filled, dictionary, "app-test");
}

describe("validateCreate", () => {
  it("requires the nine opening fields", () => {
    const result = validateCreate({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.field)).toEqual([
      "fechaInicial",
      "area",
      "idOrden",
      "asociado",
      "correo",
      "fuente",
      "tipo",
      "tema",
      "motivo",
    ]);
  });

  it("rejects an invalid date and a malformed email", () => {
    const result = validateCreate({ ...filled, fechaInicial: "2023-01-01", correo: "ana" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.field)).toEqual(["fechaInicial", "correo"]);
    expect(result.fields.area).toBe("ElectroJaponesa");
  });
});

describe("caseFromCreate", () => {
  it("stores official catalog values and an app id", () => {
    const row = caso();
    expect(row.id).toBe("app-test");
    expect(row.sheetYear).toBe(2026);
    expect(row.area).toBe("Electrojaponesa");
    expect(row.areaOriginal).toBe("ElectroJaponesa");
    expect(row.fuente).toBe("Correo Tienda");
    expect(row.fuenteOriginal).toBe("correo Tienda");
    expect(row.tipo).toBe("RECLAMO");
    expect(row.tipoOriginal).toBe("RECLAMOS");
    expect(row.tema).toBe("BOLETERIA");
    expect(row.temaOriginal).toBe("CINE");
    expect(row.fechaSolucion).toBeNull();
    expect(row.solucion).toBeNull();
    expect(row.diasSolucion).toBeNull();
  });
});

describe("validateClose", () => {
  it("requires a solution date on or after the start date and solution text", () => {
    const missing = validateClose({}, "2026-01-05");
    expect(missing.ok).toBe(false);
    const early = validateClose(
      { fechaSolucion: "2026-01-04", solucion: "Listo" },
      "2026-01-05",
    );
    expect(early.ok).toBe(false);
    if (early.ok) return;
    expect(early.errors.map((error) => error.field)).toEqual(["fechaSolucion"]);
    const ok = validateClose(
      { fechaSolucion: "2026-01-06", solucion: "  Se entregó  " },
      "2026-01-05",
    );
    expect(ok).toEqual({
      ok: true,
      fields: { fechaSolucion: "2026-01-06", solucion: "Se entregó" },
    });
  });
});

describe("applyClose", () => {
  it("recalculates business days with the stored holidays", () => {
    const closed = applyClose(caso(), { fechaSolucion: "2026-01-06", solucion: "Listo" }, [
      "2026-01-06",
    ]);
    expect(closed.fechaSolucion).toBe("2026-01-06");
    expect(closed.solucion).toBe("Listo");
    expect(closed.diasSolucion).toBe(businessDays("2026-01-05", "2026-01-06", ["2026-01-06"]));
  });

  it("throws when no holidays are loaded", () => {
    expect(() =>
      applyClose(caso(), { fechaSolucion: "2026-01-06", solucion: "Listo" }, []),
    ).toThrow(/holidays/);
  });
});
