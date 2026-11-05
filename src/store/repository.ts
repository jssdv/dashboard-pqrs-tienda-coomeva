import type { BitacoraEntry, BitacoraFields } from "../domain/caseForm.js";
import type { PqrCase } from "../domain/types.js";

export interface ProveedorFields {
  contacto: string;
  correo: string;
  telefono: string;
  notas: string;
  activo: boolean;
  plazoDias: number | null;
}

export interface ProveedorInfo extends ProveedorFields {
  nombre: string;
}

export class ProveedorExistsError extends Error {
  constructor(nombre: string) {
    super(`Ya existe un proveedor llamado "${nombre}"`);
  }
}

const fold = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

export function sameName(a: string, b: string): boolean {
  return fold(a) === fold(b);
}

export interface CaseRepository {
  replaceAll(cases: PqrCase[]): void;
  list(): PqrCase[];
  insert(caso: PqrCase, creadoPor: string): void;
  // cerradoPor solo se pasa al cerrar el caso; sin él la columna no cambia.
  update(caso: PqrCase, cerradoPor?: string): void;
  remove(id: string): void;
  listHolidays(): string[];
  addHolidays(dates: readonly string[]): void;
  listProveedores(): string[];
  listProveedorInfo(): ProveedorInfo[];
  addProveedor(nombre: string): void;
  updateProveedor(nombre: string, fields: ProveedorFields): void;
  renameProveedor(desde: string, hacia: string): void;
  listBitacora(caseId: string): BitacoraEntry[];
  getBitacora(id: number): BitacoraEntry | null;
  addBitacora(caseId: string, fields: BitacoraFields, creadoEn: string, autor: string): BitacoraEntry;
  updateBitacora(id: number, fields: BitacoraFields): void;
  removeBitacora(id: number): void;
}
