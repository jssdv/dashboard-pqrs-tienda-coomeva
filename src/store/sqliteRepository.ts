import { DatabaseSync } from "node:sqlite";
import type { AuthRepository, Rol, UserRecord } from "../auth/repository.js";
import type { EnlaceRecord, ShareRepository } from "../share/repository.js";
import type { BitacoraEntry } from "../domain/caseForm.js";
import type { PqrCase } from "../domain/types.js";
import {
  ProveedorExistsError,
  sameName,
  type CaseRepository,
  type ProveedorFields,
  type ProveedorInfo,
} from "./repository.js";

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
  "causaRaiz",
  "accionCorrectiva",
] as const;

function flag(value: number): boolean {
  return value === 1;
}

interface UserRow extends Omit<UserRecord, "activo" | "rol"> {
  rol: Rol;
  activo: number;
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
    row.causaRaiz ?? null,
    row.accionCorrectiva ?? null,
  ];
}

export function openSqliteRepository(dbPath: string): CaseRepository & AuthRepository & ShareRepository {
  const db = new DatabaseSync(dbPath);
  // node:sqlite has no db.transaction(); BEGIN/COMMIT/ROLLBACK by hand, like better-sqlite3 did.
  const transaction =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      db.exec("BEGIN");
      try {
        fn(...args);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    };
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
  for (const added of ["causaRaiz", "accionCorrectiva"]) {
    if (!existing.has(added)) db.exec(`ALTER TABLE cases ADD COLUMN ${added} TEXT`);
  }
  const insert = db.prepare(
    `INSERT INTO cases (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(() => "?").join(", ")})`,
  );
  const replace = transaction((cases: PqrCase[]) => {
    db.exec("DELETE FROM cases");
    for (const row of cases) insert.run(...caseValues(row));
  });
  const update = db.prepare(
    `UPDATE cases SET ${COLUMNS.filter((column) => column !== "id")
      .map((column) => `${column} = ?`)
      .join(", ")} WHERE id = ?`,
  );
  const addHoliday = db.prepare("INSERT OR IGNORE INTO holidays (date) VALUES (?)");
  const addHolidaySet = transaction((dates: readonly string[]) => {
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
  const toUser = (row: UserRow): UserRecord => ({ ...row, activo: row.activo === 1 });
  const insertUser = db.prepare(
    "INSERT INTO users (usuario, passwordHash, rol, activo, creadoEn) VALUES (?, ?, ?, ?, ?)",
  );
  const updateUser = db.prepare("UPDATE users SET passwordHash = ?, rol = ?, activo = ? WHERE id = ?");
  const insertSession = db.prepare("INSERT INTO sessions (tokenHash, userId, expiraEn, creadoEn) VALUES (?, ?, ?, ?)");
  const storedColumns = new Set(
    (db.prepare("PRAGMA table_info(proveedores)").all() as Array<{ name: string }>).map(
      (column) => column.name,
    ),
  );
  for (const [column, type] of [
    ["contacto", "TEXT NOT NULL DEFAULT ''"],
    ["correo", "TEXT NOT NULL DEFAULT ''"],
    ["telefono", "TEXT NOT NULL DEFAULT ''"],
    ["notas", "TEXT NOT NULL DEFAULT ''"],
    ["activo", "INTEGER NOT NULL DEFAULT 1"],
    ["plazoDias", "INTEGER"],
  ] as const) {
    if (!storedColumns.has(column)) db.exec(`ALTER TABLE proveedores ADD COLUMN ${column} ${type}`);
  }
  const insertProveedor = db.prepare("INSERT OR IGNORE INTO proveedores (nombre) VALUES (?)");
  const names = (): string[] => {
    const stored = (
      db.prepare("SELECT nombre FROM proveedores").all() as Array<{ nombre: string }>
    ).map((row) => row.nombre);
    const used = (
      db.prepare(
        "SELECT DISTINCT area AS nombre FROM cases WHERE area IS NOT NULL AND trim(area) != ''",
      ).all() as Array<{ nombre: string }>
    ).map((row) => row.nombre);
    return [...new Set([...stored, ...used])].sort((a, b) => a.localeCompare(b, "es"));
  };
  const renameProveedorTx = transaction((desde: string, hacia: string) => {
    insertProveedor.run(desde);
    db.prepare("UPDATE proveedores SET nombre = ? WHERE nombre = ?").run(hacia, desde);
    db.prepare("UPDATE cases SET area = ? WHERE area = ?").run(hacia, desde);
  });
  const updateProveedorTx = transaction((nombre: string, fields: ProveedorFields) => {
    insertProveedor.run(nombre);
    db.prepare(
      "UPDATE proveedores SET contacto = ?, correo = ?, telefono = ?, notas = ?, activo = ?, plazoDias = ? WHERE nombre = ?",
    ).run(
      fields.contacto,
      fields.correo,
      fields.telefono,
      fields.notas,
      fields.activo ? 1 : 0,
      fields.plazoDias,
      nombre,
    );
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
      return names();
    },
    listProveedorInfo() {
      const stored = new Map(
        (
          db.prepare("SELECT * FROM proveedores").all() as Array<
            Omit<ProveedorInfo, "activo"> & { activo: number }
          >
        ).map((row) => [row.nombre, { ...row, activo: row.activo === 1 }]),
      );
      return names().map(
        (nombre) =>
          stored.get(nombre) ?? {
            nombre,
            contacto: "",
            correo: "",
            telefono: "",
            notas: "",
            activo: true,
            plazoDias: null,
          },
      );
    },
    addProveedor(nombre) {
      insertProveedor.run(nombre.trim().replace(/\s+/g, " "));
    },
    updateProveedor(nombre, fields) {
      updateProveedorTx(nombre, fields);
    },
    renameProveedor(desde, hacia) {
      const destino = hacia.trim().replace(/\s+/g, " ");
      if (names().some((nombre) => nombre !== desde && sameName(nombre, destino))) {
        throw new ProveedorExistsError(destino);
      }
      renameProveedorTx(desde, destino);
    },
    listBitacora(caseId) {
      return db
        .prepare("SELECT * FROM bitacora WHERE caseId = ? ORDER BY fecha DESC, id DESC")
        .all(caseId) as unknown as BitacoraEntry[];
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
    countUsers() {
      return (db.prepare("SELECT COUNT(*) AS total FROM users").get() as { total: number }).total;
    },
    listUsers() {
      return (db.prepare("SELECT * FROM users ORDER BY usuario").all() as unknown as UserRow[]).map(toUser);
    },
    findUserById(id) {
      const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
      return row ? toUser(row) : null;
    },
    findUserByUsuario(usuario) {
      const row = db.prepare("SELECT * FROM users WHERE usuario = ?").get(usuario) as UserRow | undefined;
      return row ? toUser(row) : null;
    },
    insertUser(user) {
      const { lastInsertRowid } = insertUser.run(
        user.usuario,
        user.passwordHash,
        user.rol,
        user.activo ? 1 : 0,
        user.creadoEn,
      );
      return { id: Number(lastInsertRowid), ...user };
    },
    updateUser(user) {
      updateUser.run(user.passwordHash, user.rol, user.activo ? 1 : 0, user.id);
    },
    insertSession(tokenHash, userId, expiraEn, creadoEn) {
      insertSession.run(tokenHash, userId, expiraEn, creadoEn);
    },
    findSession(tokenHash) {
      const row = db.prepare("SELECT userId, expiraEn FROM sessions WHERE tokenHash = ?").get(tokenHash) as
        | { userId: number; expiraEn: string }
        | undefined;
      return row ?? null;
    },
    deleteSession(tokenHash) {
      db.prepare("DELETE FROM sessions WHERE tokenHash = ?").run(tokenHash);
    },
    deleteSessionsOfUser(userId) {
      db.prepare("DELETE FROM sessions WHERE userId = ?").run(userId);
    },
    listEnlaces() {
      return (
        db
          .prepare(
            `SELECT e.id, u.usuario AS creadoPor, e.expira, e.revocado
             FROM enlaces e LEFT JOIN users u ON u.id = e.creado_por ORDER BY e.id DESC`,
          )
          .all() as Array<Omit<EnlaceRecord, "revocado"> & { revocado: number }>
      ).map((row) => ({ ...row, creadoPor: row.creadoPor ?? "", revocado: row.revocado === 1 }));
    },
    insertEnlace(tokenHash, creadoPor, expira) {
      const { lastInsertRowid } = db
        .prepare("INSERT INTO enlaces (token_hash, creado_por, expira) VALUES (?, ?, ?)")
        .run(tokenHash, creadoPor, expira);
      return Number(lastInsertRowid);
    },
    findEnlaceByHash(tokenHash) {
      const row = db
        .prepare(
          `SELECT e.id, u.usuario AS creadoPor, e.expira, e.revocado
           FROM enlaces e LEFT JOIN users u ON u.id = e.creado_por WHERE e.token_hash = ?`,
        )
        .get(tokenHash) as { id: number; creadoPor: string | null; expira: string | null; revocado: number } | undefined;
      return row ? { ...row, creadoPor: row.creadoPor ?? "", revocado: row.revocado === 1 } : null;
    },
    revokeEnlace(id) {
      return db.prepare("UPDATE enlaces SET revocado = 1 WHERE id = ?").run(id).changes > 0;
    },
    getAjuste(clave) {
      const row = db.prepare("SELECT valor FROM ajustes WHERE clave = ?").get(clave) as { valor: string } | undefined;
      return row?.valor ?? null;
    },
    setAjuste(clave, valor) {
      db.prepare("INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").run(
        clave,
        valor,
      );
    },
  };
}
