import { businessDays } from "./businessDays.js";
import { plazoOf, type Plazos } from "./risk.js";
import type { PqrCase } from "./types.js";

export function bogotaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function openQueue(
  cases: readonly PqrCase[],
  holidays: readonly string[],
  today: string,
  plazos?: Plazos,
): PqrCase[] {
  if (holidays.length === 0) throw new Error("no holidays loaded");
  return cases.filter((row) => {
    if (row.fechaSolucion !== null) return false;
    if (row.fechaInicial === null || row.fechaInicialInvalida) return false;
    return businessDays(row.fechaInicial, today, holidays) > plazoOf(row, plazos);
  });
}
