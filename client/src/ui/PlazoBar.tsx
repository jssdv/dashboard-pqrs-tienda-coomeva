const FILL = {
  "en-plazo": "bg-primary",
  "por-vencer": "bg-warning",
  vencido: "bg-destructive",
} as const;

export function PlazoBar({
  dias,
  estado,
}: {
  dias: number | null;
  estado: "en-plazo" | "por-vencer" | "vencido" | null;
}) {
  if (dias === null || estado === null) {
    return <span className="text-xs text-muted-foreground">Sin fecha de inicio</span>;
  }
  const pct = Math.min(Math.max(dias, 0), 10) * 10;
  return (
    <div
      role="img"
      aria-label={`${dias} días hábiles de 10`}
      className="relative h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted"
    >
      <div data-fill className={`h-full rounded-full ${FILL[estado]}`} style={{ width: `${pct}%` }} />
      <span data-tick aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-card/80" />
      <span data-tick aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-card/80" />
    </div>
  );
}
