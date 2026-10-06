import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildCasesWorkbook } from "../../src/export/casesWorkbook";
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

async function open(rows: Parameters<typeof buildCasesWorkbook>[0], meta = { generatedAt: "2026-01-19", filters: [] as string[] }) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await buildCasesWorkbook(rows, meta));
  return workbook;
}

describe("buildCasesWorkbook", () => {
  it("writes a Casos sheet with a header row and one row per case", async () => {
    const workbook = await open([caso({ id: "1", idOrden: "A-1" }), caso({ id: "2", idOrden: "A-2" })]);
    const sheet = workbook.getWorksheet("Casos");
    expect(sheet).toBeTruthy();
    expect(sheet?.rowCount).toBe(3);
    const header = (sheet?.getRow(1).values as string[]).slice(1);
    expect(header).toEqual([
      "ID de orden",
      "Fecha inicial",
      "Fecha de solución",
      "Estado",
      "Días hábiles",
      "Plazo",
      "Proveedor",
      "Fuente",
      "Tipo",
      "Tema",
      "Asociado",
      "Correo",
      "Motivo",
      "Solución",
    ]);
    expect(sheet?.getRow(2).getCell(1).value).toBe("A-1");
  });

  it("uses real dates, days and plazo for open and closed cases", async () => {
    const workbook = await open([
      caso({ id: "1", riesgo: { diasAbiertos: 11, diasParaVencer: -1, estado: "vencido" } }),
      caso({ id: "2", fechaSolucion: "2026-01-12", diasSolucion: 6, solucion: "Listo" }),
    ]);
    const sheet = workbook.getWorksheet("Casos");
    const open1 = sheet?.getRow(2);
    expect(open1?.getCell(2).value).toEqual(new Date("2026-01-05T00:00:00.000Z"));
    expect(open1?.getCell(4).value).toBe("Abierto");
    expect(open1?.getCell(5).value).toBe(11);
    expect(open1?.getCell(6).value).toBe("Vencido");
    const closed = sheet?.getRow(3);
    expect(closed?.getCell(3).value).toEqual(new Date("2026-01-12T00:00:00.000Z"));
    expect(closed?.getCell(4).value).toBe("Cerrado");
    expect(closed?.getCell(5).value).toBe(6);
    expect(closed?.getCell(6).value).toBeNull();
    expect(closed?.getCell(14).value).toBe("Listo");
  });

  it("leaves cells empty for missing values and invalid dates", async () => {
    const workbook = await open([caso({ id: "1", fechaInicial: null, correo: null, fechaInicialInvalida: true })]);
    const row = workbook.getWorksheet("Casos")?.getRow(2);
    expect(row?.getCell(2).value).toBeNull();
    expect(row?.getCell(12).value).toBeNull();
  });

  it("freezes the header, enables filters and styles the header", async () => {
    const workbook = await open([caso({ id: "1" })]);
    const sheet = workbook.getWorksheet("Casos");
    expect(sheet?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(sheet?.autoFilter).toBeTruthy();
    expect(sheet?.getRow(1).getCell(1).font?.bold).toBe(true);
  });

  it("lists the applied filters and the count on a second sheet", async () => {
    const workbook = await open([caso({ id: "1" })], { generatedAt: "2026-01-19", filters: ["Estado: abiertos", "Proveedor: Tienda"] });
    const sheet = workbook.getWorksheet("Filtros");
    const text = (sheet?.getSheetValues() as unknown[][]).flat().filter(Boolean).join("|");
    expect(text).toContain("2026-01-19");
    expect(text).toContain("Estado: abiertos");
    expect(text).toContain("Proveedor: Tienda");
    expect(text).toContain("1");
  });

  it("exports an empty list with only the header", async () => {
    const workbook = await open([]);
    expect(workbook.getWorksheet("Casos")?.rowCount).toBe(1);
  });
});
