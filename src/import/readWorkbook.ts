import ExcelJS from "exceljs";
import type { RawCell, RawRow } from "../domain/types.js";

function cellValue(value: ExcelJS.CellValue): RawCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || value instanceof Date) return value;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  if (typeof value === "object" && "hyperlink" in value) {
    return cellValue(value.text as ExcelJS.CellValue);
  }
  if (typeof value === "object" && "result" in value) {
    return cellValue(value.result as ExcelJS.CellValue);
  }
  if (typeof value === "object" && ("error" in value || "formula" in value || "sharedFormula" in value)) {
    return null;
  }
  return String(value);
}

export async function readWorkbook(
  filePath: string,
): Promise<{ rows: RawRow[]; holidays: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const rows: RawRow[] = [];
  for (const sheet of workbook.worksheets) {
    const match = sheet.name.match(/^PQRs\s+(\d{4})$/i);
    if (!match) continue;
    const sheetYear = Number(match[1]);
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
      headers[col] = String(cell.value ?? "").trim();
    });
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const cells: Record<string, RawCell> = {};
      for (const [col, label] of headers.entries()) {
        if (!label) continue;
        const value = cellValue(row.getCell(col).value);
        if (value !== null && value !== "") cells[label] = value;
      }
      rows.push({ sheetYear, rowNumber, cells });
    });
  }
  return { rows, holidays: [] };
}
