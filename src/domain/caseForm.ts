import { businessDays } from "./businessDays.js";
import { parseDateCell } from "./dates.js";
import { lookupKey } from "./normalize.js";
import type { Dictionary } from "./dictionary.js";
import type { CatalogField, PqrCase } from "./types.js";

const CREATE_FIELDS = [
  "fechaInicial",
  "area",
  "idOrden",
  "asociado",
  "correo",
  "fuente",
  "tipo",
  "tema",
  "motivo",
] as const;

export type CreateField = (typeof CREATE_FIELDS)[number];

export interface CreateFields {
  fechaInicial: string;
  area: string;
  idOrden: string;
  asociado: string;
  correo: string;
  fuente: string;
  tipo: string;
  tema: string;
  motivo: string;
}

export const CAUSAS_RAIZ = ["Producto", "Logística", "Atención", "Información", "Otro"] as const;

export interface CloseFields {
  fechaSolucion: string;
  solucion: string;
  causaRaiz?: string;
  accionCorrectiva?: string;
}

export interface FieldError {
  field: CreateField | "fechaSolucion" | "solucion" | "causaRaiz" | "fecha" | "texto" | "form";
  message: string;
}

const REQUIRED: Record<CreateField, string> = {
  fechaInicial: "Fecha inicial es obligatoria",
  area: "Proveedor es obligatorio",
  idOrden: "ID de orden es obligatorio",
  asociado: "Asociado es obligatorio",
  correo: "Correo es obligatorio",
  fuente: "Fuente es obligatoria",
  tipo: "Tipo es obligatorio",
  tema: "Tema es obligatorio",
  motivo: "Motivo es obligatorio",
};

function text(raw: Record<string, string>, field: string): string {
  return (raw[field] ?? "").trim();
}

function createFields(raw: Record<string, string>): CreateFields {
  return {
    fechaInicial: text(raw, "fechaInicial"),
    area: text(raw, "area"),
    idOrden: text(raw, "idOrden"),
    asociado: text(raw, "asociado"),
    correo: text(raw, "correo"),
    fuente: text(raw, "fuente"),
    tipo: text(raw, "tipo"),
    tema: text(raw, "tema"),
    motivo: text(raw, "motivo"),
  };
}

export type Catalogs = Partial<Record<CatalogField, readonly string[]>>;

const CATALOG_LABELS: Record<CatalogField, string> = {
  area: "Proveedor",
  fuente: "Fuente",
  tipo: "Tipo",
  tema: "Tema",
};

export function validateCreate(
  raw: Record<string, string>,
  catalogs: Catalogs = {},
): { ok: true; fields: CreateFields } | { ok: false; fields: CreateFields; errors: FieldError[] } {
  const fields = createFields(raw);
  const errors: FieldError[] = [];
  for (const field of CREATE_FIELDS) {
    if (!fields[field]) errors.push({ field, message: REQUIRED[field] });
  }
  if (fields.fechaInicial) {
    const parsed = parseDateCell(fields.fechaInicial);
    if (parsed.invalid || !parsed.iso) {
      errors.push({ field: "fechaInicial", message: "Fecha inicial no es válida" });
    }
  }
  if (fields.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.correo)) {
    errors.push({ field: "correo", message: "Correo no es válido" });
  }
  for (const field of Object.keys(CATALOG_LABELS) as CatalogField[]) {
    const list = catalogs[field];
    if (!list || list.length === 0 || !fields[field]) continue;
    const wanted = lookupKey(fields[field]);
    const match = list.find((value) => lookupKey(value) === wanted);
    if (match === undefined) {
      errors.push({ field, message: `${CATALOG_LABELS[field]} no está en la lista` });
    } else {
      fields[field] = match;
    }
  }
  if (errors.length > 0) return { ok: false, fields, errors };
  return { ok: true, fields };
}

function official(dictionary: Dictionary, field: CatalogField, original: string): string {
  return dictionary.official(field, original);
}

export function caseFromCreate(fields: CreateFields, dictionary: Dictionary, id: string): PqrCase {
  const fecha = parseDateCell(fields.fechaInicial);
  return {
    id,
    sheetYear: Number(fields.fechaInicial.slice(0, 4)),
    rowNumber: 0,
    fechaInicial: fecha.iso,
    fechaSolucion: null,
    fechaInicialInvalida: false,
    fechaSolucionInvalida: false,
    diasSolucion: null,
    area: official(dictionary, "area", fields.area),
    areaOriginal: fields.area,
    idOrden: fields.idOrden,
    asociado: fields.asociado,
    correo: fields.correo,
    fuente: official(dictionary, "fuente", fields.fuente),
    fuenteOriginal: fields.fuente,
    tipo: official(dictionary, "tipo", fields.tipo),
    tipoOriginal: fields.tipo,
    tema: official(dictionary, "tema", fields.tema),
    temaOriginal: fields.tema,
    motivo: fields.motivo,
    solucion: null,
  };
}

export function validateClose(
  raw: Record<string, string>,
  fechaInicial: string | null,
): { ok: true; fields: CloseFields } | { ok: false; fields: CloseFields; errors: FieldError[] } {
  const fields: CloseFields = { fechaSolucion: text(raw, "fechaSolucion"), solucion: text(raw, "solucion") };
  const causaRaiz = text(raw, "causaRaiz");
  const accionCorrectiva = text(raw, "accionCorrectiva");
  if (causaRaiz) fields.causaRaiz = causaRaiz;
  if (accionCorrectiva) fields.accionCorrectiva = accionCorrectiva;
  const errors: FieldError[] = [];
  if (causaRaiz && !(CAUSAS_RAIZ as readonly string[]).includes(causaRaiz)) {
    errors.push({ field: "causaRaiz", message: "Causa raíz no es válida" });
  }
  if (!fields.fechaSolucion) {
    errors.push({ field: "fechaSolucion", message: "Fecha de solución es obligatoria" });
  } else {
    const parsed = parseDateCell(fields.fechaSolucion);
    if (parsed.invalid || !parsed.iso) {
      errors.push({ field: "fechaSolucion", message: "Fecha de solución no es válida" });
    } else if (!fechaInicial) {
      errors.push({ field: "fechaSolucion", message: "El caso no tiene una fecha inicial válida" });
    } else if (parsed.iso < fechaInicial) {
      errors.push({
        field: "fechaSolucion",
        message: "La fecha de solución no puede ser anterior a la fecha inicial",
      });
    }
  }
  if (!fields.solucion) {
    errors.push({ field: "solucion", message: "Texto de solución es obligatorio" });
  }
  if (errors.length > 0) return { ok: false, fields, errors };
  return { ok: true, fields };
}

export interface BitacoraFields {
  fecha: string;
  texto: string;
}

export interface BitacoraEntry extends BitacoraFields {
  id: number;
  caseId: string;
  creadoEn: string;
}

export function validateBitacora(
  raw: Record<string, string>,
  hoy: string,
): { ok: true; fields: BitacoraFields } | { ok: false; fields: BitacoraFields; errors: FieldError[] } {
  const fields = { fecha: text(raw, "fecha"), texto: text(raw, "texto") };
  const errors: FieldError[] = [];
  if (!fields.fecha) {
    errors.push({ field: "fecha", message: "Fecha es obligatoria" });
  } else {
    const parsed = parseDateCell(fields.fecha);
    if (parsed.invalid || !parsed.iso) {
      errors.push({ field: "fecha", message: "Fecha no es válida" });
    } else if (parsed.iso > hoy) {
      errors.push({ field: "fecha", message: "La fecha no puede ser futura" });
    } else {
      fields.fecha = parsed.iso;
    }
  }
  if (!fields.texto) errors.push({ field: "texto", message: "Texto es obligatorio" });
  if (errors.length > 0) return { ok: false, fields, errors };
  return { ok: true, fields };
}

export function applyClose(caso: PqrCase, fields: CloseFields, holidays: readonly string[]): PqrCase {
  if (holidays.length === 0) throw new Error("no holidays loaded");
  if (!caso.fechaInicial) throw new Error("invalid start date");
  return {
    ...caso,
    fechaSolucion: fields.fechaSolucion,
    fechaSolucionInvalida: false,
    solucion: fields.solucion,
    causaRaiz: fields.causaRaiz ?? null,
    accionCorrectiva: fields.accionCorrectiva ?? null,
    diasSolucion: businessDays(caso.fechaInicial, fields.fechaSolucion, holidays),
  };
}
