import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { type AuthRepository, type Rol, type UserRecord } from "../auth/repository.js";
import { createSession, endSession, SESSION_MAX_AGE_S, userForSession } from "../auth/sessions.js";
import {
  authenticate,
  createUser,
  isRol,
  publicUser,
  type AuthUser,
  validatePassword,
  validateUsuario,
} from "../auth/users.js";
import { hashPassword } from "../auth/password.js";
import type { ShareRepository } from "../share/repository.js";
import { enlaceValido, expiraDe, hashToken, lanBases, newToken, URL_PUBLICA, urlPublicaValida } from "../share/links.js";
import { createEventHub } from "./events.js";
import { applyClose, caseFromCreate, validateBitacora, validateClose, validateCreate } from "../domain/caseForm.js";
import { Dictionary } from "../domain/dictionary.js";
import { bogotaToday, openQueue } from "../domain/openQueue.js";
import { matchesSearch } from "../domain/matchesSearch.js";
import { providerScorecard } from "../domain/providerScorecard.js";
import { providerTimeline } from "../domain/providerTimeline.js";
import { buildCasesWorkbook } from "../export/casesWorkbook.js";
import { PLAZO_DIAS, riskOf, type Plazos, type PlazoEstado, type Riesgo } from "../domain/risk.js";
import { summarize } from "../domain/summary.js";
import type { CatalogField, PqrCase } from "../domain/types.js";
import { ensureHolidayYears } from "../holidays/nationalHolidays.js";
import { ProveedorExistsError, type CaseRepository, type ProveedorFields } from "../store/repository.js";

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
  auth: AuthRepository & ShareRepository;
  dictionary?: Dictionary;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const SESSION_COOKIE = "pqr_session";
const READ_METHODS = ["GET", "HEAD"];
const WRITE_METHODS = ["POST", "PUT", "DELETE"];
const LOGIN_WINDOW_MS = 60_000;
const MAX_FAILED_LOGINS = 5;

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
    area: repository
      .listProveedorInfo()
      .filter((proveedor) => proveedor.activo)
      .map((proveedor) => proveedor.nombre)
      .sort((a, b) => a.localeCompare(b, "es")),
    fuente: collect("fuente"),
    tipo: collect("tipo"),
    tema: collect("tema"),
  };
}

function validateProveedor(raw: Record<string, string>): { fields: ProveedorFields } | { error: string } {
  const correo = (raw.correo ?? "").trim();
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: "El correo no es válido" };
  const plazo = (raw.plazoDias ?? "").trim();
  if (plazo && !(/^\d+$/.test(plazo) && Number(plazo) >= 1 && Number(plazo) <= 60)) {
    return { error: "El plazo debe ser un número de días entre 1 y 60" };
  }
  return {
    fields: {
      contacto: (raw.contacto ?? "").trim(),
      correo,
      telefono: (raw.telefono ?? "").trim(),
      notas: (raw.notas ?? "").trim(),
      activo: raw.activo !== "false",
      plazoDias: plazo ? Number(plazo) : null,
    },
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
  if (query.cola === "vencida") out.push("Fuera de plazo");
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
  plazos?: Plazos,
): { rows: Array<PqrCase & { riesgo?: Riesgo }>; notice: string | null } {
  let rows: Array<PqrCase & { riesgo?: Riesgo }> = cases;
  const plazo = PLAZOS.find((estado) => estado === query.plazo);
  if (plazo || holidays.length > 0) {
    try {
      rows = rows.map((row) => {
        const riesgo = riskOf(row, holidays, today, plazos);
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
      const ids = new Set(openQueue(cases, holidays, today, plazos).map((row) => row.id));
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
    pathname === "/login" ||
    pathname === "/setup" ||
    pathname === "/admin" ||
    /^\/ver\/[^/]+$/.test(pathname) ||
    /^\/casos\/[^/]+\/cerrar$/.test(pathname)
  );
}

function cookieValue(req: IncomingMessage, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

function setSessionCookie(req: IncomingMessage, res: ServerResponse, token: string, maxAge: number): void {
  const forwarded = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const secure = forwarded === "https" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}

// ponytail: in-memory failure window per IP. Lost on restart, and behind a proxy every
// client shares one IP, so the limit becomes global. Upgrade path: a sqlite table if that bites.
interface LoginLimit {
  blocked(ip: string): boolean;
  failed(ip: string): void;
}

function createLoginLimit(): LoginLimit {
  const failures = new Map<string, number[]>();
  const recent = (ip: string): number[] => {
    const kept = (failures.get(ip) ?? []).filter((at) => Date.now() - at < LOGIN_WINDOW_MS);
    failures.set(ip, kept);
    return kept;
  };
  return {
    blocked: (ip) => recent(ip).length >= MAX_FAILED_LOGINS,
    failed(ip) {
      failures.set(ip, [...recent(ip), Date.now()]);
    },
  };
}

async function readFields(req: IncomingMessage, res: ServerResponse): Promise<Record<string, string> | null> {
  try {
    return await readJson(req);
  } catch {
    json(res, 400, { error: "El cuerpo no es JSON válido" });
    return null;
  }
}

async function handleAuthRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  auth: AuthRepository,
  limit: LoginLimit,
): Promise<boolean> {
  const token = cookieValue(req, SESSION_COOKIE);
  if (req.method === "GET" && url.pathname === "/api/auth/estado") {
    json(res, 200, { requiereSetup: auth.countUsers() === 0 });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const user = userForSession(auth, token);
    if (!user) json(res, 401, { error: "No autenticado" });
    else json(res, 200, { user });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    if (token) endSession(auth, token);
    setSessionCookie(req, res, "", 0);
    json(res, 200, { ok: true });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/setup") {
    if (auth.countUsers() > 0) {
      json(res, 409, { error: "Ya existe un administrador" });
      return true;
    }
    const raw = await readFields(req, res);
    if (!raw) return true;
    const usuario = (raw.usuario ?? "").trim();
    const error = validateUsuario(usuario) ?? validatePassword(raw.password ?? "");
    if (error) {
      json(res, 400, { error });
      return true;
    }
    const user = await createUser(auth, usuario, raw.password, "admin");
    if (!user) {
      json(res, 409, { error: "Ya existe un administrador" });
      return true;
    }
    setSessionCookie(req, res, createSession(auth, user.id), SESSION_MAX_AGE_S);
    json(res, 201, { user });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const ip = req.socket.remoteAddress ?? "";
    if (limit.blocked(ip)) {
      json(res, 429, { error: "Demasiados intentos. Espera un minuto." });
      return true;
    }
    const raw = await readFields(req, res);
    if (!raw) return true;
    const user = await authenticate(auth, (raw.usuario ?? "").trim(), raw.password ?? "");
    if (!user) {
      limit.failed(ip);
      json(res, 401, { error: "Usuario o contraseña incorrectos" });
      return true;
    }
    setSessionCookie(req, res, createSession(auth, user.id), SESSION_MAX_AGE_S);
    json(res, 200, { user: publicUser(user) });
    return true;
  }
  return false;
}

async function handleAdminRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  auth: AuthRepository,
  me: AuthUser,
): Promise<boolean> {
  if (req.method === "GET" && url.pathname === "/api/admin/usuarios") {
    json(res, 200, { usuarios: auth.listUsers().map(publicUser) });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/usuarios") {
    const raw = await readFields(req, res);
    if (!raw) return true;
    const usuario = (raw.usuario ?? "").trim();
    const rol = raw.rol ?? "";
    const error =
      validateUsuario(usuario) ?? validatePassword(raw.password ?? "") ?? (isRol(rol) ? null : "Rol no válido");
    if (error) {
      json(res, 400, { error });
      return true;
    }
    const user = await createUser(auth, usuario, raw.password, rol as Rol);
    if (!user) {
      json(res, 409, { error: `Ya existe un usuario llamado "${usuario}"` });
      return true;
    }
    json(res, 201, { user });
    return true;
  }
  const match = url.pathname.match(/^\/api\/admin\/usuarios\/(\d+)$/);
  if (match && req.method === "PUT") {
    const target = auth.findUserById(Number(match[1]));
    if (!target) {
      json(res, 404, { error: "not found" });
      return true;
    }
    const raw = await readFields(req, res);
    if (!raw) return true;
    const next: UserRecord = { ...target };
    if ("rol" in raw) {
      if (!isRol(raw.rol)) {
        json(res, 400, { error: "Rol no válido" });
        return true;
      }
      next.rol = raw.rol;
    }
    if ("activo" in raw) next.activo = String(raw.activo) !== "false";
    if (raw.password) {
      const error = validatePassword(raw.password);
      if (error) {
        json(res, 400, { error });
        return true;
      }
      next.passwordHash = await hashPassword(raw.password);
    }
    if (target.id === me.id && (!next.activo || next.rol !== "admin")) {
      json(res, 400, { error: "No puedes desactivarte ni quitarte el rol de administrador" });
      return true;
    }
    auth.updateUser(next);
    // Desactivar o cambiar la contraseña cierra las sesiones abiertas de esa cuenta.
    if (!next.activo || raw.password) auth.deleteSessionsOfUser(next.id);
    json(res, 200, { user: publicUser(next) });
    return true;
  }
  return false;
}

async function handleShareRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  share: ShareRepository,
  me: AuthUser,
): Promise<boolean> {
  const port = req.socket.localPort ?? 0;
  if (req.method === "GET" && url.pathname === "/api/admin/info") {
    json(res, 200, { puerto: port, urls: lanBases(port) });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/admin/ajustes") {
    json(res, 200, { url_publica: share.getAjuste(URL_PUBLICA) ?? "" });
    return true;
  }
  if (req.method === "PUT" && url.pathname === "/api/admin/ajustes") {
    const raw = await readFields(req, res);
    if (!raw) return true;
    const valor = (raw.url_publica ?? "").trim().replace(/\/+$/, "");
    if (valor && !urlPublicaValida(valor)) {
      json(res, 400, { error: "La URL pública debe empezar por http:// o https://" });
      return true;
    }
    share.setAjuste(URL_PUBLICA, valor);
    json(res, 200, { url_publica: valor });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/admin/enlaces") {
    json(res, 200, { enlaces: share.listEnlaces() });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/enlaces") {
    const raw = await readFields(req, res);
    if (!raw) return true;
    const expira = expiraDe((raw.expira ?? "").trim());
    if (expira === undefined) {
      json(res, 400, { error: "La fecha de vencimiento debe ser una fecha futura (AAAA-MM-DD)" });
      return true;
    }
    const token = newToken();
    const id = share.insertEnlace(hashToken(token), me.id, expira);
    // Prefer the admin's public URL, else the first LAN address; the Host header is the last resort.
    const base = share.getAjuste(URL_PUBLICA) || lanBases(port)[0] || `http://${req.headers.host}`;
    json(res, 201, { id, url: `${base}/ver/${token}`, expira });
    return true;
  }
  const revoke = url.pathname.match(/^\/api\/admin\/enlaces\/(\d+)$/);
  if (revoke && req.method === "DELETE") {
    if (!share.revokeEnlace(Number(revoke[1]))) {
      json(res, 404, { error: "not found" });
      return true;
    }
    json(res, 200, { ok: true });
    return true;
  }
  return false;
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

export function createSummaryServer(repository: CaseRepository, options: SummaryServerOptions): Server {
  const dictionary = options.dictionary ?? new Dictionary(new Map());
  const fetchImpl = options.fetchImpl ?? fetch;
  const today = () => bogotaToday(options.now ? options.now() : new Date());
  const { auth } = options;
  const limit = createLoginLimit();
  const hub = createEventHub();

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      // Every successful write tells open dashboards to refetch; login/logout are not data changes.
      if (WRITE_METHODS.includes(req.method ?? "") && !url.pathname.startsWith("/api/auth/")) {
        res.on("finish", () => {
          if (res.statusCode < 300) hub.emit("change");
        });
      }
      const plazos = (): Plazos =>
        new Map(
          repository
            .listProveedorInfo()
            .filter((info) => info.plazoDias !== null)
            .map((info) => [info.nombre, info.plazoDias as number]),
        );
      const clock = () => ({ holidays: repository.listHolidays(), today: today(), plazos: plazos() });

      if (url.pathname.startsWith("/api/auth/")) {
        if (await handleAuthRoute(req, res, url, auth, limit)) return;
      } else if (url.pathname === "/summary" || url.pathname.startsWith("/api/")) {
        const me = userForSession(auth, cookieValue(req, SESSION_COOKIE));
        if (!me) {
          json(res, 401, { error: "No autenticado" });
          return;
        }
        if (url.pathname.startsWith("/api/admin/")) {
          if (me.rol !== "admin") {
            json(res, 403, { error: "Solo administradores" });
            return;
          }
          if (await handleAdminRoute(req, res, url, auth, me)) return;
          if (await handleShareRoute(req, res, url, auth, me)) return;
        } else if (me.rol === "viewer" && !READ_METHODS.includes(req.method ?? "")) {
          json(res, 403, { error: "Tu rol solo permite consultar" });
          return;
        }
      }

      if (req.method === "GET" && url.pathname === "/api/events") {
        hub.subscribe(res);
        return;
      }
      if (req.method === "GET" && url.pathname === "/summary") {
        json(res, 200, summarize(repository.list(), clock()));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/catalogos") {
        json(res, 200, catalogsOf(repository));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/proveedores") {
        const { holidays, today: hoy, plazos: byName } = clock();
        const groups = new Map<string, PqrCase[]>();
        for (const row of repository.list()) {
          if (!row.area) continue;
          groups.set(row.area, [...(groups.get(row.area) ?? []), row]);
        }
        json(res, 200, {
          proveedores: repository.listProveedorInfo().map((info) => {
            const { nombre } = info;
            const rows = groups.get(nombre) ?? [];
            const dias = rows
              .filter((row) => !row.fechaInicialInvalida && !row.fechaSolucionInvalida)
              .map((row) => row.diasSolucion)
              .filter((value): value is number => value !== null);
            return {
              ...info,
              scorecard: providerScorecard(rows, info.plazoDias ?? PLAZO_DIAS),
              casos: rows.length,
              abiertos: rows.filter((row) => row.fechaSolucion === null).length,
              vencidos:
                holidays.length === 0
                  ? null
                  : rows.filter((row) => riskOf(row, holidays, hoy, byName)?.estado === "vencido").length,
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
        try {
          repository.renameProveedor(desde, hacia);
        } catch (error) {
          if (!(error instanceof ProveedorExistsError)) throw error;
          json(res, 409, { error: error.message });
          return;
        }
        json(res, 200, { nombre: hacia });
        return;
      }
      const edit = url.pathname.match(/^\/api\/proveedores\/([^/]+)$/);
      if (edit && req.method === "PUT") {
        const nombre = decodeURIComponent(edit[1]);
        if (!repository.listProveedores().includes(nombre)) {
          json(res, 404, { error: "not found" });
          return;
        }
        let raw: Record<string, string>;
        try {
          raw = await readJson(req);
        } catch {
          json(res, 400, { error: "El cuerpo no es JSON válido" });
          return;
        }
        const result = validateProveedor(raw);
        if ("error" in result) {
          json(res, 400, { error: result.error });
          return;
        }
        repository.updateProveedor(nombre, result.fields);
        json(res, 200, { nombre, ...result.fields });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/casos/exportar") {
        const query = queryOf(url);
        const filtered = applyFilters(repository.list(), query, repository.listHolidays(), today(), plazos());
        if (filtered.notice) {
          json(res, 503, { error: filtered.notice });
          return;
        }
        const generatedAt = today();
        const buffer = await buildCasesWorkbook(filtered.rows, { generatedAt, filters: describeFilters(query), plazos: plazos() });
        res.writeHead(200, {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="casos-${generatedAt}.xlsx"`,
          "Content-Length": buffer.length,
        });
        res.end(buffer);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/casos") {
        const filtered = applyFilters(repository.list(), queryOf(url), repository.listHolidays(), today(), plazos());
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

      const ver = url.pathname.match(/^\/ver\/([^/]+)$/);
      if (req.method === "GET" && ver) {
        if (!enlaceValido(auth, decodeURIComponent(ver[1]))) {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<!doctype html><meta charset=utf-8><title>Enlace no válido</title><p>Este enlace no es válido o ya venció.</p>");
          return;
        }
        if (!userForSession(auth, cookieValue(req, SESSION_COOKIE))) {
          res.writeHead(302, { Location: `/login?next=${encodeURIComponent(url.pathname)}` });
          res.end();
          return;
        }
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
