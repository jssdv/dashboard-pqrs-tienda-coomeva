import { businessDays, dueDate } from "./businessDays.js";
import type { PqrCase } from "./types.js";

export const PLAZO_DIAS = 10;

export type PlazoEstado = "en-plazo" | "por-vencer" | "vencido";

/** Plazo propio por proveedor (nombre → días hábiles); sin entrada rige PLAZO_DIAS. */
export type Plazos = ReadonlyMap<string, number>;

export function plazoOf(caso: PqrCase, plazos?: Plazos): number {
  return (caso.area ? plazos?.get(caso.area) : undefined) ?? PLAZO_DIAS;
}

export interface Riesgo {
  diasAbiertos: number;
  diasParaVencer: number;
  estado: PlazoEstado;
  vence: string;
}

export function riskOf(
  caso: PqrCase,
  holidays: readonly string[],
  today: string,
  plazos?: Plazos,
): Riesgo | null {
  if (holidays.length === 0) throw new Error("no holidays loaded");
  if (caso.fechaSolucion !== null) return null;
  if (caso.fechaInicial === null || caso.fechaInicialInvalida) return null;
  const diasAbiertos = Math.max(0, businessDays(caso.fechaInicial, today, holidays));
  const plazo = plazoOf(caso, plazos);
  const estado: PlazoEstado =
    diasAbiertos <= Math.floor(plazo / 2) ? "en-plazo" : diasAbiertos <= plazo ? "por-vencer" : "vencido";
  return {
    diasAbiertos,
    diasParaVencer: plazo - diasAbiertos,
    estado,
    vence: dueDate(caso.fechaInicial, plazo, holidays),
  };
}
