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
