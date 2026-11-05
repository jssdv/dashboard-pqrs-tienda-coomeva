import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import type { PqrCase } from "../../src/domain/types.js";
import { openSqliteRepository } from "../../src/store/sqliteRepository.js";

function sample(overrides: Partial<PqrCase> = {}): PqrCase {
  return {
    id: "2026-2",
    sheetYear: 2026,
    rowNumber: 2,
    fechaInicial: null,
    fechaSolucion: null,
    fechaInicialInvalida: true,
    fechaSolucionInvalida: false,
    diasSolucion: null,
    area: "Tienda Coomeva",
    areaOriginal: "Tienda Coomeva",
    idOrden: null,
    asociado: "NOMBRE",
    correo: null,
    fuente: null,
    fuenteOriginal: null,
    tipo: null,
    tipoOriginal: null,
    tema: "BOLETERIA",
    temaOriginal: "CINE",
    motivo: "texto",
    solucion: null,
    causaRaiz: null,
    accionCorrectiva: null,
    ...overrides,
  };
}

it("replaces the case set and round-trips flags", () => {
  const db = openSqliteRepository(path.join(os.tmpdir(), `pqr-${Date.now()}.sqlite`));
  const row = sample();
  db.replaceAll([row]);
  // Importados no tienen autoría: creadoPor y cerradoPor llegan nulos.
  expect(db.list()).toEqual([{ ...row, creadoPor: null, cerradoPor: null }]);
  db.replaceAll([]);
  expect(db.list()).toEqual([]);
});

it("inserts and updates one case without dropping holidays", () => {
  const db = openSqliteRepository(path.join(os.tmpdir(), `pqr-${Date.now()}-h.sqlite`));
  const row = sample({ id: "app-1", sheetYear: 2026, rowNumber: 0 });
  db.addHolidays(["2026-01-01", "2026-01-01"]);
  db.insert(row, "ana");
  db.replaceAll([]);
  expect(db.list()).toEqual([]);
  expect(db.listHolidays()).toEqual(["2026-01-01"]);
  db.insert(row, "ana");
  db.update(sample({ id: "app-1", sheetYear: 2026, rowNumber: 0, solucion: "Listo" }));
  expect(db.list()[0]?.solucion).toBe("Listo");
  expect(db.list()[0]?.creadoPor).toBe("ana");
});

it("records who opened and who closed a case, and removes a case with its bitácora", () => {
  const db = openSqliteRepository(path.join(os.tmpdir(), `pqr-audit-${Date.now()}.sqlite`));
  db.insert(sample({ id: "app-9" }), "ana");
  db.update(sample({ id: "app-9", fechaSolucion: "2026-01-20", solucion: "Listo" }), "luis");
  db.addBitacora("app-9", { fecha: "2026-01-10", texto: "uno" }, "2026-01-10T10:00:00Z", "ana");
  expect(db.list()[0]).toMatchObject({ creadoPor: "ana", cerradoPor: "luis" });
  // Editar después no cambia quién cerró.
  db.update(sample({ id: "app-9", fechaSolucion: "2026-01-20", solucion: "Otra" }));
  expect(db.list()[0]).toMatchObject({ cerradoPor: "luis", solucion: "Otra" });
  db.remove("app-9");
  expect(db.list()).toEqual([]);
  expect(db.listBitacora("app-9")).toEqual([]);
});

it("keeps bitácora entries across replaceAll", () => {
  const db = openSqliteRepository(path.join(os.tmpdir(), `pqr-bit-${Date.now()}.sqlite`));
  db.replaceAll([sample()]);
  db.addBitacora("2026-2", { fecha: "2026-01-10", texto: "uno" }, "2026-01-10T10:00:00Z", "ana");
  const second = db.addBitacora("2026-2", { fecha: "2026-01-12", texto: "dos" }, "2026-01-12T10:00:00Z", "luis");
  db.replaceAll([sample()]);
  expect(db.listBitacora("2026-2").map((e) => e.texto)).toEqual(["dos", "uno"]);
  expect(db.listBitacora("2026-2")[0]).toEqual(second);
  expect(db.listBitacora("2026-2")[0]?.autor).toBe("luis");
  expect(db.listBitacora("otro")).toEqual([]);
});

it("edits and deletes one bitácora entry, keeping its author", () => {
  const db = openSqliteRepository(path.join(os.tmpdir(), `pqr-bit-edit-${Date.now()}.sqlite`));
  const entry = db.addBitacora("2026-2", { fecha: "2026-01-10", texto: "uno" }, "2026-01-10T10:00:00Z", "ana");
  db.updateBitacora(entry.id, { fecha: "2026-01-11", texto: "uno editado" });
  expect(db.getBitacora(entry.id)).toMatchObject({ fecha: "2026-01-11", texto: "uno editado", autor: "ana" });
  db.removeBitacora(entry.id);
  expect(db.getBitacora(entry.id)).toBeNull();
});

it("edits proveedor data, keeps it on rename and refuses a duplicate name", () => {
  const repo = openSqliteRepository(path.join(os.tmpdir(), `pqr-prov-${Date.now()}-${Math.random()}.sqlite`));
  repo.insert(sample(), "ana");
  repo.addProveedor("Natech");
  repo.updateProveedor("Natech", {
    contacto: "Ana",
    correo: "ana@natech.co",
    telefono: "300",
    notas: "",
    activo: false,
    plazoDias: 5,
  });
  repo.renameProveedor("Natech", "Natech SAS");
  expect(repo.listProveedorInfo().find((p) => p.nombre === "Natech SAS")).toMatchObject({
    contacto: "Ana",
    activo: false,
    plazoDias: 5,
  });
  expect(() => repo.renameProveedor("Natech SAS", "TIENDA COOMEVA")).toThrow(/Ya existe/);
});
