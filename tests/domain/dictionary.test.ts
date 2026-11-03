import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../src/domain/dictionary.js";

describe("dictionary", () => {
  const csv = [
    "field,from,to",
    "tipo,PREGUNTAS,PREGUNTA",
    "area,ElectroJaponesa,Electrojaponesa",
    "tema,CINE,BOLETERIA",
  ].join("\n");

  it("maps known values and keeps unknown text", () => {
    const dictionary = parseDictionary(csv);
    expect(dictionary.official("tipo", "PREGUNTAS")).toBe("PREGUNTA");
    expect(dictionary.official("area", "electrojaponesa")).toBe("Electrojaponesa");
    expect(dictionary.official("tema", "  CINE ")).toBe("BOLETERIA");
    expect(dictionary.official("fuente", "  CAC  ")).toBe("CAC");
  });
});
