import type { BitacoraEntry, BitacoraFields } from "../domain/caseForm.js";
import type { PqrCase } from "../domain/types.js";

export interface CaseRepository {
  replaceAll(cases: PqrCase[]): void;
  list(): PqrCase[];
  insert(caso: PqrCase): void;
  update(caso: PqrCase): void;
  listHolidays(): string[];
  addHolidays(dates: readonly string[]): void;
  listProveedores(): string[];
  addProveedor(nombre: string): void;
  renameProveedor(desde: string, hacia: string): void;
  listBitacora(caseId: string): BitacoraEntry[];
  addBitacora(caseId: string, fields: BitacoraFields, creadoEn: string): BitacoraEntry;
}
