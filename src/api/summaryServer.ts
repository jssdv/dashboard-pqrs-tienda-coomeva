import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { applyClose, caseFromCreate, validateBitacora, validateClose, validateCreate } from "../domain/caseForm.js";
import { Dictionary } from "../domain/dictionary.js";
import { bogotaToday, openQueue } from "../domain/openQueue.js";
import { matchesSearch } from "../domain/matchesSearch.js";
import { providerTimeline } from "../domain/providerTimeline.js";
import { buildCasesWorkbook } from "../export/casesWorkbook.js";
import { riskOf, type PlazoEstado, type Riesgo } from "../domain/risk.js";
import { summarize } from "../domain/summary.js";
import type { CatalogField, PqrCase } from "../domain/types.js";
import { ensureHolidayYears } from "../holidays/nationalHolidays.js";
import type { CaseRepository } from "../store/repository.js";

const clientDist = join(dirname(fileURLToPath(import.meta.url)), "../../client/dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".map": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

export interface SummaryServerOptions {
  dictionary?: Dictionary;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

interface CaseQuery {
  cola?: string;
  area?: string;
  tipo?: string;
  mes?: string;
  plazo?: string;
  fecha?: string;
  estado?: string;
  tema?: string;
  q?: string;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function readJson(req: IncomingMessage): Promise<Record<string, string>> {
  const text = (await readBody(req)).trim();
  if (!text) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("invalid json");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("invalid json");
  }
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    fields[key] = value == null ? "" : String(value);
  }
  return fields;
}

function catalogsOf(repository: CaseRepository): Record<CatalogField, string[]> {
  const collect = (field: "fuente" | "tipo" | "tema") =>
    [
      ...new Set(
        repository
          .list()
          .map((row) => row[field]?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort((a, b) => a.localeCompare(b, "es"));
  return {
    area: [...new Set(repository.listProveedores())].sort((a, b) => a.localeCompare(b, "es")),
    fuente: collect("fuente"),
    tipo: collect("tipo"),
    tema: collect("tema"),
  };
}

function describeFilters(query: CaseQuery): string[] {
  const out: string[] = [];
  if (query.estado === "abiertos" || query.estado === "cerrados") out.push(`Estado: ${query.estado}`);
  if (PLAZOS.some((plazo) => plazo === query.plazo)) out.push(`Plazo: ${query.plazo}`);
  if (query.area) out.push(`Proveedor: ${query.area}`);
  if (query.tipo) out.push(`Tipo: ${query.tipo}`);
  if (query.tema) out.push(`Tema: ${query.tema}`);
  if (query.mes) out.push(`Mes: ${query.mes}`);
  if (query.cola === "vencida") out.push("Más de 10 días hábiles");
  if (query.fecha === "invalida") out.push("Sin fecha de inicio");
  if (query.q?.trim()) out.push(`Búsqueda: ${query.q.trim()}`);
  return out;
}

const PLAZOS: readonly PlazoEstado[] = ["en-plazo", "por-vencer", "vencido"];

function queryOf(url: URL): CaseQuery {
  return {
    cola: url.searchParams.get("cola") ?? undefined,
    area: url.searchParams.get("area") ?? undefined,
    tipo: url.searchParams.get("tipo") ?? undefined,
    mes: url.searchParams.get("mes") ?? undefined,
    plazo: url.searchParams.get("plazo") ?? undefined,
    fecha: url.searchParams.get("fecha") ?? undefined,
    estado: url.searchParams.get("estado") ?? undefined,
    tema: url.searchParams.get("tema") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  };
}

function applyFilters(
  cases: PqrCase[],
  query: CaseQuery,
  holidays: readonly string[],
  today: string,
): { rows: Array<PqrCase & { riesgo?: Riesgo }>; notice: string | null } {
  let rows: Array<PqrCase & { riesgo?: Riesgo }> = cases;
  const plazo = PLAZOS.find((estado) => estado === query.plazo);
  if (plazo || holidays.length > 0) {
    try {
      rows = rows.map((row) => {
        const riesgo = riskOf(row, holidays, today);
        return riesgo ? { ...row, riesgo } : row;
      });
      if (plazo) rows = rows.filter((row) => row.riesgo?.estado === plazo);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        rows: [],
        notice:
          message === "no holidays loaded"
            ? "No hay festivos cargados. El plazo no se puede calcular."
            : message,
      };
    }
  }
  if (query.cola === "vencida") {
    try {
      const ids = new Set(openQueue(cases, holidays, today).map((row) => row.id));
      rows = rows.filter((row) => ids.has(row.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        rows: [],
        notice:
          message === "no holidays loaded"
            ? "No hay festivos cargados. La cola no se puede calcular."
            : message,
      };
    }
  }
  return {
    rows: rows.filter((row) => {
      if (query.fecha === "invalida" && row.fechaInicial !== null && !row.fechaInicialInvalida) return false;
      if (query.estado === "abiertos" && row.fechaSolucion !== null) return false;
      if (query.estado === "cerrados" && row.fechaSolucion === null) return false;
      if (query.tema && (row.tema ?? "(sin valor)") !== query.tema) return false;
      if (query.q && !matchesSearch(row, query.q)) return false;
      if (query.area && (row.area ?? "(sin valor)") !== query.area) return false;
      if (query.tipo && (row.tipo ?? "(sin valor)") !== query.tipo) return false;
      if (query.mes) {
        if (!row.fechaInicial || row.fechaInicialInvalida) return false;
        if (row.fechaInicial.slice(0, 7) !== query.mes) return false;
      }
      return true;
    }),
    notice: null,
  };
}

function isSpaRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/casos" ||
    pathname === "/casos/nuevo" ||
    pathname === "/proveedores" ||
    /^\/casos\/[^/]+\/cerrar$/.test(pathname)
  );
}

function serveClient(url: URL, res: ServerResponse): boolean {
  const indexPath = join(clientDist, "index.html");
  if (!existsSync(indexPath)) return false;

  const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
  const root = resolve(clientDist);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    json(res, 404, { error: "not found" });
    return true;
  }

  if (pathname !== "/" && existsSync(filePath) && statSync(filePath).isFile()) {
    const type = MIME[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(readFileSync(filePath));
    return true;
  }

  if (!isSpaRoute(pathname)) return false;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(readFileSync(indexPath));
  return true;
}

export function createSummaryServer(
  repository: CaseRepository,
  options: SummaryServerOptions = {},
): Server {
  const dictionary = options.dictionary ?? new Dictionary(new Map());
  const fetchImpl = options.fetchImpl ?? fetch;
  const today = () => bogotaToday(options.now ? options.now() : new Date());

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const clock = () => ({ holidays: repository.listHolidays(), today: today() });

      if (req.method === "GET" && url.pathname === "/summary") {
        json(res, 200, summarize(repository.list(), clock()));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/catalogos") {
        json(res, 200, catalogsOf(repository));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/proveedores") {
        const { holidays, today: hoy } = clock();
        const groups = new Map<string, PqrCase[]>();
        for (const row of repository.list()) {
          if (!row.area) continue;
          groups.set(row.area, [...(groups.get(row.area) ?? []), row]);
        }
        json(res, 200, {
          proveedores: repository.listProveedores().map((nombre) => {
            const rows = groups.get(nombre) ?? [];
            const dias = rows
              .filter((row) => !row.fechaInicialInvalida && !row.fechaSolucionInvalida)
              .map((row) => row.diasSolucion)
              .filter((value): value is number => value !== null);
            return {
              nombre,
              casos: rows.length,
              abiertos: rows.filter((row) => row.fechaSolucion === null).length,
              vencidos:
                holidays.length === 0
                  ? null
                  : rows.filter((row) => riskOf(row, holidays, hoy)?.estado === "vencido").length,
              diasPromedio:
                dias.length === 0 ? null : dias.reduce((sum, value) => sum + value, 0) / dias.length,
            };
          }),
        });
        return;
      }
      const linea = url.pathname.match(/^\/api\/proveedores\/([^/]+)\/linea$/);
      if (linea && req.method === "GET") {
        json(res, 200, { puntos: providerTimeline(repository.list(), decodeURIComponent(linea[1])) });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/proveedores") {
        let raw: Record<string, string>;
        try {
          raw = await readJson(req);
        } catch {
          json(res, 400, { error: "El cuerpo no es JSON válido" });
          return;
        }
        const nombre = (raw.nombre ?? "").trim().replace(/\s+/g, " ");
        if (!nombre) {
          json(res, 400, { error: "El nombre del proveedor es obligatorio" });
          return;
        }
        repository.addProveedor(nombre);
        json(res, 201, { nombre });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/proveedores/renombrar") {
        let raw: Record<string, string>;
        try {
          raw = await readJson(req);
        } catch {
          json(res, 400, { error: "El cuerpo no es JSON válido" });
          return;
        }
        const desde = (raw.desde ?? "").trim();
        const hacia = (raw.hacia ?? "").trim().replace(/\s+/g, " ");
        if (!desde || !hacia) {
          json(res, 400, { error: "Indica el nombre actual y el nuevo" });
          return;
        }
        repository.renameProveedor(desde, hacia);
        json(res, 200, { nombre: hacia });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/casos/exportar") {
        const query = queryOf(url);
        const filtered = applyFilters(repository.list(), query, repository.listHolidays(), today());
        if (filtered.notice) {
          json(res, 503, { error: filtered.notice });
          return;
        }
        const generatedAt = today();
        const buffer = await buildCasesWorkbook(filtered.rows, { generatedAt, filters: describeFilters(query) });
        res.writeHead(200, {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="casos-${generatedAt}.xlsx"`,
          "Content-Length": buffer.length,
        });
        res.end(buffer);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/casos") {
        const filtered = applyFilters(repository.list(), queryOf(url), repository.listHolidays(), today());
        if (filtered.notice) {
          json(res, 503, { error: filtered.notice });
          return;
        }
        json(res, 200, { cases: filtered.rows });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/casos") {
        let raw: Record<string, string>;
        try {
          raw = await readJson(req);
        } catch {
          json(res, 400, { errors: [{ field: "form", message: "El cuerpo no es JSON válido" }] });
          return;
        }
        const result = validateCreate(raw, catalogsOf(repository));
        if (!result.ok) {
          json(res, 400, { errors: result.errors });
          return;
        }
        try {
          await ensureHolidayYears(
            repository,
            [Number(result.fields.fechaInicial.slice(0, 4))],
            fetchImpl,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          json(res, 503, { error: message });
          return;
        }
        const created = caseFromCreate(result.fields, dictionary, `app-${randomUUID()}`);
        if (created.area) repository.addProveedor(created.area);
        repository.insert(created);
        json(res, 201, created);
        return;
      }

      const apiClose = url.pathname.match(/^\/api\/casos\/([^/]+)\/cerrar$/);
      if (apiClose && req.method === "POST") {
        const id = decodeURIComponent(apiClose[1]);
        const caso = repository.list().find((row) => row.id === id);
        if (!caso) {
          json(res, 404, { error: "not found" });
          return;
        }
        let raw: Record<string, string>;
        try {
          raw = await readJson(req);
        } catch {
          json(res, 400, { errors: [{ field: "form", message: "El cuerpo no es JSON válido" }] });
          return;
        }
        const result = validateClose(raw, caso.fechaInicial);
        if (!result.ok) {
          json(res, 400, { errors: result.errors });
          return;
        }
        try {
          const years = [caso.fechaInicial, result.fields.fechaSolucion]
            .filter((value): value is string => Boolean(value))
            .map((value) => Number(value.slice(0, 4)));
          await ensureHolidayYears(repository, years, fetchImpl);
          const closed = applyClose(caso, result.fields, repository.listHolidays());
          repository.update(closed);
          json(res, 200, closed);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          json(res, 503, { error: message });
        }
        return;
      }

      const apiBitacora = url.pathname.match(/^\/api\/casos\/([^/]+)\/bitacora$/);
      if (apiBitacora && (req.method === "GET" || req.method === "POST")) {
        const id = decodeURIComponent(apiBitacora[1]);
        if (!repository.list().some((row) => row.id === id)) {
          json(res, 404, { error: "not found" });
          return;
        }
        if (req.method === "GET") {
          json(res, 200, { entries: repository.listBitacora(id) });
          return;
        }
        let raw: Record<string, string>;
        try {
          raw = await readJson(req);
        } catch {
          json(res, 400, { errors: [{ field: "form", message: "El cuerpo no es JSON válido" }] });
          return;
        }
        const result = validateBitacora(raw, today());
        if (!result.ok) {
          json(res, 400, { errors: result.errors });
          return;
        }
        json(res, 201, repository.addBitacora(id, result.fields, (options.now?.() ?? new Date()).toISOString()));
        return;
      }

      if ((req.method === "GET" || req.method === "HEAD") && serveClient(url, res)) return;

      json(res, 404, { error: "not found" });
    } catch (error) {
      if (!res.headersSent) {
        json(res, 500, { error: error instanceof Error ? error.message : String(error) });
      }
    }
  });
}
