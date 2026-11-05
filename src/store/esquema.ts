import type { DatabaseSync } from "node:sqlite";
import { ErrorArranque } from "./arranque.js";

export const COLUMNS = [
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
  "causaRaiz",
  "accionCorrectiva",
] as const;

// Columnas que la base añade a proveedores; bases antiguas no las tienen.
const PROVEEDOR_COLUMNAS: Array<[string, string]> = [
  ["contacto", "TEXT NOT NULL DEFAULT ''"],
  ["correo", "TEXT NOT NULL DEFAULT ''"],
  ["telefono", "TEXT NOT NULL DEFAULT ''"],
  ["notas", "TEXT NOT NULL DEFAULT ''"],
  ["activo", "INTEGER NOT NULL DEFAULT 1"],
  ["plazoDias", "INTEGER"],
];

// Esquema completo de la versión 1. Idempotente: en una base sin sello (user_version 0, creada por el
// código anterior con CREATE IF NOT EXISTS) crea lo que falte y no toca lo que ya existe.
export function crearEsquemaBase(db: DatabaseSync): void {
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
      solucion TEXT,
      causaRaiz TEXT,
      accionCorrectiva TEXT
    )
  `);
  const existing = new Set(
    (db.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>).map((column) => column.name),
  );
  for (const retired of ["valorDevolucion", "mesCompra", "tipoDevolucion", "fechaSolicitud", "observaciones"]) {
    if (existing.has(retired)) db.exec(`ALTER TABLE cases DROP COLUMN ${retired}`);
  }
  for (const added of ["causaRaiz", "accionCorrectiva"]) {
    if (!existing.has(added)) db.exec(`ALTER TABLE cases ADD COLUMN ${added} TEXT`);
  }
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT NOT NULL UNIQUE COLLATE NOCASE,
      passwordHash TEXT NOT NULL,
      rol TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      creadoEn TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      tokenHash TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      expiraEn TEXT NOT NULL,
      creadoEn TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS enlaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      creado_por INTEGER NOT NULL,
      expira TEXT,
      revocado INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ajustes (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    )
  `);
  const storedColumns = new Set(
    (db.prepare("PRAGMA table_info(proveedores)").all() as Array<{ name: string }>).map((column) => column.name),
  );
  for (const [column, type] of PROVEEDOR_COLUMNAS) {
    if (!storedColumns.has(column)) db.exec(`ALTER TABLE proveedores ADD COLUMN ${column} ${type}`);
  }
}

export interface Migracion {
  version: number;
  // SQL o función. Corre dentro de una transacción junto con el sello user_version.
  aplicar: string | ((db: DatabaseSync) => void);
}

const BASE: Migracion = { version: 1, aplicar: crearEsquemaBase };

// Para cambiar el esquema, añade { version: 2, aplicar: "ALTER TABLE ..." } (o una función) al final.
// Nunca cambies ni reordenes una migración ya publicada: las bases que la aplicaron no la vuelven a correr.
export const MIGRACIONES: Migracion[] = [
  {
    version: 2,
    // Quién abrió y cerró cada caso, y quién escribió cada avance de bitácora. Nulo = registro anterior.
    aplicar: `
      ALTER TABLE cases ADD COLUMN creadoPor TEXT;
      ALTER TABLE cases ADD COLUMN cerradoPor TEXT;
      ALTER TABLE bitacora ADD COLUMN autor TEXT;
    `,
  },
];

export const TODAS_LAS_MIGRACIONES: Migracion[] = [BASE, ...MIGRACIONES];

const TABLAS = ["holidays", "cases", "proveedores", "bitacora", "users", "sessions", "enlaces", "ajustes"];

export function userVersion(db: DatabaseSync): number {
  return Number((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version);
}

export function hayTablas(db: DatabaseSync): boolean {
  return (db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'").get() as { n: number }).n > 0;
}

const columnas = (db: DatabaseSync, tabla: string): Set<string> =>
  new Set((db.prepare(`PRAGMA table_info(${tabla})`).all() as Array<{ name: string }>).map((c) => c.name));

// PRAGMA table_info de una tabla inexistente devuelve vacío: sirve para detectar tablas faltantes.
export function verificarEsquema(db: DatabaseSync): void {
  const faltanTablas = TABLAS.filter((tabla) => columnas(db, tabla).size === 0);
  if (faltanTablas.length > 0) {
    throw new ErrorArranque(`La base no tiene tablas que PQR necesita: ${faltanTablas.join(", ")}.`);
  }
  const cases = columnas(db, "cases");
  const proveedores = columnas(db, "proveedores");
  const faltan = [
    ...COLUMNS.filter((column) => !cases.has(column)).map((column) => `cases.${column}`),
    ...PROVEEDOR_COLUMNAS.map(([column]) => column)
      .filter((column) => !proveedores.has(column))
      .map((column) => `proveedores.${column}`),
  ];
  if (faltan.length > 0) throw new ErrorArranque(`La base no tiene columnas que PQR necesita: ${faltan.join(", ")}.`);
}

// Aplica en orden las migraciones con version > user_version. Cada una es atómica con su sello.
export function migrar(db: DatabaseSync, migraciones: Migracion[], respaldo: string | null): void {
  const desde = userVersion(db);
  for (const migracion of migraciones) {
    if (migracion.version <= desde) continue;
    db.exec("BEGIN");
    try {
      if (typeof migracion.aplicar === "string") db.exec(migracion.aplicar);
      else migracion.aplicar(db);
      db.exec(`PRAGMA user_version = ${migracion.version}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      const detalle = error instanceof Error ? error.message : String(error);
      throw new ErrorArranque(
        `No se pudo actualizar la base a la versión ${migracion.version} (${detalle}). Se revirtió: la base quedó como estaba.` +
          (respaldo ? ` Respaldo previo: ${respaldo}.` : ""),
      );
    }
  }
  verificarEsquema(db);
}
