import { tipoColor } from "../palette";
import { useTheme } from "../theme";

export function TipoTag({ tipo }: { tipo: string | null }) {
  const { resolved } = useTheme();
  if (!tipo) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        data-dot
        aria-hidden="true"
        className="size-2 shrink-0"
        style={{ backgroundColor: tipoColor(tipo, resolved) }}
      />
      <span>{tipo}</span>
    </span>
  );
}
