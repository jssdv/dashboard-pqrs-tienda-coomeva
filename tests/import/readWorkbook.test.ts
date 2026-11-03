import ExcelJS from "exceljs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { readWorkbook } from "../../src/import/readWorkbook.js";

const workbookPath = path.join(os.tmpdir(), `pqr-fixture-${Date.now()}.xlsx`);

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await rm(workbookPath, { force: true });
});

it("reads a case sheet and ignores Festivos", async () => {
  const workbook = new ExcelJS.Workbook();
  const cases = workbook.addWorksheet("PQRs 2026");
  cases.addRow(["FECHA INICIAL", "AREA", "ASOCIADO", "PQRs"]);
  cases.addRow([46027, "Tienda Coomeva", "NOMBRE", "motivo"]);
  const holidays = workbook.addWorksheet("Festivos 2025");
  holidays.getCell("A1").value = 45658;
  await workbook.xlsx.writeFile(workbookPath);

  const result = await readWorkbook(workbookPath);
  expect(result.rows).toEqual([
    {
      sheetYear: 2026,
      rowNumber: 2,
      cells: {
        "FECHA INICIAL": 46027,
        AREA: "Tienda Coomeva",
        ASOCIADO: "NOMBRE",
        PQRs: "motivo",
      },
    },
  ]);
  expect(result.holidays).toEqual([]);
});

it("reads hyperlink, rich text and error cells as plain text", async () => {
  const workbook = new ExcelJS.Workbook();
  const cases = workbook.addWorksheet("PQRs 2026");
  cases.addRow(["FECHA INICIAL", "AREA", "ASOCIADO", "CORREO", "PQRs"]);
  cases.addRow([46027, "Tienda Coomeva", "NOMBRE", "", "motivo"]);
  cases.addRow([46028, "Tienda Coomeva", "OTRO", "", "motivo"]);
  cases.addRow([46029, "Tienda Coomeva", "TERCERO", "", "motivo"]);
  cases.getCell("D2").value = { text: "ana@coomeva.com.co", hyperlink: "mailto:ana@coomeva.com.co" };
  cases.getCell("D3").value = {
    text: { richText: [{ text: "luis@" }, { text: "coomeva.com.co" }] },
    hyperlink: "mailto:luis@coomeva.com.co",
  } as ExcelJS.CellValue;
  cases.getCell("D4").value = { error: "#N/A" } as ExcelJS.CellValue;
  await workbook.xlsx.writeFile(workbookPath);

  const { rows } = await readWorkbook(workbookPath);
  expect(rows[0].cells.CORREO).toBe("ana@coomeva.com.co");
  expect(rows[1].cells.CORREO).toBe("luis@coomeva.com.co");
  expect(rows[2].cells.CORREO).toBeUndefined();
});
