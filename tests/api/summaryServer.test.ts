import ExcelJS from "exceljs";
import type { Server } from "node:http";
import { describe, expect, it } from "vitest";
import { createSummaryServer, type SummaryServerOptions } from "../../src/api/summaryServer";
import { Dictionary } from "../../src/domain/dictionary";
import type { BitacoraEntry } from "../../src/domain/caseForm.js";
import type { PqrCase } from "../../src/domain/types";
import type { CaseRepository } from "../../src/store/repository";
import { createSession } from "../../src/auth/sessions";
import { openSqliteRepository } from "../../src/store/sqliteRepository";

// One in-memory auth store with an admin session, shared by every server in this file.
const auth = openSqliteRepository(":memory:");
const admin = auth.insertUser({
  usuario: "admin",
  passwordHash: "unused",
  rol: "admin",
  activo: true,
  creadoEn: "2026-01-01T00:00:00.000Z",
});
const SESSION_COOKIE = `pqr_session=${createSession(auth, admin.id)}`;

function authed(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), cookie: SESSION_COOKIE } });
}

function serve(repo: CaseRepository, options: Omit<SummaryServerOptions, "auth"> = {}): Server {
  return createSummaryServer(repo, { ...options, auth });
}

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
    ...over,
  };
}

const infoOf = (nombre: string) => ({
  nombre,
  contacto: "",
  correo: "",
  telefono: "",
  notas: "",
  activo: true,
  plazoDias: null,
});

function memoryRepo(cases: PqrCase[], holidays: string[] = ["2026-01-01"]): CaseRepository {
  const rows = [...cases];
  const dates = [...holidays];
  const notes: BitacoraEntry[] = [];
  return {
    replaceAll(next) {
      rows.splice(0, rows.length, ...next);
    },
    list: () => rows,
    insert(row) {
      rows.push(row);
    },
    update(row) {
      const index = rows.findIndex((item) => item.id === row.id);
      if (index >= 0) rows[index] = row;
    },
    remove(id) {
      const index = rows.findIndex((item) => item.id === id);
      if (index >= 0) rows.splice(index, 1);
    },
    listHolidays: () => dates,
    addHolidays(more) {
      dates.push(...more);
    },
    listProveedores: () => [],
    listProveedorInfo: () => [],
    addProveedor() {},
    updateProveedor() {},
    renameProveedor() {},
    listBitacora: (caseId) =>
      notes.filter((n) => n.caseId === caseId).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id),
    getBitacora: (id) => notes.find((n) => n.id === id) ?? null,
    addBitacora(caseId, fields, creadoEn, autor) {
      const entry = { id: notes.length + 1, caseId, ...fields, creadoEn, autor };
      notes.push(entry);
      return entry;
    },
    updateBitacora(id, fields) {
      const entry = notes.find((n) => n.id === id);
      if (entry) Object.assign(entry, fields);
    },
    removeBitacora(id) {
      const index = notes.findIndex((n) => n.id === id);
      if (index >= 0) notes.splice(index, 1);
    },
  };
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
    const server = serve(
      memoryRepo([caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2 })]),
    );
    const port = await listen(server);
    try {
      const response = await authed(`http://127.0.0.1:${port}/summary`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = await response.json();
      expect(body.total).toBe(1);
      expect(body.abiertos).toBe(1);
      expect(body.cerrados).toBe(0);
      expect(JSON.stringify(body)).not.toContain("NOMBRE");
      expect(JSON.stringify(body)).not.toContain("a@b.co");
      expect(JSON.stringify(body)).not.toContain("texto libre");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("unknown routes", () => {
  it("returns 404 for GET /cases and POST /summary", async () => {
    const server = serve(memoryRepo([]));
    const port = await listen(server);
    try {
      const cases = await authed(`http://127.0.0.1:${port}/cases`);
      const posted = await authed(`http://127.0.0.1:${port}/summary`, { method: "POST" });
      expect(cases.status).toBe(404);
      expect(await cases.json()).toEqual({ error: "not found" });
      expect(posted.status).toBe(404);
      expect(await posted.json()).toEqual({ error: "not found" });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

const dictionary = new Dictionary(new Map([["tipo:RECLAMOS", "RECLAMO"]]));

function jsonPost(fields: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fields),
  };
}

const validCreate = {
  fechaInicial: "2026-01-05",
  area: "Tienda",
  idOrden: "ORD-1",
  asociado: "Ana Ruiz",
  correo: "ana@coomeva.com.co",
  fuente: "Correo",
  tipo: "RECLAMOS",
  tema: "CINE",
  motivo: "No llegó",
};

describe("GET /api/casos", () => {
  it("returns full cases and applies cola, area, tipo, and mes filters", async () => {
    const server = serve(
      memoryRepo([
        caso({
          id: "2026-2",
          sheetYear: 2026,
          rowNumber: 2,
          tipo: "RECLAMO",
          area: "Tienda",
          fechaInicial: "2026-01-05",
        }),
        caso({
          id: "2026-3",
          sheetYear: 2026,
          rowNumber: 3,
          tipo: "QUEJA",
          area: "Boletería",
          fechaInicial: "2026-02-02",
          fechaSolucion: "2026-02-03",
          diasSolucion: 2,
        }),
      ]),
      { now: () => new Date("2026-01-26T15:00:00Z") },
    );
    const port = await listen(server);
    try {
      const all = await authed(`http://127.0.0.1:${port}/api/casos`);
      expect(all.status).toBe(200);
      const body = await all.json();
      expect(body.cases).toHaveLength(2);
      expect(JSON.stringify(body)).toContain("NOMBRE");
      expect(JSON.stringify(body)).toContain("a@b.co");
      expect(JSON.stringify(body)).toContain("texto libre");

      const byTipo = await authed(`http://127.0.0.1:${port}/api/casos?tipo=QUEJA`);
      expect((await byTipo.json()).cases.map((row: { id: string }) => row.id)).toEqual(["2026-3"]);
      const byArea = await authed(`http://127.0.0.1:${port}/api/casos?area=Tienda`);
      expect((await byArea.json()).cases).toHaveLength(1);
      const byMes = await authed(`http://127.0.0.1:${port}/api/casos?mes=2026-02`);
      expect((await byMes.json()).cases.map((row: { id: string }) => row.id)).toEqual(["2026-3"]);
      const queue = await authed(`http://127.0.0.1:${port}/api/casos?cola=vencida`);
      expect(queue.status).toBe(200);
      expect((await queue.json()).cases.map((row: { id: string }) => row.id)).toEqual(["2026-2"]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("returns 503 for the overdue queue when holidays are missing", async () => {
    const server = serve(memoryRepo([], []), {
      now: () => new Date("2026-01-19T15:00:00Z"),
    });
    const port = await listen(server);
    try {
      const queue = await authed(`http://127.0.0.1:${port}/api/casos?cola=vencida`);
      expect(queue.status).toBe(503);
      expect(await queue.json()).toEqual({
        error: "No hay festivos cargados. La cola no se puede calcular.",
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("GET /api/casos plazo", () => {
  const rows = () => [
    caso({ id: "venc", sheetYear: 2026, rowNumber: 2, fechaInicial: "2026-01-05" }),
    caso({ id: "porv", sheetYear: 2026, rowNumber: 3, fechaInicial: "2026-01-12" }),
    caso({ id: "plazo", sheetYear: 2026, rowNumber: 4, fechaInicial: "2026-01-16" }),
    caso({
      id: "cerr",
      sheetYear: 2026,
      rowNumber: 5,
      fechaInicial: "2026-01-05",
      fechaSolucion: "2026-01-06",
      diasSolucion: 2,
    }),
  ];
  const now = () => new Date("2026-01-26T15:00:00Z");

  it("filters by plazo and attaches riesgo only to open cases", async () => {
    const server = serve(memoryRepo(rows()), { now });
    const port = await listen(server);
    try {
      const base = `http://127.0.0.1:${port}/api/casos`;
      const venc = await (await authed(`${base}?plazo=vencido`)).json();
      expect(venc.cases.map((row: { id: string }) => row.id)).toEqual(["venc"]);
      const porv = await (await authed(`${base}?plazo=por-vencer`)).json();
      expect(porv.cases.map((row: { id: string }) => row.id)).toEqual(["porv"]);
      const all = await (await authed(base)).json();
      const byId = Object.fromEntries(all.cases.map((row: { id: string }) => [row.id, row]));
      expect(byId.plazo.riesgo.estado).toBe("en-plazo");
      expect(byId.venc.riesgo).toMatchObject({ diasAbiertos: 16, diasParaVencer: -1 });
      expect(byId.cerr.riesgo).toBeUndefined();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("returns 503 for plazo without holidays and omits riesgo otherwise", async () => {
    const server = serve(memoryRepo(rows(), []), { now });
    const port = await listen(server);
    try {
      const base = `http://127.0.0.1:${port}/api/casos`;
      const blocked = await authed(`${base}?plazo=vencido`);
      expect(blocked.status).toBe(503);
      const all = await (await authed(base)).json();
      expect(all.cases.some((row: { riesgo?: unknown }) => row.riesgo !== undefined)).toBe(false);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("GET /api/proveedores/:nombre/linea", () => {
  it("returns monthly points for an encoded provider name and no personal fields", async () => {
    const server = serve(
      memoryRepo([
        caso({
          id: "1",
          sheetYear: 2026,
          rowNumber: 2,
          area: "Educación / Coomeva",
          fechaInicial: "2026-01-05",
          fechaSolucion: "2026-02-03",
          diasSolucion: 4,
        }),
      ]),
    );
    const port = await listen(server);
    try {
      const response = await authed(
        `http://127.0.0.1:${port}/api/proveedores/${encodeURIComponent("Educación / Coomeva")}/linea`,
      );
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(JSON.parse(text).puntos).toEqual([
        { mes: "2026-01", entrados: 1, cerrados: 0, diasPromedio: null },
        { mes: "2026-02", entrados: 0, cerrados: 1, diasPromedio: 4 },
      ]);
      expect(text).not.toContain("NOMBRE");
      expect(text).not.toContain("a@b.co");
      expect(text).not.toContain("texto libre");
      const none = await authed(`http://127.0.0.1:${port}/api/proveedores/Nadie/linea`);
      expect(none.status).toBe(200);
      expect((await none.json()).puntos).toEqual([]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("GET /api/proveedores metrics", () => {
  const now = () => new Date("2026-01-26T15:00:00Z");
  const rows = () => [
    caso({ id: "1", sheetYear: 2026, rowNumber: 2, area: "Tienda", fechaInicial: "2026-01-05" }),
    caso({ id: "2", sheetYear: 2026, rowNumber: 3, area: "Tienda", fechaInicial: "2026-01-16" }),
    caso({
      id: "3",
      sheetYear: 2026,
      rowNumber: 4,
      area: "Tienda",
      fechaInicial: "2026-01-05",
      fechaSolucion: "2026-01-09",
      diasSolucion: 4,
    }),
    caso({ id: "4", sheetYear: 2026, rowNumber: 5, area: "Sin cierres", fechaInicial: "2026-01-16" }),
  ];
  const withProveedores = (repo: CaseRepository, names: string[]): CaseRepository => ({
    ...repo,
    listProveedores: () => names,
    listProveedorInfo: () => names.map(infoOf),
  });

  it("returns abiertos, vencidos and diasPromedio per provider", async () => {
    const server = serve(withProveedores(memoryRepo(rows()), ["Tienda", "Sin cierres"]), { now });
    const port = await listen(server);
    try {
      const body = await (await authed(`http://127.0.0.1:${port}/api/proveedores`)).json();
      const byName = Object.fromEntries(body.proveedores.map((row: { nombre: string }) => [row.nombre, row]));
      expect(byName.Tienda).toMatchObject({ casos: 3, abiertos: 2, vencidos: 1, diasPromedio: 4 });
      expect(byName["Sin cierres"]).toMatchObject({ casos: 1, abiertos: 1, vencidos: 0, diasPromedio: null });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("returns vencidos null without holidays", async () => {
    const server = serve(withProveedores(memoryRepo(rows(), []), ["Tienda"]), { now });
    const port = await listen(server);
    try {
      const body = await (await authed(`http://127.0.0.1:${port}/api/proveedores`)).json();
      expect(body.proveedores[0].vencidos).toBeNull();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("GET /api/casos fecha=invalida", () => {
  it("returns only cases without a usable start date", async () => {
    const server = serve(
      memoryRepo([
        caso({ id: "nula", sheetYear: 2026, rowNumber: 2, fechaInicial: null }),
        caso({ id: "mala", sheetYear: 2026, rowNumber: 3, fechaInicialInvalida: true }),
        caso({ id: "ok", sheetYear: 2026, rowNumber: 4 }),
      ]),
    );
    const port = await listen(server);
    try {
      const body = await (await authed(`http://127.0.0.1:${port}/api/casos?fecha=invalida`)).json();
      expect(body.cases.map((row: { id: string }) => row.id)).toEqual(["nula", "mala"]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("GET /api/catalogos and catalog validation on create", () => {
  const base = () => [
    caso({ id: "1", sheetYear: 2026, rowNumber: 2, area: "Tienda", fuente: "Correo Tienda", tipo: "RECLAMO", tema: "BOLETERIA" }),
    caso({ id: "2", sheetYear: 2026, rowNumber: 3, area: "Tienda", fuente: "Llamada", tipo: "QUEJA", tema: "BOLETERIA" }),
    caso({ id: "3", sheetYear: 2026, rowNumber: 4, area: null, fuente: null, tipo: "RECLAMO", tema: "  " }),
  ];
  const withProveedores = (repo: CaseRepository, names: string[]): CaseRepository => ({
    ...repo,
    listProveedores: () => names,
    listProveedorInfo: () => names.map(infoOf),
  });

  it("returns distinct sorted official values without empties", async () => {
    const server = serve(withProveedores(memoryRepo(base()), ["Zeta", "Tienda"]));
    const port = await listen(server);
    try {
      const body = await (await authed(`http://127.0.0.1:${port}/api/catalogos`)).json();
      expect(body).toEqual({
        area: ["Tienda", "Zeta"],
        fuente: ["Correo Tienda", "Llamada"],
        tipo: ["QUEJA", "RECLAMO"],
        tema: ["BOLETERIA"],
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("returns empty lists when nothing is loaded", async () => {
    const server = serve(memoryRepo([]));
    const port = await listen(server);
    try {
      const body = await (await authed(`http://127.0.0.1:${port}/api/catalogos`)).json();
      expect(body).toEqual({ area: [], fuente: [], tipo: [], tema: [] });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("rejects a create whose Fuente is not in the loaded list", async () => {
    const repo = withProveedores(memoryRepo(base()), ["Tienda"]);
    const server = serve(repo, { dictionary });
    const port = await listen(server);
    try {
      const response = await authed(
        `http://127.0.0.1:${port}/api/casos`,
        jsonPost({ ...validCreate, area: "Tienda", fuente: "Telegrama", tipo: "RECLAMO", tema: "BOLETERIA" }),
      );
      expect(response.status).toBe(400);
      expect((await response.json()).errors).toEqual([{ field: "fuente", message: "Fuente no está en la lista" }]);
      expect(repo.list()).toHaveLength(3);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("creates the case storing the list's canonical values", async () => {
    const repo = withProveedores(memoryRepo(base()), ["Tienda"]);
    const server = serve(repo, { dictionary });
    const port = await listen(server);
    try {
      const response = await authed(
        `http://127.0.0.1:${port}/api/casos`,
        jsonPost({ ...validCreate, area: "tienda", fuente: "correo tienda", tipo: "reclamo", tema: "boleteria" }),
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toMatchObject({ area: "Tienda", fuente: "Correo Tienda", tipo: "RECLAMO", tema: "BOLETERIA" });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("GET /api/casos/exportar", () => {
  const now = () => new Date("2026-01-26T15:00:00Z");
  const base = () => [
    caso({ id: "venc", sheetYear: 2026, rowNumber: 2, fechaInicial: "2026-01-05", area: "Tienda", tipo: "RECLAMO", tema: "Cine", idOrden: "ORD-1", asociado: "Ana Ruiz" }),
    caso({ id: "plazo", sheetYear: 2026, rowNumber: 3, fechaInicial: "2026-01-16", area: "Lagobo", tipo: "QUEJA", tema: "Bonos", idOrden: "ORD-2", asociado: "Luis" }),
    caso({ id: "cerr", sheetYear: 2026, rowNumber: 4, fechaInicial: "2026-01-05", fechaSolucion: "2026-01-09", diasSolucion: 4, area: "Tienda", tipo: "RECLAMO", tema: "Cine", idOrden: "ORD-3", asociado: "Ana Ruiz" }),
  ];

  async function download(query: string, repo: CaseRepository = memoryRepo(base())) {
    const server = serve(repo, { now });
    const port = await listen(server);
    try {
      const response = await authed(`http://127.0.0.1:${port}/api/casos/exportar${query}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      return { response, buffer };
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  async function rowsOf(buffer: Buffer): Promise<string[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Casos");
    const ids: string[] = [];
    sheet?.eachRow((row, index) => {
      if (index > 1) ids.push(String(row.getCell(1).value));
    });
    return ids;
  }

  it("returns an xlsx attachment named with today's date", async () => {
    const { response, buffer } = await download("");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="casos-2026-01-26.xlsx"');
    expect(await rowsOf(buffer)).toEqual(["ORD-1", "ORD-2", "ORD-3"]);
  });

  it("applies the same filters as the list, including estado, tema and q", async () => {
    expect(await rowsOf((await download("?estado=abiertos")).buffer)).toEqual(["ORD-1", "ORD-2"]);
    expect(await rowsOf((await download("?area=Tienda&estado=cerrados")).buffer)).toEqual(["ORD-3"]);
    expect(await rowsOf((await download("?plazo=vencido")).buffer)).toEqual(["ORD-1"]);
    expect(await rowsOf((await download("?tema=Bonos")).buffer)).toEqual(["ORD-2"]);
    expect(await rowsOf((await download("?q=ana")).buffer)).toEqual(["ORD-1", "ORD-3"]);
    expect(await rowsOf((await download("?q=zzz")).buffer)).toEqual([]);
  });

  it("lists the applied filters on the Filtros sheet", async () => {
    const { buffer } = await download("?estado=abiertos&area=Tienda");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const text = (workbook.getWorksheet("Filtros")?.getSheetValues() as unknown[][]).flat().filter(Boolean).join("|");
    expect(text).toContain("Estado: abiertos");
    expect(text).toContain("Proveedor: Tienda");
  });

  it("returns 503 as JSON when plazo cannot be computed without holidays", async () => {
    const { response, buffer } = await download("?plazo=vencido", memoryRepo(base(), []));
    expect(response.status).toBe(503);
    expect(JSON.parse(buffer.toString("utf8")).error).toContain("festivos");
  });
});

describe("POST /api/admin/importar", () => {
  async function libro(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("PQRs 2026");
    sheet.addRow(["FECHA INICIAL", "FECHA SOLUCION", "AREA", "ASOCIADO", "PQRs"]);
    sheet.addRow([46027, 46027, "Tienda Coomeva", "NOMBRE", "motivo"]);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
  // Holidays for 2025-2027 come from extraHolidays, so no request should leave the server.
  const offline = { extraHolidays: ["2025-01-01", "2026-01-01", "2027-01-01"], fetchImpl: (async () => ({ ok: false, status: 500 }) as Response) as typeof fetch };

  it("replaces every case with the workbook rows for an admin", async () => {
    const repo = memoryRepo([caso({ id: "viejo", sheetYear: 2025, rowNumber: 2 })]);
    const server = serve(repo, { dictionary, ...offline });
    const port = await listen(server);
    try {
      const response = await authed(`http://127.0.0.1:${port}/api/admin/importar`, { method: "POST", body: await libro() });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ imported: 1, skipped: 0 });
      expect(repo.list().map((row) => row.id)).not.toContain("viejo");
      expect(repo.list()).toHaveLength(1);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("refuses a user without the admin role and keeps the cases", async () => {
    const user = auth.insertUser({ usuario: "operadora", passwordHash: "unused", rol: "user", activo: true, creadoEn: "2026-01-01T00:00:00.000Z" });
    const repo = memoryRepo([caso({ id: "viejo", sheetYear: 2025, rowNumber: 2 })]);
    const server = serve(repo, { dictionary, ...offline });
    const port = await listen(server);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/admin/importar`, {
        method: "POST",
        headers: { cookie: `pqr_session=${createSession(auth, user.id)}` },
        body: await libro(),
      });
      expect(response.status).toBe(403);
      expect(repo.list().map((row) => row.id)).toEqual(["viejo"]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("POST /api/casos", () => {
  it("returns 400 with the field list and does not insert", async () => {
    const repo = memoryRepo([]);
    const server = serve(repo, { dictionary });
    const port = await listen(server);
    try {
      const invalid = await authed(
        `http://127.0.0.1:${port}/api/casos`,
        jsonPost({ area: "Tienda", correo: "ana" }),
      );
      expect(invalid.status).toBe(400);
      const body = await invalid.json();
      expect(body.errors.map((error: { field: string }) => error.field)).toEqual(
        expect.arrayContaining(["fechaInicial", "idOrden", "asociado", "correo", "fuente", "tipo", "tema", "motivo"]),
      );
      expect(repo.list()).toEqual([]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("creates a case with an app id and the official catalog value", async () => {
    const repo = memoryRepo([]);
    const server = serve(repo, { dictionary });
    const port = await listen(server);
    try {
      const created = await authed(`http://127.0.0.1:${port}/api/casos`, jsonPost(validCreate));
      expect(created.status).toBe(201);
      const body = await created.json();
      expect(body.id.startsWith("app-")).toBe(true);
      expect(body.tipo).toBe("RECLAMO");
      expect(body.tipoOriginal).toBe("RECLAMOS");
      expect(body.asociado).toBe("Ana Ruiz");
      expect(repo.list()).toHaveLength(1);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("returns 503 when the holiday year cannot be loaded", async () => {
    const fetchImpl = (async () => {
      throw new Error("holiday request failed");
    }) as typeof fetch;
    const repo = memoryRepo([], ["2025-01-01"]);
    const server = serve(repo, { dictionary, fetchImpl });
    const port = await listen(server);
    try {
      const created = await authed(
        `http://127.0.0.1:${port}/api/casos`,
        jsonPost({ ...validCreate, fechaInicial: "2026-03-02" }),
      );
      expect(created.status).toBe(503);
      expect(repo.list()).toEqual([]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("loads a missing holiday year before creating", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(String(url));
      const year = String(url).match(/(\d{4})/)?.[1];
      return { ok: true, status: 200, json: async () => ({ holidays: [{ date: `${year}-01-01` }] }) } as Response;
    }) as typeof fetch;
    const repo = memoryRepo([], ["2025-01-01"]);
    const server = serve(repo, { dictionary, fetchImpl });
    const port = await listen(server);
    try {
      const created = await authed(
        `http://127.0.0.1:${port}/api/casos`,
        jsonPost({ ...validCreate, fechaInicial: "2026-03-02", idOrden: "ORD-2" }),
      );
      expect(created.status).toBe(201);
      expect(calls[0]).toContain("/2026/");
      expect(repo.listHolidays()).toContain("2026-01-01");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("POST /api/casos/:id/cerrar", () => {
  it("returns 400 for an invalid close and 200 with recalculated days", async () => {
    const repo = memoryRepo(
      [
        caso({
          id: "app-1",
          sheetYear: 2026,
          rowNumber: 0,
          fechaInicial: "2026-01-05",
          fechaSolucion: null,
        }),
      ],
      ["2026-01-06"],
    );
    const server = serve(repo, { dictionary });
    const port = await listen(server);
    try {
      const early = await authed(
        `http://127.0.0.1:${port}/api/casos/app-1/cerrar`,
        jsonPost({ fechaSolucion: "2026-01-04", solucion: "Listo" }),
      );
      expect(early.status).toBe(400);
      expect((await early.json()).errors[0].field).toBe("fechaSolucion");
      expect(repo.list()[0]?.fechaSolucion).toBeNull();

      const closed = await authed(
        `http://127.0.0.1:${port}/api/casos/app-1/cerrar`,
        jsonPost({ fechaSolucion: "2026-01-06", solucion: "Listo" }),
      );
      expect(closed.status).toBe(200);
      const body = await closed.json();
      expect(body.solucion).toBe("Listo");
      expect(body.diasSolucion).toBe(1);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("returns 503 when holidays are missing", async () => {
    const fetchImpl = (async () => {
      throw new Error("no holidays loaded");
    }) as typeof fetch;
    const repo = memoryRepo(
      [caso({ id: "app-1", sheetYear: 2026, rowNumber: 0, fechaInicial: "2026-01-05" })],
      [],
    );
    const server = serve(repo, { dictionary, fetchImpl });
    const port = await listen(server);
    try {
      const closed = await authed(
        `http://127.0.0.1:${port}/api/casos/app-1/cerrar`,
        jsonPost({ fechaSolucion: "2026-01-06", solucion: "Listo" }),
      );
      expect(closed.status).toBe(503);
      expect(repo.list()[0]?.fechaSolucion).toBeNull();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("returns 404 when the case does not exist", async () => {
    const server = serve(memoryRepo([]));
    const port = await listen(server);
    try {
      const missing = await authed(
        `http://127.0.0.1:${port}/api/casos/nope/cerrar`,
        jsonPost({ fechaSolucion: "2026-01-06", solucion: "Listo" }),
      );
      expect(missing.status).toBe(404);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("bitácora", () => {
  const now = () => new Date("2026-01-19T15:00:00Z");
  const open = caso({ id: "app-1", fechaInicial: "2026-01-05" });

  it("adds entries to an open case without closing it and lists newest first", async () => {
    const repo = memoryRepo([open]);
    const server = serve(repo, { now });
    const port = await listen(server);
    const url = `http://127.0.0.1:${port}/api/casos/app-1/bitacora`;
    try {
      expect((await authed(url, jsonPost({ fecha: "2026-01-12", texto: "Se llamó al proveedor" }))).status).toBe(201);
      expect((await authed(url, jsonPost({ fecha: "2026-01-15", texto: "Respondió" }))).status).toBe(201);
      const body = await (await authed(url)).json();
      expect(body.entries.map((e: { texto: string }) => e.texto)).toEqual(["Respondió", "Se llamó al proveedor"]);
      expect(repo.list()[0]?.fechaSolucion).toBeNull();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("rejects empty text, future dates and unknown cases", async () => {
    const server = serve(memoryRepo([open]), { now });
    const port = await listen(server);
    try {
      const bad = await authed(
        `http://127.0.0.1:${port}/api/casos/app-1/bitacora`,
        jsonPost({ fecha: "2026-02-01", texto: " " }),
      );
      expect(bad.status).toBe(400);
      expect((await bad.json()).errors.map((e: { field: string }) => e.field)).toEqual(["fecha", "texto"]);
      expect((await authed(`http://127.0.0.1:${port}/api/casos/nope/bitacora`)).status).toBe(404);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("records the author; only the author or an admin can edit or delete an entry", async () => {
    const other = auth.insertUser({
      usuario: "otra",
      passwordHash: "unused",
      rol: "user",
      activo: true,
      creadoEn: "2026-01-01T00:00:00.000Z",
    });
    const otherCookie = `pqr_session=${createSession(auth, other.id)}`;
    const repo = memoryRepo([open]);
    const server = serve(repo, { now });
    const port = await listen(server);
    try {
      const created = await (
        await authed(`http://127.0.0.1:${port}/api/casos/app-1/bitacora`, jsonPost({ fecha: "2026-01-12", texto: "Llamé" }))
      ).json();
      expect(created.autor).toBe("admin");
      const url = `http://127.0.0.1:${port}/api/bitacora/${created.id}`;
      expect((await fetch(url, { method: "DELETE", headers: { cookie: otherCookie } })).status).toBe(403);
      const edited = await authed(url, { ...jsonPost({ fecha: "2026-01-13", texto: "Llamé otra vez" }), method: "PUT" });
      expect(edited.status).toBe(200);
      expect(repo.listBitacora("app-1")[0]).toMatchObject({ texto: "Llamé otra vez", autor: "admin" });
      expect((await authed(url, { method: "DELETE" })).status).toBe(200);
      expect(repo.listBitacora("app-1")).toEqual([]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("PUT /api/proveedores/:nombre", () => {
  it("validates, saves and 404s unknown names", async () => {
    const saved: unknown[] = [];
    const repo = {
      ...memoryRepo([]),
      listProveedores: () => ["Natech"],
      listProveedorInfo: () => [infoOf("Natech")],
      updateProveedor: (...args: unknown[]) => void saved.push(args),
    } as CaseRepository;
    const server = serve(repo);
    const port = await listen(server);
    const put = (name: string, body: object) =>
      authed(`http://127.0.0.1:${port}/api/proveedores/${name}`, { method: "PUT", body: JSON.stringify(body) });
    try {
      expect((await put("Natech", { correo: "mal" })).status).toBe(400);
      expect((await put("Natech", { plazoDias: "99" })).status).toBe(400);
      expect((await put("Otro", {})).status).toBe(404);
      expect((await put("Natech", { correo: "a@b.co", plazoDias: "7", activo: "false" })).status).toBe(200);
      expect(saved).toEqual([
        ["Natech", { contacto: "", correo: "a@b.co", telefono: "", notas: "", activo: false, plazoDias: 7 }],
      ]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
