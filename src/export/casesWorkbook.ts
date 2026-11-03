import ExcelJS from "exceljs";
import type { PlazoEstado, Riesgo } from "../domain/risk.js";
import type { PqrCase } from "../domain/types.js";

export interface ExportMeta {
  generatedAt: string;
  filters: string[];
}

const PLAZO_TEXT: Record<PlazoEstado, string> = {
  "en-plazo": "En plazo",
  "por-vencer": "Por vencer",
  vencido: "Vencido",
};

const COLUMNS: Array<{ header: string; width: number }> = [
  { header: "ID de orden", width: 20 },
  { header: "Fecha inicial", width: 14 },
  { header: "Fecha de solución", width: 18 },
  { header: "Estado", width: 11 },
  { header: "Días hábiles", width: 13 },
  { header: "Plazo", width: 12 },
  { header: "Proveedor", width: 26 },
  { header: "Fuente", width: 18 },
  { header: "Tipo", width: 14 },
  { header: "Tema", width: 28 },
  { header: "Asociado", width: 28 },
  { header: "Correo", width: 30 },
  { header: "Motivo", width: 60 },
  { header: "Solución", width: 60 },
];

function dateCell(iso: string | null, invalid: boolean): Date | null {
  return iso === null || invalid ? null : new Date(`${iso}T00:00:00.000Z`);
}

export async function buildCasesWorkbook(
  cases: ReadonlyArray<PqrCase & { riesgo?: Riesgo }>,
  meta: ExportMeta,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PQRS Tienda Coomeva";
  workbook.created = new Date(`${meta.generatedAt}T00:00:00.000Z`);

  const sheet = workbook.addWorksheet("Casos", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = COLUMNS.map((column) => ({ header: column.header, width: column.width }));
  for (const row of cases) {
    const open = row.fechaSolucion === null;
    sheet.addRow([
      row.idOrden,
      dateCell(row.fechaInicial, row.fechaInicialInvalida),
      dateCell(row.fechaSolucion, row.fechaSolucionInvalida),
      open ? "Abierto" : "Cerrado",
      open ? (row.riesgo?.diasAbiertos ?? null) : row.diasSolucion,
      open && row.riesgo ? PLAZO_TEXT[row.riesgo.estado] : null,
      row.area,
      row.fuente,
      row.tipo,
      row.tema,
      row.asociado,
      row.correo,
      row.motivo,
      row.solucion,
    ]);
  }
  sheet.getColumn(2).numFmt = "yyyy-mm-dd";
  sheet.getColumn(3).numFmt = "yyyy-mm-dd";
  sheet.getColumn(13).alignment = { wrapText: true, vertical: "top" };
  sheet.getColumn(14).alignment = { wrapText: true, vertical: "top" };
  const header = sheet.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF005628" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F6EE" } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF00843D" } } };
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  const info = workbook.addWorksheet("Filtros");
  info.columns = [{ width: 24 }, { width: 48 }];
  info.addRow(["Generado", meta.generatedAt]);
  info.addRow(["Casos exportados", cases.length]);
  info.addRow([]);
  info.addRow(["Filtros aplicados"]).font = { bold: true };
  if (meta.filters.length === 0) info.addRow(["Sin filtros"]);
  for (const filter of meta.filters) info.addRow([filter]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
