import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiError, getSummary } from "./api";
import { axisTick, ChartTip, Meter, useMotion } from "./charts";
import { casosHref, percent, promedioText } from "./format";
import { bogotaMonth, completeMonths, deltaPct, tasaCierre } from "./metrics";
import { Card, PageHead } from "./Shell";
import { SegmentedBar } from "./ui/SegmentedBar";
import { StatCard } from "./ui/StatCard";
import { TipoTag } from "./ui/TipoTag";
import { useChartColors } from "./useChartColors";
import type { CountBucket, DashboardSummary, MonthPoint } from "./types";

const TOP = 8;
const RANGES = [
  { key: "6", label: "6 m", months: 6 },
  { key: "12", label: "12 m", months: 12 },
  { key: "all", label: "Todo", months: Infinity },
] as const;

function flowPoints(summary: DashboardSummary): Array<{ mes: string; entrados: number; cerrados: number }> {
  if (summary.serieMensual.length > 0) return summary.serieMensual;
  return summary.flujoPorMes;
}

function FlowTooltip({
  active,
  payload,
  label,
  mean,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string; value?: number }>;
  label?: string | number;
  mean: number;
}) {
  if (!active || !payload?.length) return null;
  const value = (key: string) => payload.find((item) => item.dataKey === key)?.value ?? 0;
  return (
    <ChartTip>
      <p className="font-medium">{label}</p>
      <p className="font-mono tabular-nums">Entrados {value("entrados")}</p>
      <p className="font-mono tabular-nums">Cerrados {value("cerrados")}</p>
      {mean > 0 && value("entrados") > mean * 1.5 ? (
        <p className="mt-1 text-xs text-warning-foreground">Mes con alta demanda</p>
      ) : null}
    </ChartTip>
  );
}

function RangeToggle({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Rango" className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-sm">
      {RANGES.map((range) => (
        <button
          key={range.key}
          type="button"
          role="radio"
          aria-checked={value === range.key}
          onClick={() => onChange(range.key)}
          className={`min-h-9 cursor-pointer rounded-md px-3 font-medium transition-colors ${
            value === range.key ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

function FlowChart({ rows }: { rows: Array<{ mes: string; entrados: number; cerrados: number }> }) {
  const navigate = useNavigate();
  const motion = useMotion();
  const colors = useChartColors();
  const mean = rows.reduce((sum, row) => sum + row.entrados, 0) / Math.max(1, rows.length);
  const peaks = rows.filter((row) => mean > 0 && row.entrados > mean * 1.5);
  return (
    <>
      <div className="h-60 w-full min-w-0">
        <p className="sr-only">
          Casos entrados y cerrados por mes.{" "}
          {rows.map((row) => `${row.mes}: ${row.entrados} entrados, ${row.cerrados} cerrados`).join(". ")}
        </p>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onClick={(state) => {
              const mes = state?.activeLabel;
              if (mes) navigate(casosHref({ mes: String(mes) }));
            }}
          >
            <defs>
              <linearGradient id="entrados-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.primary} stopOpacity={0.25} />
                <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={colors.grid} vertical={false} strokeDasharray="4 4" />
            <XAxis dataKey="mes" minTickGap={28} tick={axisTick(colors)} axisLine={false} tickLine={false} />
            <YAxis width={32} allowDecimals={false} tick={axisTick(colors)} axisLine={false} tickLine={false} />
            <ChartTooltip content={<FlowTooltip mean={mean} />} cursor={{ stroke: colors.axis, strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="entrados"
              stroke={colors.primary}
              strokeWidth={2}
              fill="url(#entrados-fill)"
              isAnimationActive={motion}
              animationDuration={700}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="cerrados"
              stroke={colors.warning}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={motion}
              animationDuration={700}
              animationEasing="ease-out"
            />
            {peaks.map((row) => (
              <ReferenceDot key={row.mes} x={row.mes} y={row.entrados} r={4} fill={colors.primary} stroke={colors.surface} strokeWidth={2} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-muted-foreground">
        <li className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 bg-primary" />
          Entrados
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="w-4 border-t-2 border-dashed border-warning" />
          Cerrados
        </li>
        {peaks.length > 0 ? (
          <li className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary ring-2 ring-card" />
            Mes con alta demanda
          </li>
        ) : null}
      </ul>
    </>
  );
}

function RankedList({ buckets, hrefFor }: { buckets: CountBucket[]; hrefFor: (key: string) => string }) {
  const shown = buckets.slice(0, TOP);
  const max = Math.max(1, ...shown.map((bucket) => bucket.count));
  if (shown.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay casos abiertos.</p>;
  }
  return (
    <>
      <ul className="grid gap-1">
        {shown.map((bucket) => (
          <li key={bucket.key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                to={hrefFor(bucket.key)}
                className="inline-flex min-h-9 min-w-0 items-center break-words text-sm font-medium text-foreground no-underline hover:text-primary"
              >
                {bucket.key}
              </Link>
              <span className="shrink-0 font-mono text-sm tabular-nums">{bucket.count}</span>
            </div>
            <Meter value={bucket.count} max={max} />
          </li>
        ))}
      </ul>
      {buckets.length > TOP ? (
        <p className="mt-3 text-sm text-muted-foreground">Otras {buckets.length - TOP}</p>
      ) : null}
    </>
  );
}

function Plazos({ summary }: { summary: DashboardSummary }) {
  if (!summary.antiguedad) {
    return <p className="text-sm text-muted-foreground">Sin festivos</p>;
  }
  const [enPlazo, porVencer, vencido] = summary.antiguedad;
  return (
    <SegmentedBar
      segments={[
        { key: "en-plazo", label: "En plazo (0 a 5 días hábiles)", count: enPlazo.count, tone: "ok", href: casosHref({ plazo: "en-plazo" }) },
        { key: "por-vencer", label: "Por vencer (6 a 10)", count: porVencer.count, tone: "warn", href: casosHref({ plazo: "por-vencer" }) },
        { key: "vencido", label: "Vencido (más de 10)", count: vencido.count, tone: "danger", href: casosHref({ plazo: "vencido" }) },
        {
          key: "sin-fecha",
          label: "Sin fecha de inicio",
          count: summary.sinFechaValida,
          tone: "muted",
          href: casosHref({ estado: "abiertos", fecha: "invalida" }),
        },
      ]}
    />
  );
}

function band(tasa: number): { label: string; bar: string } {
  if (tasa >= 0.9) return { label: "Alta", bar: "text-primary" };
  if (tasa >= 0.7) return { label: "Media", bar: "text-warning" };
  return { label: "Baja", bar: "text-destructive" };
}

function CloseTable({ rows }: { rows: DashboardSummary["cierrePorTipo"] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">Tasa de cierre por tipo</caption>
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted-foreground">
          <th className="py-2 font-medium">Tipo</th>
          <th className="hidden py-2 text-right font-medium sm:table-cell">Entrados</th>
          <th className="hidden py-2 text-right font-medium sm:table-cell">Cerrados</th>
          <th className="py-2 pl-4 font-medium sm:w-2/5">Tasa</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const level = band(row.tasa);
          return (
            <tr key={row.tipo} className="border-b border-border last:border-0">
              <td className="py-2 break-words">
                <Link className="font-medium text-foreground no-underline hover:text-primary" to={casosHref({ tipo: row.tipo })}>
                  <TipoTag tipo={row.tipo} />
                </Link>
              </td>
              <td className="hidden py-2 text-right font-mono tabular-nums sm:table-cell">{row.entrados}</td>
              <td className="hidden py-2 text-right font-mono tabular-nums sm:table-cell">{row.cerrados}</td>
              <td className="py-2 pl-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <div className={`min-w-16 flex-1 ${level.bar}`}>
                    <Meter value={row.tasa} max={1} />
                  </div>
                  <span className="w-12 text-right font-mono tabular-nums">{percent(row.tasa)}</span>
                  <span className="w-12 text-xs text-muted-foreground">{level.label}</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AlertCard({
  index,
  tone,
  icon: Icon,
  label,
  value,
  href,
  note,
}: {
  index: number;
  tone: "danger" | "warn";
  icon: typeof AlertTriangle;
  label: string;
  value: string;
  href?: string;
  note: string;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground"}`}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{note}</span>
      </span>
      <span className="font-mono text-2xl font-semibold tabular-nums">{value}</span>
    </>
  );
  const cls = "fade-up lift flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card p-4 text-foreground no-underline";
  return href ? (
    <Link to={href} style={{ "--i": index } as React.CSSProperties} className={cls}>
      {body}
    </Link>
  ) : (
    <div style={{ "--i": index } as React.CSSProperties} className={cls}>
      {body}
    </div>
  );
}

function ResumenSkeleton() {
  return (
    <>
      <PageHead title="Panel" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
        <p className="sr-only">Cargando…</p>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>
    </>
  );
}

function lastTwo(serie: MonthPoint[]): { last?: MonthPoint; prev?: MonthPoint } {
  return { last: serie[serie.length - 1], prev: serie[serie.length - 2] };
}

export function Resumen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("12");

  useEffect(() => {
    let cancelled = false;
    getSummary().then(
      (next) => {
        if (!cancelled) setSummary(next);
      },
      (reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof ApiError ? reason.message : "No se pudo cargar el resumen");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const flow = useMemo(() => {
    if (!summary) return [];
    const points = flowPoints(summary);
    const months = RANGES.find((item) => item.key === range)?.months ?? Infinity;
    return Number.isFinite(months) ? points.slice(-months) : points;
  }, [summary, range]);

  if (error) {
    return <p className="rounded-xl border border-border bg-card p-4">{error}</p>;
  }
  if (!summary) return <ResumenSkeleton />;

  const serie = completeMonths(summary.serieMensual, bogotaMonth());
  const { last, prev } = lastTwo(serie);
  const last12 = serie.slice(-12);
  const colaMissing = Boolean(summary.colaError) || summary.colaVencida === null;
  const tasaLast = last ? tasaCierre(last) : null;
  const tasaPrev = prev ? tasaCierre(prev) : null;
  const monthCaption = last?.mes;

  return (
    <>
      <PageHead
        title="Panel"
        lede={colaMissing ? `${summary.abiertos} abiertos` : `${summary.abiertos} abiertos · ${summary.colaVencida} vencidos`}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Indicadores">
        <StatCard
          index={0}
          label="Abiertos"
          value={String(summary.abiertos)}
          href={casosHref({ estado: "abiertos" })}
          delta={{ pct: deltaPct(last?.abiertosAlCierre ?? null, prev?.abiertosAlCierre ?? null), good: "down" }}
          series={last12.map((point) => point.abiertosAlCierre)}
          seriesLabel="Pendientes a fin de mes, últimos 12 meses"
        />
        <StatCard
          index={1}
          label="Entrados"
          caption={monthCaption}
          value={last ? String(last.entrados) : "—"}
          delta={{ pct: deltaPct(last?.entrados ?? null, prev?.entrados ?? null), good: "neutral" }}
          series={last12.map((point) => point.entrados)}
          seriesLabel="Casos entrados por mes, últimos 12 meses"
          kind="bar"
        />
        <StatCard
          index={2}
          label="Tasa de cierre"
          caption={monthCaption}
          value={tasaLast === null ? "—" : percent(tasaLast)}
          delta={{ pct: deltaPct(tasaLast, tasaPrev), good: "up" }}
          series={last12.map((point) => {
            const tasa = tasaCierre(point);
            return tasa === null ? null : Math.round(tasa * 100);
          })}
          seriesLabel="Tasa de cierre por mes, últimos 12 meses"
        />
        <StatCard
          index={3}
          label="Días promedio"
          value={promedioText(summary.dias.promedio)}
          delta={{ pct: deltaPct(last?.diasPromedio ?? null, prev?.diasPromedio ?? null), good: "down" }}
          series={last12.map((point) => point.diasPromedio)}
          seriesLabel="Días promedio de solución por mes, últimos 12 meses"
        />
      </div>
      <div role="region" aria-label="Alertas" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AlertCard
          index={4}
          tone="danger"
          icon={AlertTriangle}
          label="Vencidos"
          note="Más de 10 días hábiles abiertos"
          value={colaMissing ? "Sin festivos" : String(summary.colaVencida)}
          href={colaMissing ? undefined : casosHref({ plazo: "vencido" })}
        />
        <AlertCard
          index={5}
          tone="warn"
          icon={CalendarX}
          label="Sin fecha de inicio"
          note="Abiertos que no se pueden medir"
          value={String(summary.sinFechaValida)}
          href={casosHref({ estado: "abiertos", fecha: "invalida" })}
        />
      </div>
      {summary.total === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-card p-6">
          Todavía no hay casos importados. Ejecuta <code className="font-mono">npm run import</code>.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card index={6} title="Entrados y cerrados" action={<RangeToggle value={range} onChange={setRange} />}>
            {flow.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay meses con fecha válida.</p>
            ) : (
              <FlowChart rows={flow} />
            )}
          </Card>
          <Card index={7} title="Plazos de casos abiertos">
            <Plazos summary={summary} />
          </Card>
          <Card index={8} title="Abiertos por proveedor">
            <RankedList
              buckets={summary.abiertosPorArea}
              hrefFor={(key) => casosHref({ estado: "abiertos", area: key })}
            />
          </Card>
          <Card index={9} title="Temas abiertos">
            <RankedList
              buckets={summary.abiertosPorTema}
              hrefFor={(key) => casosHref({ estado: "abiertos", tema: key })}
            />
          </Card>
          {summary.cierrePorTipo.length > 0 ? (
            <div className="min-w-0 lg:col-span-2">
              <Card index={10} title="Tasa de cierre por tipo">
                <CloseTable rows={summary.cierrePorTipo} />
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
