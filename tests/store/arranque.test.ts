import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { MANTENER_RESPALDOS } from "../../src/store/arranque.js";
import { MIGRACIONES, TODAS_LAS_MIGRACIONES, userVersion } from "../../src/store/esquema.js";
import { openSqliteRepository } from "../../src/store/sqliteRepository.js";

const tmp = () => mkdtempSync(path.join(os.tmpdir(), "pqr-arranque-"));
const raw = (file: string, sql: string) => {
  const db = new DatabaseSync(file);
  db.exec(sql);
  db.close();
};
const version = (file: string) => {
  const db = new DatabaseSync(file);
  const v = userVersion(db);
  db.close();
  return v;
};
const respaldosEn = (dir: string) => readdirSync(dir).filter((n) => n.endsWith(".sqlite"));

describe("arranque de la base", () => {
  it("fresh DB gets the baseline version and no backup", () => {
    const dir = tmp();
    const file = path.join(dir, "pqr.sqlite");
    openSqliteRepository(file, { respaldos: path.join(dir, "respaldos") }).cerrar();
    expect(version(file)).toBe(TODAS_LAS_MIGRACIONES.at(-1)!.version);
    expect(existsSync(path.join(dir, "respaldos"))).toBe(false);
  });

  it("legacy DB (user_version 0, one column removed) is repaired and stamped", () => {
    const dir = tmp();
    const file = path.join(dir, "pqr.sqlite");
    openSqliteRepository(file, { respaldos: path.join(dir, "respaldos") }).cerrar();
    raw(
      file,
      "ALTER TABLE cases DROP COLUMN accionCorrectiva; ALTER TABLE proveedores DROP COLUMN notas; " +
        "ALTER TABLE cases DROP COLUMN creadoPor; ALTER TABLE cases DROP COLUMN cerradoPor; " +
        "ALTER TABLE bitacora DROP COLUMN autor; PRAGMA user_version = 0",
    );

    openSqliteRepository(file, { respaldos: path.join(dir, "respaldos") }).cerrar();

    const db = new DatabaseSync(file);
    const cols = (db.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>).map((c) => c.name);
    expect(cols).toContain("accionCorrectiva");
    expect(userVersion(db)).toBe(TODAS_LAS_MIGRACIONES.at(-1)!.version);
    db.close();
  });

  it("refuses a DB with a newer user_version and leaves the file untouched", () => {
    const dir = tmp();
    const file = path.join(dir, "pqr.sqlite");
    openSqliteRepository(file, { respaldos: path.join(dir, "respaldos") }).cerrar();
    raw(file, "PRAGMA user_version = 99");
    const before = readFileSync(file);

    expect(() => openSqliteRepository(file, { respaldos: path.join(dir, "respaldos") })).toThrow(
      /creó una versión más nueva de PQR.*No se modificó/,
    );
    expect(readFileSync(file).equals(before)).toBe(true);
    expect(existsSync(path.join(dir, "respaldos"))).toBe(false);
  });

  it("corrupt file gives a clear error that points to the newest backup and deletes nothing", () => {
    const dir = tmp();
    const file = path.join(dir, "pqr.sqlite");
    const respaldos = path.join(dir, "respaldos");
    openSqliteRepository(file, { respaldos }).cerrar();
    openSqliteRepository(file, { respaldos }).cerrar(); // second start leaves a backup
    const ultimo = path.join(respaldos, respaldosEn(respaldos)[0]);
    writeFileSync(file, "esto no es una base de datos ".repeat(200));

    expect(() => openSqliteRepository(file, { respaldos })).toThrow(/dañada.*Respaldo más reciente:/s);
    expect(() => openSqliteRepository(file, { respaldos })).toThrow(ultimo);
    expect(existsSync(ultimo)).toBe(true);
    expect(readFileSync(file, "utf8")).toContain("esto no es una base");
  });

  it("creates a backup on every start and keeps the newest 10", () => {
    const dir = tmp();
    const file = path.join(dir, "pqr.sqlite");
    const respaldos = path.join(dir, "respaldos");
    for (let i = 0; i < MANTENER_RESPALDOS + 3; i++) openSqliteRepository(file, { respaldos }).cerrar();
    expect(respaldosEn(respaldos)).toHaveLength(MANTENER_RESPALDOS);
  });

  it("a failing migration rolls back, keeps the old version and leaves the backup", () => {
    const dir = tmp();
    const file = path.join(dir, "pqr.sqlite");
    const respaldos = path.join(dir, "respaldos");
    openSqliteRepository(file, { respaldos }).cerrar();
    const rota = [
      ...MIGRACIONES,
      { version: 3, aplicar: "CREATE TABLE nueva (x INTEGER); INSERT INTO no_existe VALUES (1);" },
    ];
    const migraciones = [TODAS_LAS_MIGRACIONES[0], ...rota];

    expect(() => openSqliteRepository(file, { respaldos, migraciones })).toThrow(
      /versión 3.*Se revirtió.*Respaldo previo/s,
    );
    const db = new DatabaseSync(file);
    expect(userVersion(db)).toBe(TODAS_LAS_MIGRACIONES.at(-1)!.version);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'nueva'").all()).toHaveLength(0);
    db.close();
    expect(respaldosEn(respaldos).length).toBeGreaterThan(0);
  });

  it("applies a pending migration in order and stamps its version", () => {
    const dir = tmp();
    const file = path.join(dir, "pqr.sqlite");
    const respaldos = path.join(dir, "respaldos");
    openSqliteRepository(file, { respaldos }).cerrar();
    const migraciones = [
      TODAS_LAS_MIGRACIONES[0],
      { version: 2, aplicar: "CREATE TABLE extra (x INTEGER)" },
    ];

    openSqliteRepository(file, { respaldos, migraciones }).cerrar();

    expect(version(file)).toBe(2);
  });
});
