import { describe, expect, it } from "vitest";
import { businessDays } from "../../src/domain/businessDays";
import {
  applyClose,
  caseFromCreate,
  validateBitacora,
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

describe("validateCreate with catalogs", () => {
  const catalogs = {
    area: ["Electrojaponesa", "Tienda Coomeva"],
    fuente: ["Correo Tienda", "Llamada"],
    tipo: ["RECLAMO", "QUEJA"],
    tema: ["BOLETERIA", "GARANTIA DE PRODUCTO"],
  };
  const picked = { ...filled, area: "Electrojaponesa", fuente: "Correo Tienda", tipo: "RECLAMO", tema: "BOLETERIA" };

  it("accepts values from the lists", () => {
    const result = validateCreate(picked, catalogs);
    expect(result.ok).toBe(true);
    expect(result.fields).toMatchObject({ area: "Electrojaponesa", fuente: "Correo Tienda" });
  });

  it("rejects a value that is not in its list, naming the field", () => {
    const result = validateCreate({ ...picked, fuente: "Telegrama" }, catalogs);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([{ field: "fuente", message: "Fuente no está en la lista" }]);
  });

  it("reports every field outside its list", () => {
    const result = validateCreate({ ...picked, area: "Nadie", tema: "Inventado" }, catalogs);
    if (result.ok) throw new Error("expected errors");
    expect(result.errors.map((error) => error.field)).toEqual(["area", "tema"]);
  });

  it("normalizes accents, case and spacing to the list value", () => {
    const result = validateCreate(
      { ...picked, area: "  electrojaponesa ", tema: "garantia  de producto", fuente: "CORREO tienda" },
      catalogs,
    );
    expect(result.ok).toBe(true);
    expect(result.fields).toMatchObject({
      area: "Electrojaponesa",
      tema: "GARANTIA DE PRODUCTO",
      fuente: "Correo Tienda",
    });
  });

  it("does not validate a field whose list is empty", () => {
    const result = validateCreate(picked, { ...catalogs, fuente: [] });
    expect(result.ok).toBe(true);
    expect(validateCreate({ ...picked, fuente: "Lo que sea" }, { ...catalogs, fuente: [] }).ok).toBe(true);
  });

  it("behaves as before without catalogs", () => {
    expect(validateCreate({ ...picked, fuente: "Telegrama" }).ok).toBe(true);
  });

  it("keeps the required message when the field is empty", () => {
    const result = validateCreate({ ...picked, fuente: "" }, catalogs);
    if (result.ok) throw new Error("expected errors");
    expect(result.errors).toEqual([{ field: "fuente", message: "Fuente es obligatoria" }]);
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

describe("validateBitacora", () => {
  it("accepts a past date with text", () => {
    expect(validateBitacora({ fecha: "2026-01-12", texto: " avance " }, "2026-01-19")).toEqual({
      ok: true,
      fields: { fecha: "2026-01-12", texto: "avance" },
    });
  });

  it("flags empty text and future or invalid dates", () => {
    const fields = (fecha: string, texto: string) => {
      const r = validateBitacora({ fecha, texto }, "2026-01-19");
      return r.ok ? [] : r.errors.map((e) => e.field);
    };
    expect(fields("2026-01-12", "")).toEqual(["texto"]);
    expect(fields("2026-02-01", "x")).toEqual(["fecha"]);
    expect(fields("", "x")).toEqual(["fecha"]);
    expect(fields("no", "x")).toEqual(["fecha"]);
  });
});

describe("validateClose causa raíz", () => {
  it("accepts a known cause and corrective action, rejects an unknown one", () => {
    const ok = validateClose(
      { fechaSolucion: "2026-01-12", solucion: "ok", causaRaiz: "Logística", accionCorrectiva: " Cambiar courier " },
      "2026-01-05",
    );
    expect(ok).toMatchObject({ ok: true, fields: { causaRaiz: "Logística", accionCorrectiva: "Cambiar courier" } });
    const bad = validateClose({ fechaSolucion: "2026-01-12", solucion: "ok", causaRaiz: "Magia" }, "2026-01-05");
    expect(bad).toMatchObject({ ok: false, errors: [{ field: "causaRaiz" }] });
  });
});
