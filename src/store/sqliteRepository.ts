import Database from "better-sqlite3";
import type { PqrCase } from "../domain/types.js";
import type { CaseRepository } from "./repository.js";

const COLUMNS = [
  "id",
  "sheetYear",
  "rowNumber",
  "fechaInicial",
  "fechaSolucion",
  "fechaInicialInvalida",
  "fechaSolucionInvalida",
  "diasSolucion",
  "area",
  "areaOriginal",
  "idOrden",
  "asociado",
  "correo",
  "fuente",
  "fuenteOriginal",
  "tipo",
  "tipoOriginal",
  "tema",
  "temaOriginal",
  "motivo",
  "solucion",
  "valorDevolucion",
  "mesCompra",
  "tipoDevolucion",
  "fechaSolicitud",
  "observaciones",
] as const;

function flag(value: number): boolean {
  return value === 1;
}

export function openSqliteRepository(dbPath: string): CaseRepository {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      sheetYear INTEGER NOT NULL,
      rowNumber INTEGER NOT NULL,
      fechaInicial TEXT,
      fechaSolucion TEXT,
      fechaInicialInvalida INTEGER NOT NULL,
      fechaSolucionInvalida INTEGER NOT NULL,
      diasSolucion INTEGER,
      area TEXT,
      areaOriginal TEXT,
      idOrden TEXT,
      asociado TEXT,
      correo TEXT,
      fuente TEXT,
      fuenteOriginal TEXT,
      tipo TEXT,
      tipoOriginal TEXT,
      tema TEXT,
      temaOriginal TEXT,
      motivo TEXT,
      solucion TEXT,
      valorDevolucion TEXT,
      mesCompra TEXT,
      tipoDevolucion TEXT,
      fechaSolicitud TEXT,
      observaciones TEXT
    )
  `);
  const insert = db.prepare(
    `INSERT INTO cases (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(() => "?").join(", ")})`,
  );
  const replace = db.transaction((cases: PqrCase[]) => {
    db.exec("DELETE FROM cases");
    for (const row of cases) {
      insert.run(
        row.id,
        row.sheetYear,
        row.rowNumber,
        row.fechaInicial,
        row.fechaSolucion,
        row.fechaInicialInvalida ? 1 : 0,
        row.fechaSolucionInvalida ? 1 : 0,
        row.diasSolucion,
        row.area,
        row.areaOriginal,
        row.idOrden,
        row.asociado,
        row.correo,
        row.fuente,
        row.fuenteOriginal,
        row.tipo,
        row.tipoOriginal,
        row.tema,
        row.temaOriginal,
        row.motivo,
        row.solucion,
        row.valorDevolucion,
        row.mesCompra,
        row.tipoDevolucion,
        row.fechaSolicitud,
        row.observaciones,
      );
    }
  });

  return {
    replaceAll(cases) {
      replace(cases);
    },
    list() {
      const rows = db
        .prepare("SELECT * FROM cases ORDER BY sheetYear, rowNumber")
        .all() as Array<Record<string, string | number | null>>;
      return rows.map((row) => ({
        ...(row as unknown as PqrCase),
        fechaInicialInvalida: flag(Number(row.fechaInicialInvalida)),
        fechaSolucionInvalida: flag(Number(row.fechaSolucionInvalida)),
      }));
    },
  };
}
