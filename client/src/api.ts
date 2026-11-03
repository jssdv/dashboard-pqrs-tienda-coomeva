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

export async function getSummary(): Promise<DashboardSummary> {
  const response = await fetch("/summary");
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
  const response = await fetch("/api/catalogos");
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
  const response = await fetch(search ? `/api/casos?${search}` : "/api/casos");
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
  const response = await fetch(search ? `/api/casos/exportar?${search}` : "/api/casos/exportar");
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
  const response = await fetch("/api/proveedores");
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
  const response = await fetch(`/api/proveedores/${encodeURIComponent(nombre)}/linea`);
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
  const response = await fetch("/api/proveedores", {
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
  const response = await fetch("/api/proveedores/renombrar", {
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
  const response = await fetch(`/api/proveedores/${encodeURIComponent(nombre)}`, {
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
  const response = await fetch(`/api/casos/${encodeURIComponent(id)}/bitacora`);
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
  const response = await fetch(url, {
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
