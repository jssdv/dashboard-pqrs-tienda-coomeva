export interface CountBucket {
  key: string;
  count: number;
}

export interface CloseRate {
  tipo: string;
  entrados: number;
  cerrados: number;
  tasa: number;
}

export interface MonthFlow {
  mes: string;
  entrados: number;
  cerrados: number;
}

export interface AgingBucket {
  key: "0-5" | "6-10" | "mas-10";
  count: number;
}

export interface MatrixCell {
  tipo: string;
  total: number;
  abiertos: number;
}

export interface MatrixRow {
  area: string;
  total: number;
  abiertos: number;
  celdas: MatrixCell[];
}

export interface MonthPoint {
  mes: string;
  entrados: number;
  cerrados: number;
  abiertosAlCierre: number;
  diasPromedio: number | null;
}

export interface DashboardSummary {
  total: number;
  abiertos: number;
  cerrados: number;
  fechasInvalidas: number;
  porAnio: CountBucket[];
  porArea: CountBucket[];
  porFuente: CountBucket[];
  porTipo: CountBucket[];
  porTema: CountBucket[];
  porMes: CountBucket[];
  flujoPorMes: MonthFlow[];
  antiguedad: AgingBucket[] | null;
  abiertosPorArea: CountBucket[];
  abiertosPorTema: CountBucket[];
  dias: { casos: number; promedio: number | null };
  colaVencida: number | null;
  colaError: string | null;
  cierrePorTipo: CloseRate[];
  sinFechaValida: number;
  serieMensual: MonthPoint[];
  matrizProveedorTipo: MatrixRow[];
}

export type PlazoEstado = "en-plazo" | "por-vencer" | "vencido";

export interface Riesgo {
  diasAbiertos: number;
  diasParaVencer: number;
  estado: PlazoEstado;
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
  riesgo?: Riesgo;
}

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

export interface CloseFields {
  fechaSolucion: string;
  solucion: string;
}

export interface FieldError {
  field: keyof CreateFields | keyof CloseFields | "form";
  message: string;
}

export interface CaseQuery {
  cola?: string;
  area?: string;
  tipo?: string;
  mes?: string;
  plazo?: string;
  fecha?: string;
}

export interface TimelinePoint {
  mes: string;
  entrados: number;
  cerrados: number;
  diasPromedio: number | null;
}

export interface Catalogs {
  area: string[];
  fuente: string[];
  tipo: string[];
  tema: string[];
}
