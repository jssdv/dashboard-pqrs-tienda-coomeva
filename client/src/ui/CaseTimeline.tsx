import { PLAZO_DIAS } from "../format";
import type { PqrCase } from "../types";

const FILL = {
  "en-plazo": "bg-primary",
  "por-vencer": "bg-warning",
  vencido: "bg-destructive",
} as const;

export function CaseTimeline({ caso }: { caso: PqrCase }) {
  const hasStart = caso.fechaInicial !== null && !caso.fechaInicialInvalida;
  const closed = caso.fechaSolucion !== null;
  const dias = closed ? caso.diasSolucion : (caso.riesgo?.diasAbiertos ?? null);
  const plazo = caso.riesgo ? caso.riesgo.diasAbiertos + caso.riesgo.diasParaVencer : PLAZO_DIAS;
  const estado =
    caso.riesgo?.estado ??
    (dias !== null && dias > plazo ? "vencido" : dias !== null && dias > plazo / 2 ? "por-vencer" : "en-plazo");
  const pct = dias === null ? 0 : (Math.min(Math.max(dias, 0), plazo) / plazo) * 100;

  return (
    <section aria-label="Línea de tiempo" className="border border-border p-4">
      {!hasStart ? (
        <p className="text-sm text-muted-foreground">Sin fecha de inicio</p>
      ) : (
        <>
          <div className="relative mt-4 mb-6 h-2 bg-muted">
            {dias !== null ? (
              <div data-fill className={`grow-x h-full ${FILL[estado]}`} style={{ width: `${pct}%` }} />
            ) : null}
            <span aria-hidden="true" className="absolute top-1/2 left-0 size-3 -translate-x-1/2 -translate-y-1/2 border-2 border-card bg-foreground" />
            {dias !== null ? (
              <span
                aria-hidden="true"
                className={`absolute top-1/2 size-3 -translate-y-1/2 border-2 border-card ${FILL[estado]}`}
                style={{ left: `${pct}%` }}
              />
            ) : null}
            <span aria-hidden="true" className="absolute top-full left-1/2 mt-1 -translate-x-1/2 font-mono text-[0.65rem] text-muted-foreground">{Math.floor(plazo / 2)}</span>
            <span aria-hidden="true" className="absolute top-full right-0 mt-1 translate-x-1/2 font-mono text-[0.65rem] text-muted-foreground">{plazo}</span>
          </div>
          <dl className="flex justify-between gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Inicio</dt>
              <dd className="m-0 font-mono">{caso.fechaInicial}</dd>
            </div>
            <div className="text-right">
              <dt className="text-xs text-muted-foreground">{closed ? "Solución" : "Hoy"}</dt>
              <dd className="m-0 font-mono">
                {closed ? caso.fechaSolucion : "en curso"}
                {dias !== null ? <span className="block text-xs text-muted-foreground">{dias} días hábiles</span> : null}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
