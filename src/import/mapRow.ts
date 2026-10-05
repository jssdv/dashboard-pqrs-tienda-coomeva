import { businessDays } from "../domain/businessDays.js";
import { parseDateCell } from "../domain/dates.js";
import type { Dictionary } from "../domain/dictionary.js";
import type { CanonicalField } from "../domain/headers.js";
import type { CatalogField, PqrCase, RawCell, RawRow } from "../domain/types.js";

const TEXT_FIELDS = [
  "area",
  "idOrden",
  "asociado",
  "correo",
  "fuente",
  "tipo",
  "tema",
  "motivo",
  "solucion",
] as const;

type TextField = (typeof TEXT_FIELDS)[number];

function cellText(value: RawCell | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function fieldValue(
  row: RawRow,
  headers: Record<string, CanonicalField>,
  field: CanonicalField,
): RawCell | undefined {
  for (const [label, mapped] of Object.entries(headers)) {
    if (mapped === field) return row.cells[label];
  }
  return undefined;
}

export function mapRow(
  row: RawRow,
  headers: Record<string, CanonicalField>,
  dictionary: Dictionary,
  holidays: readonly string[],
): PqrCase | null {
  const text = {} as Record<TextField, string | null>;
  for (const field of TEXT_FIELDS) {
    text[field] = cellText(fieldValue(row, headers, field));
  }
  const inicial = fieldValue(row, headers, "fechaInicial");
  const emptyInicial = inicial === undefined || inicial === null || inicial === "";
  if (emptyInicial && !text.area && !text.asociado && !text.motivo) return null;

  const fechaInicial = parseDateCell(fieldValue(row, headers, "fechaInicial") ?? null);
  const fechaSolucion = parseDateCell(fieldValue(row, headers, "fechaSolucion") ?? null);

  const catalog = (field: CatalogField, original: string | null) =>
    original === null ? null : dictionary.official(field, original);

  const mapped: PqrCase = {
    id: `${row.sheetYear}-${row.rowNumber}`,
    sheetYear: row.sheetYear,
    rowNumber: row.rowNumber,
    fechaInicial: fechaInicial.iso,
    fechaSolucion: fechaSolucion.iso,
    fechaInicialInvalida: fechaInicial.invalid,
    fechaSolucionInvalida: fechaSolucion.invalid,
    diasSolucion: null,
    area: catalog("area", text.area),
    areaOriginal: text.area,
    idOrden: text.idOrden,
    asociado: text.asociado,
    correo: text.correo,
    fuente: catalog("fuente", text.fuente),
    fuenteOriginal: text.fuente,
    tipo: catalog("tipo", text.tipo),
    tipoOriginal: text.tipo,
    tema: catalog("tema", text.tema),
    temaOriginal: text.tema,
    motivo: text.motivo,
    solucion: text.solucion,
  };

  if (
    mapped.fechaInicial &&
    mapped.fechaSolucion &&
    !mapped.fechaInicialInvalida &&
    !mapped.fechaSolucionInvalida
  ) {
    mapped.diasSolucion = businessDays(mapped.fechaInicial, mapped.fechaSolucion, holidays);
  }
  return mapped;
}
