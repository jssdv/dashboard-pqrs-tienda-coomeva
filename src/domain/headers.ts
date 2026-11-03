import { lookupKey } from "./normalize.js";

export type CanonicalField =
  | "fechaInicial"
  | "fechaSolucion"
  | "area"
  | "idOrden"
  | "asociado"
  | "correo"
  | "fuente"
  | "tipo"
  | "tema"
  | "motivo"
  | "solucion";

const LABELS: Record<string, CanonicalField> = {
  [lookupKey("FECHA INICIAL")]: "fechaInicial",
  [lookupKey("FECHA SOLUCION")]: "fechaSolucion",
  [lookupKey("AREA")]: "area",
  [lookupKey("ID ORDEN")]: "idOrden",
  [lookupKey("ASOCIADO")]: "asociado",
  [lookupKey("CORREO")]: "correo",
  [lookupKey("FUENTE")]: "fuente",
  [lookupKey("TIPO PQRS")]: "tipo",
  [lookupKey("TEMA")]: "tema",
  [lookupKey("PQRS")]: "motivo",
  [lookupKey("MOTIVO PQRS")]: "motivo",
  [lookupKey("SOLUCION")]: "solucion",
};

export function mapHeaders(labels: readonly string[]): Record<string, CanonicalField> {
  const result: Record<string, CanonicalField> = {};
  for (const label of labels) {
    const field = LABELS[lookupKey(label)];
    if (field) result[label] = field;
  }
  return result;
}
