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
  expect(db.list()).toEqual([row]);
  db.replaceAll([]);
  expect(db.list()).toEqual([]);
});

it("inserts and updates one case without dropping holidays", () => {
  const db = openSqliteRepository(path.join(os.tmpdir(), `pqr-${Date.now()}-h.sqlite`));
  const row = sample({ id: "app-1", sheetYear: 2026, rowNumber: 0 });
  db.addHolidays(["2026-01-01", "2026-01-01"]);
  db.insert(row);
  db.replaceAll([]);
  expect(db.list()).toEqual([]);
  expect(db.listHolidays()).toEqual(["2026-01-01"]);
  db.insert(row);
  db.update(sample({ id: "app-1", sheetYear: 2026, rowNumber: 0, solucion: "Listo" }));
  expect(db.list()[0]?.solucion).toBe("Listo");
});

it("keeps bitácora entries across replaceAll", () => {
  const db = openSqliteRepository(path.join(os.tmpdir(), `pqr-bit-${Date.now()}.sqlite`));
  db.replaceAll([sample()]);
  db.addBitacora("2026-2", { fecha: "2026-01-10", texto: "uno" }, "2026-01-10T10:00:00Z");
  const second = db.addBitacora("2026-2", { fecha: "2026-01-12", texto: "dos" }, "2026-01-12T10:00:00Z");
  db.replaceAll([sample()]);
  expect(db.listBitacora("2026-2").map((e) => e.texto)).toEqual(["dos", "uno"]);
  expect(db.listBitacora("2026-2")[0]).toEqual(second);
  expect(db.listBitacora("otro")).toEqual([]);
});

it("edits proveedor data, keeps it on rename and refuses a duplicate name", () => {
  const repo = openSqliteRepository(path.join(os.tmpdir(), `pqr-prov-${Date.now()}-${Math.random()}.sqlite`));
  repo.insert(sample());
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
