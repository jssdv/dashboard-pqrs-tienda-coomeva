import { PLAZO_DIAS } from "../format";

const FILL = {
  "en-plazo": "bg-primary",
  "por-vencer": "bg-warning",
  vencido: "bg-destructive",
} as const;

export function PlazoBar({
  dias,
  estado,
  plazo = PLAZO_DIAS,
}: {
  dias: number | null;
  plazo?: number;
  estado: "en-plazo" | "por-vencer" | "vencido" | null;
}) {
  if (dias === null || estado === null) {
    return <span className="text-xs text-muted-foreground">Sin fecha de inicio</span>;
  }
  const pct = (Math.min(Math.max(dias, 0), plazo) / plazo) * 100;
  return (
    <div
      role="img"
      aria-label={`${dias} días hábiles de ${plazo}`}
      className="relative h-1.5 w-full min-w-16 overflow-hidden bg-muted"
    >
      <div data-fill className={`grow-x h-full ${FILL[estado]}`} style={{ width: `${pct}%` }} />
      <span data-tick aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-card/80" />
      <span data-tick aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-card/80" />
    </div>
  );
}
