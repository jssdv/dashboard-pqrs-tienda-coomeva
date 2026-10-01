import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../src/domain/dictionary.js";

const dictionary = parseDictionary(
  readFileSync(new URL("../../data/dictionary.csv", import.meta.url), "utf8"),
);

describe("official dictionary", () => {
  it("maps tipo, fuente and area", () => {
    expect(dictionary.official("tipo", "PREGUNTAS")).toBe("PREGUNTA");
    expect(dictionary.official("tipo", "RECLAMOS")).toBe("RECLAMO");
    expect(dictionary.official("tipo", "DEVOLUCIÓN")).toBe("DEVOLUCION");
    expect(dictionary.official("fuente", "correo Tienda")).toBe("Correo Tienda");
    expect(dictionary.official("fuente", "Alejandra Rengifo")).toBe("Otro");
    expect(dictionary.official("fuente", "Llamada telefonica")).toBe("Llamada");
    expect(dictionary.official("area", "ElectroJaponesa")).toBe("Electrojaponesa");
    expect(dictionary.official("area", "Coomeva Recreacion")).toBe("Coomeva Recreacion");
  });

  it("merges boleteria and keeps PINOS out of virtual pines", () => {
    expect(dictionary.official("tema", "CINE")).toBe("BOLETERIA");
    expect(dictionary.official("tema", "BOLETAS ZOOLÓGICO")).toBe("BOLETERIA");
    expect(dictionary.official("tema", "PIN NETFLIX")).toBe("PINES VIRTUALES");
    expect(dictionary.official("tema", "COMPRA DE PINOS")).toBe("PINOS");
    expect(dictionary.official("tema", "PINOS")).toBe("PINOS");
  });

  it("does not merge refund subtypes", () => {
    expect(dictionary.official("tema", "DEVOLUCIÓN DE DINERO")).toBe("DEVOLUCION DE DINERO");
    expect(dictionary.official("tema", "DEVOLUCION DINERO STOCK")).toBe("DEVOLUCION DINERO STOCK");
    expect(dictionary.official("tema", "DEVOLUCIÓN DE DINERO RECREACIÓN")).toBe(
      "DEVOLUCION DE DINERO RECREACION",
    );
  });
});
