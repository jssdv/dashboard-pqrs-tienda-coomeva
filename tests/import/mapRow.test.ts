import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../src/domain/dictionary.js";
import { mapHeaders } from "../../src/domain/headers.js";
import { mapRow } from "../../src/import/mapRow.js";

const headers = mapHeaders([
  "FECHA INICIAL",
  "FECHA SOLUCION",
  "AREA",
  "TIPO PQRs",
  "TEMA",
  "PQRs",
  "ASOCIADO",
]);

describe("mapRow", () => {
  it("flags a junk 2024 date and maps PREGUNTAS", () => {
    const dictionary = parseDictionary("field,from,to\ntipo,PREGUNTAS,PREGUNTA\n");
    const mapped = mapRow(
      {
        sheetYear: 2024,
        rowNumber: 174,
        cells: {
          "FECHA INICIAL": 678,
          AREA: "Tienda Coomeva",
          "TIPO PQRs": "PREGUNTAS",
          TEMA: "CINE",
          PQRs: "texto",
          ASOCIADO: "NOMBRE",
        },
      },
      headers,
      dictionary,
      [],
    );
    expect(mapped?.fechaInicialInvalida).toBe(true);
    expect(mapped?.diasSolucion).toBeNull();
    expect(mapped?.tipo).toBe("PREGUNTA");
    expect(mapped?.tipoOriginal).toBe("PREGUNTAS");
    expect(mapped?.id).toBe("2024-174");
  });

  it("returns null for a formula-only row", () => {
    const dictionary = parseDictionary("field,from,to\n");
    expect(
      mapRow({ sheetYear: 2025, rowNumber: 585, cells: {} }, headers, dictionary, []),
    ).toBeNull();
  });
});
