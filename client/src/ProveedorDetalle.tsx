import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getProviderTimeline, type ProveedorRow } from "./api";
import { AXIS, ChartTip, GRID, PRIMARY, useMotion, WARNING } from "./charts";
import { casosHref, promedioText } from "./format";
import type { MatrixRow, TimelinePoint } from "./types";

function TimelineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: TimelinePoint }>;
  label?: string | number;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <ChartTip>
      <p className="font-semibold">{label}</p>
      <p className="font-mono tabular-nums">Entrados {row.entrados}</p>
      <p className="font-mono tabular-nums">Cerrados {row.cerrados}</p>
      <p className="font-mono tabular-nums">Días promedio {promedioText(row.diasPromedio)}</p>
    </ChartTip>
  );
}

function Timeline({ nombre }: { nombre: string }) {
  const motion = useMotion();
  const [points, setPoints] = useState<TimelinePoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPoints(null);
    setError(null);
    getProviderTimeline(nombre).then(
      (next) => {
        if (!cancelled) setPoints(next);
      },
      (reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "No se pudo cargar la línea de tiempo");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [nombre]);

  if (error) return <p className="text-sm">{error}</p>;
  if (points === null) return <Skeleton className="h-52 w-full" />;
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Este proveedor no tiene meses con fecha válida.</p>;
  }
  return (
    <div className="h-52 w-full min-w-0">
      <p className="sr-only">
        Línea de tiempo de {nombre}.{" "}
        {points.map((row) => `${row.mes}: ${row.entrados} entrados, ${row.cerrados} cerrados`).join(". ")}
      </p>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="mes" minTickGap={28} tick={AXIS} />
          <YAxis width={32} allowDecimals={false} tick={AXIS} />
          <ChartTooltip content={<TimelineTooltip />} />
          <Line
            type="monotone"
            dataKey="entrados"
            name="Entrados"
            stroke={PRIMARY}
            strokeWidth={2}
            dot={false}
            isAnimationActive={motion}
            animationDuration={240}
          />
          <Line
            type="monotone"
            dataKey="cerrados"
            name="Cerrados"
            stroke={WARNING}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={motion}
            animationDuration={240}
          />
          <Legend />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProveedorDetalle({
  row,
  tipos,
  onRename,
}: {
  row: ProveedorRow;
  tipos: MatrixRow | undefined;
  onRename: (desde: string, hacia: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(row.nombre);
  useEffect(() => setNombre(row.nombre), [row.nombre]);
  const celdas = (tipos?.celdas ?? []).filter((cell) => cell.total > 0);

  function submit(event: FormEvent) {
    event.preventDefault();
    void onRename(row.nombre, nombre);
  }

  return (
    <div className="grid gap-5 py-4 md:grid-cols-2">
      <section aria-label="Por tipo">
        <h3 className="mb-2 text-sm font-semibold">Por tipo</h3>
        {celdas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin casos.</p>
        ) : (
          <ul className="grid gap-1">
            {celdas.map((cell) => (
              <li key={cell.tipo} className="flex items-center justify-between gap-3">
                <span>{cell.tipo}</span>
                <Link
                  className="inline-flex min-h-11 items-center font-mono text-primary"
                  to={casosHref({ area: row.nombre, tipo: cell.tipo })}
                >
                  {cell.abiertos > 0 ? `${cell.total} · ${cell.abiertos} abiertos` : String(cell.total)}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid min-w-40 flex-1 gap-1.5">
            <Label htmlFor={`renombrar-${row.nombre}`}>Nombre del proveedor</Label>
            <Input id={`renombrar-${row.nombre}`} value={nombre} onChange={(event) => setNombre(event.target.value)} />
          </div>
          <Button className="min-h-11" type="submit" disabled={nombre.trim() === "" || nombre.trim() === row.nombre}>
            Renombrar
          </Button>
        </form>
      </section>
      <section aria-label="Línea de tiempo">
        <h3 className="mb-2 text-sm font-semibold">Entrados y cerrados por mes</h3>
        <Timeline nombre={row.nombre} />
      </section>
    </div>
  );
}
