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
    valorDevolucion: null,
    mesCompra: null,
    tipoDevolucion: null,
    fechaSolicitud: null,
    observaciones: null,
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
