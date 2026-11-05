import type {
  BitacoraEntry,
  BitacoraFields,
  Catalogs,
  CaseQuery,
  CloseFields,
  CreateFields,
  DashboardSummary,
  FieldError,
  PqrCase,
  TimelinePoint,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly errors: FieldError[];

  constructor(message: string, status: number, errors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return body ?? {};
}

// A 401 outside the auth endpoints means the session expired: send the user to log in and come back here.
function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { credentials: "same-origin", ...init }).then((response) => {
    const { pathname, search } = window.location;
    if (response.status === 401 && !url.startsWith("/api/auth/") && pathname !== "/login" && pathname !== "/setup") {
      window.location.assign(`/login?next=${encodeURIComponent(pathname + search)}`);
    }
    return response;
  });
}

export type Rol = "admin" | "user" | "viewer";

export interface AuthUser {
  id: number;
  usuario: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

async function jsonRequest<T>(url: string, method: string, fields?: object): Promise<T> {
  const response = await apiFetch(url, {
    method,
    headers: fields ? { "content-type": "application/json" } : undefined,
    body: fields ? JSON.stringify(fields) : undefined,
  });
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudo completar la acción",
      response.status,
    );
  }
  return body as unknown as T;
}

export async function getMe(): Promise<AuthUser | null> {
  return jsonRequest<{ user: AuthUser }>("/api/auth/me", "GET").then((body) => body.user, () => null);
}

export async function getSetupRequired(): Promise<boolean> {
  const body = await jsonRequest<{ requiereSetup: boolean }>("/api/auth/estado", "GET");
  return body.requiereSetup;
}

export async function login(usuario: string, password: string): Promise<AuthUser> {
  return (await jsonRequest<{ user: AuthUser }>("/api/auth/login", "POST", { usuario, password })).user;
}

export async function setupAdmin(usuario: string, password: string): Promise<AuthUser> {
  return (await jsonRequest<{ user: AuthUser }>("/api/auth/setup", "POST", { usuario, password })).user;
}

export async function logout(): Promise<void> {
  await jsonRequest("/api/auth/logout", "POST");
}

export async function getUsers(): Promise<AuthUser[]> {
  return (await jsonRequest<{ usuarios: AuthUser[] }>("/api/admin/usuarios", "GET")).usuarios;
}

export async function createUser(fields: { usuario: string; password: string; rol: Rol }): Promise<AuthUser> {
  return (await jsonRequest<{ user: AuthUser }>("/api/admin/usuarios", "POST", fields)).user;
}

export async function updateUser(id: number, fields: { rol?: Rol; activo?: boolean; password?: string }): Promise<void> {
  await jsonRequest(`/api/admin/usuarios/${id}`, "PUT", fields);
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  invalidDates: number;
  holidays: number;
}

export async function importarLibro(file: File): Promise<ImportSummary> {
  const response = await apiFetch("/api/admin/importar", {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: file,
  });
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(typeof body.error === "string" ? body.error : "No se pudo importar el libro", response.status);
  }
  return body as unknown as ImportSummary;
}

export interface Enlace {
  id: number;
  creadoPor: string;
  expira: string | null;
  revocado: boolean;
}

export async function getEnlaces(): Promise<Enlace[]> {
  return (await jsonRequest<{ enlaces: Enlace[] }>("/api/admin/enlaces", "GET")).enlaces;
}

// The full URL comes back once; the server keeps only its hash.
export async function createEnlace(expira: string): Promise<{ url: string; expira: string | null }> {
  return jsonRequest("/api/admin/enlaces", "POST", { expira });
}

export async function revokeEnlace(id: number): Promise<void> {
  await jsonRequest(`/api/admin/enlaces/${id}`, "DELETE");
}

export interface ShareInfo {
  puerto: number;
  urls: string[];
}

export async function getShareInfo(): Promise<ShareInfo> {
  return jsonRequest("/api/admin/info", "GET");
}

export async function getUrlPublica(): Promise<string> {
  return (await jsonRequest<{ url_publica: string }>("/api/admin/ajustes", "GET")).url_publica;
}

export async function setUrlPublica(url: string): Promise<string> {
  return (await jsonRequest<{ url_publica: string }>("/api/admin/ajustes", "PUT", { url_publica: url })).url_publica;
}

export async function getSummary(periodo: { desde: string; hasta: string } | null = null): Promise<DashboardSummary> {
  const query = periodo ? `?${new URLSearchParams({ desde: periodo.desde, hasta: periodo.hasta })}` : "";
  const response = await apiFetch(`/summary${query}`);
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudo cargar el resumen",
      response.status,
    );
  }
  return body as unknown as DashboardSummary;
}

export async function getCatalogs(): Promise<Catalogs> {
  const response = await apiFetch("/api/catalogos");
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudieron cargar las listas",
      response.status,
    );
  }
  return body as unknown as Catalogs;
}

export async function getCases(query: CaseQuery): Promise<PqrCase[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  const response = await apiFetch(search ? `/api/casos?${search}` : "/api/casos");
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudieron cargar los casos",
      response.status,
    );
  }
  return (body.cases as PqrCase[]) ?? [];
}

const EXPORT_KEYS = ["cola", "area", "tipo", "mes", "plazo", "fecha", "estado", "tema", "q"] as const;

export async function exportCases(source: URLSearchParams): Promise<void> {
  const params = new URLSearchParams();
  for (const key of EXPORT_KEYS) {
    const value = source.get(key);
    if (value) params.set(key, value);
  }
  const search = params.toString();
  const response = await apiFetch(search ? `/api/casos/exportar?${search}` : "/api/casos/exportar");
  if (!response.ok) {
    const body = await readBody(response);
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudo exportar",
      response.status,
    );
  }
  const blob = await response.blob();
  const name = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "casos.xlsx";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function createCase(fields: CreateFields): Promise<PqrCase> {
  return postJson("/api/casos", fields);
}

export interface ProveedorFields {
  contacto: string;
  correo: string;
  telefono: string;
  notas: string;
  activo: boolean;
  plazoDias: number | null;
}

export interface Scorecard {
  cerrados: number;
  fueraDePlazoPct: number | null;
  reincidentes: number;
  causas: Array<{ key: string; count: number }>;
}

export interface ProveedorRow extends ProveedorFields {
  nombre: string;
  scorecard?: Scorecard;
  casos: number;
  abiertos: number;
  vencidos: number | null;
  diasPromedio: number | null;
}

export async function getProveedores(): Promise<ProveedorRow[]> {
  const response = await apiFetch("/api/proveedores");
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudieron cargar los proveedores",
      response.status,
    );
  }
  return (body.proveedores as ProveedorRow[]) ?? [];
}

export async function getProviderTimeline(nombre: string): Promise<TimelinePoint[]> {
  const response = await apiFetch(`/api/proveedores/${encodeURIComponent(nombre)}/linea`);
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudo cargar la línea de tiempo",
      response.status,
    );
  }
  return (body.puntos as TimelinePoint[] | undefined) ?? [];
}

export async function createProveedor(nombre: string): Promise<void> {
  const response = await apiFetch("/api/proveedores", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudo crear el proveedor",
      response.status,
    );
  }
}

export async function renameProveedor(desde: string, hacia: string): Promise<void> {
  const response = await apiFetch("/api/proveedores/renombrar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ desde, hacia }),
  });
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudo renombrar el proveedor",
      response.status,
    );
  }
}

export async function updateProveedor(nombre: string, fields: ProveedorFields): Promise<void> {
  const response = await apiFetch(`/api/proveedores/${encodeURIComponent(nombre)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fields),
  });
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudo guardar el proveedor",
      response.status,
    );
  }
}

export async function closeCase(id: string, fields: CloseFields): Promise<PqrCase> {
  return postJson(`/api/casos/${encodeURIComponent(id)}/cerrar`, fields);
}

export async function getBitacora(id: string): Promise<BitacoraEntry[]> {
  const response = await apiFetch(`/api/casos/${encodeURIComponent(id)}/bitacora`);
  const body = await readBody(response);
  if (!response.ok) throw new ApiError("No se pudo cargar la bitácora", response.status);
  return Array.isArray(body.entries) ? (body.entries as unknown as BitacoraEntry[]) : [];
}

export async function addBitacoraEntry(id: string, fields: BitacoraFields): Promise<BitacoraEntry> {
  return postJson<BitacoraEntry>(`/api/casos/${encodeURIComponent(id)}/bitacora`, fields);
}

async function postJson<T = PqrCase>(
  url: string,
  fields: CreateFields | CloseFields | BitacoraFields,
): Promise<T> {
  const response = await apiFetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fields),
  });
  const body = await readBody(response);
  if (response.status === 400) {
    const errors = Array.isArray(body.errors) ? (body.errors as FieldError[]) : [];
    throw new ApiError("Revisa los campos marcados.", 400, errors);
  }
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "No se pudo guardar el caso",
      response.status,
    );
  }
  return body as unknown as T;
}
