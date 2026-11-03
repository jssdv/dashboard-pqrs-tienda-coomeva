import { expect, it } from "vitest";
import { parseDictionary } from "../../src/domain/dictionary.js";
import { importCases } from "../../src/import/importCases.js";

it("imports one valid row and counts a skipped empty row", () => {
  const result = importCases({
    holidays: [],
    dictionary: parseDictionary("field,from,to\n"),
    rows: [
      {
        sheetYear: 2026,
        rowNumber: 2,
        cells: {
          "FECHA INICIAL": 46027,
          "FECHA SOLUCION": 46027,
          AREA: "Tienda Coomeva",
          ASOCIADO: "NOMBRE",
          PQRs: "motivo",
        },
      },
      { sheetYear: 2026, rowNumber: 3, cells: {} },
    ],
  });
  expect(result.cases).toHaveLength(1);
  expect(result.cases[0].diasSolucion).toBe(1);
  expect(result.skipped).toBe(1);
  expect(result.invalidDates).toBe(0);
});
