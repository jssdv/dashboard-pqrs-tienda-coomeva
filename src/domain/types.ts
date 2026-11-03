export type CatalogField = "area" | "fuente" | "tipo" | "tema";

export type RawCell = string | number | Date | null;

export interface RawRow {
  sheetYear: number;
  rowNumber: number;
  cells: Record<string, RawCell>;
}

export interface PqrCase {
  id: string;
  sheetYear: number;
  rowNumber: number;
  fechaInicial: string | null;
  fechaSolucion: string | null;
  fechaInicialInvalida: boolean;
  fechaSolucionInvalida: boolean;
  diasSolucion: number | null;
  area: string | null;
  areaOriginal: string | null;
  idOrden: string | null;
  asociado: string | null;
  correo: string | null;
  fuente: string | null;
  fuenteOriginal: string | null;
  tipo: string | null;
  tipoOriginal: string | null;
  tema: string | null;
  temaOriginal: string | null;
  motivo: string | null;
  solucion: string | null;
  causaRaiz?: string | null;
  accionCorrectiva?: string | null;
}
