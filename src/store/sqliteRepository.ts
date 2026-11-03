import Database from "better-sqlite3";
import type { BitacoraEntry } from "../domain/caseForm.js";
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
] as const;

function flag(value: number): boolean {
  return value === 1;
}

function caseValues(row: PqrCase): Array<string | number | null> {
  return [
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
  ];
}

export function openSqliteRepository(dbPath: string): CaseRepository {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS holidays (
      date TEXT PRIMARY KEY
    )
  `);
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
      solucion TEXT
    )
  `);
  const existing = new Set(
    (db.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>).map(
      (column) => column.name,
    ),
  );
  for (const retired of [
    "valorDevolucion",
    "mesCompra",
    "tipoDevolucion",
    "fechaSolicitud",
    "observaciones",
  ]) {
    if (existing.has(retired)) db.exec(`ALTER TABLE cases DROP COLUMN ${retired}`);
  }
  const insert = db.prepare(
    `INSERT INTO cases (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(() => "?").join(", ")})`,
  );
  const replace = db.transaction((cases: PqrCase[]) => {
    db.exec("DELETE FROM cases");
    for (const row of cases) insert.run(...caseValues(row));
  });
  const update = db.prepare(
    `UPDATE cases SET ${COLUMNS.filter((column) => column !== "id")
      .map((column) => `${column} = ?`)
      .join(", ")} WHERE id = ?`,
  );
  const addHoliday = db.prepare("INSERT OR IGNORE INTO holidays (date) VALUES (?)");
  const addHolidaySet = db.transaction((dates: readonly string[]) => {
    for (const date of dates) addHoliday.run(date);
  });
  db.exec(`
    CREATE TABLE IF NOT EXISTS proveedores (
      nombre TEXT PRIMARY KEY
    )
  `);
  // Sin FK a cases: replaceAll borra los casos, la bitácora sobrevive por id estable.
  db.exec(`
    CREATE TABLE IF NOT EXISTS bitacora (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caseId TEXT NOT NULL,
      fecha TEXT NOT NULL,
      texto TEXT NOT NULL,
      creadoEn TEXT NOT NULL
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS bitacora_case ON bitacora (caseId)");
  const insertProveedor = db.prepare("INSERT OR IGNORE INTO proveedores (nombre) VALUES (?)");
  const renameProveedorTx = db.transaction((desde: string, hacia: string) => {
    insertProveedor.run(hacia);
    db.prepare("UPDATE cases SET area = ? WHERE area = ?").run(hacia, desde);
    db.prepare("DELETE FROM proveedores WHERE nombre = ?").run(desde);
  });

  return {
    replaceAll(cases) {
      replace(cases);
    },
    insert(caso) {
      insert.run(...caseValues(caso));
    },
    update(caso) {
      const values = caseValues(caso);
      update.run(...values.slice(1), caso.id);
    },
    listHolidays() {
      return (
        db.prepare("SELECT date FROM holidays ORDER BY date").all() as Array<{ date: string }>
      ).map((row) => row.date);
    },
    addHolidays(dates) {
      addHolidaySet(dates);
    },
    listProveedores() {
      const stored = (
        db.prepare("SELECT nombre FROM proveedores").all() as Array<{ nombre: string }>
      ).map((row) => row.nombre);
      const used = (
        db.prepare(
          "SELECT DISTINCT area AS nombre FROM cases WHERE area IS NOT NULL AND trim(area) != ''",
        ).all() as Array<{ nombre: string }>
      ).map((row) => row.nombre);
      return [...new Set([...stored, ...used])].sort((a, b) => a.localeCompare(b, "es"));
    },
    addProveedor(nombre) {
      insertProveedor.run(nombre.trim().replace(/\s+/g, " "));
    },
    renameProveedor(desde, hacia) {
      renameProveedorTx(desde, hacia.trim().replace(/\s+/g, " "));
    },
    listBitacora(caseId) {
      return db
        .prepare("SELECT * FROM bitacora WHERE caseId = ? ORDER BY fecha DESC, id DESC")
        .all(caseId) as BitacoraEntry[];
    },
    addBitacora(caseId, fields, creadoEn) {
      const { lastInsertRowid } = db
        .prepare("INSERT INTO bitacora (caseId, fecha, texto, creadoEn) VALUES (?, ?, ?, ?)")
        .run(caseId, fields.fecha, fields.texto, creadoEn);
      return { id: Number(lastInsertRowid), caseId, ...fields, creadoEn };
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
