import type { Server } from "node:http";
import { describe, expect, it } from "vitest";
import { createSummaryServer } from "../../src/api/summaryServer";
import type { PqrCase } from "../../src/domain/types";
import type { CaseRepository } from "../../src/store/repository";

function caso(over: Partial<PqrCase> & Pick<PqrCase, "id" | "sheetYear" | "rowNumber">): PqrCase {
  return {
    fechaInicial: "2026-01-05",
    fechaSolucion: null,
    fechaInicialInvalida: false,
    fechaSolucionInvalida: false,
    diasSolucion: null,
    area: null,
    areaOriginal: null,
    idOrden: null,
    asociado: "NOMBRE",
    correo: "a@b.co",
    fuente: null,
    fuenteOriginal: null,
    tipo: null,
    tipoOriginal: null,
    tema: null,
    temaOriginal: null,
    motivo: "texto libre",
    solucion: null,
    valorDevolucion: null,
    mesCompra: null,
    tipoDevolucion: null,
    fechaSolicitud: null,
    observaciones: null,
    ...over,
  };
}

function memoryRepo(cases: PqrCase[]): CaseRepository {
  return { replaceAll() {}, list: () => cases };
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") resolve(address.port);
    });
  });
}

describe("GET /summary", () => {
  it("returns totals for one open case and omits personal fields", async () => {
    const server = createSummaryServer(
      memoryRepo([caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2 })]),
    );
    const port = await listen(server);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/summary`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = await response.json();
      expect(body.total).toBe(1);
      expect(body.abiertos).toBe(1);
      expect(body.cerrados).toBe(0);
      expect(JSON.stringify(body)).not.toContain("NOMBRE");
      expect(JSON.stringify(body)).not.toContain("a@b.co");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("unknown routes", () => {
  it("returns 404 for GET /cases and POST /summary", async () => {
    const server = createSummaryServer(memoryRepo([]));
    const port = await listen(server);
    try {
      const cases = await fetch(`http://127.0.0.1:${port}/cases`);
      const posted = await fetch(`http://127.0.0.1:${port}/summary`, { method: "POST" });
      expect(cases.status).toBe(404);
      expect(await cases.json()).toEqual({ error: "not found" });
      expect(posted.status).toBe(404);
      expect(await posted.json()).toEqual({ error: "not found" });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
