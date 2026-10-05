import type { FieldError, Riesgo } from "./types";

export function promedioText(value: number | null): string {
  if (value === null) return "—";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

export function percent(tasa: number): string {
  const value = Math.round(tasa * 1000) / 10;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

export function casosHref(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/casos?${query}` : "/casos";
}

export function fieldMessage(errors: FieldError[], field: string): string {
  return errors
    .filter((error) => error.field === field)
    .map((error) => error.message)
    .join(" ");
}

export function textOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function plazoLabel(
  riesgo?: Riesgo,
): { text: string; variant: "secondary" | "warning" | "destructive" } | null {
  if (!riesgo) return null;
  if (riesgo.estado === "vencido") {
    const dias = -riesgo.diasParaVencer;
    return { text: `Vencido · ${dias} ${dias === 1 ? "día" : "días"}`, variant: "destructive" };
  }
  if (riesgo.estado === "por-vencer") {
    return {
      text: riesgo.diasParaVencer === 0 ? "Vence hoy" : `Por vencer · faltan ${riesgo.diasParaVencer}`,
      variant: "warning",
    };
  }
  return { text: `En plazo · faltan ${riesgo.diasParaVencer}`, variant: "secondary" };
}
