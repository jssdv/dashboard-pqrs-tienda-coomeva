import { businessDays } from "./businessDays.js";
import type { PqrCase } from "./types.js";

export const PLAZO_DIAS = 10;

export type PlazoEstado = "en-plazo" | "por-vencer" | "vencido";

export interface Riesgo {
  diasAbiertos: number;
  diasParaVencer: number;
  estado: PlazoEstado;
}

export function riskOf(
  caso: PqrCase,
  holidays: readonly string[],
  today: string,
): Riesgo | null {
  if (holidays.length === 0) throw new Error("no holidays loaded");
  if (caso.fechaSolucion !== null) return null;
  if (caso.fechaInicial === null || caso.fechaInicialInvalida) return null;
  const diasAbiertos = Math.max(0, businessDays(caso.fechaInicial, today, holidays));
  const estado: PlazoEstado =
    diasAbiertos <= 5 ? "en-plazo" : diasAbiertos <= PLAZO_DIAS ? "por-vencer" : "vencido";
  return { diasAbiertos, diasParaVencer: PLAZO_DIAS - diasAbiertos, estado };
}
