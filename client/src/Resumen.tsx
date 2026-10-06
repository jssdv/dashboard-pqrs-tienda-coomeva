import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card as UiCard, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiError, getSummary } from "./api";
import { axisTick, ChartTip, Meter, useMotion } from "./charts";
import { useChartColors } from "./useChartColors";
import { casosHref, percent, promedioText } from "./format";
import { Card, PageHead } from "./Shell";
import type { CloseRate, CountBucket, DashboardSummary, MonthFlow } from "./types";

const TOP = 5;

function FlowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string; value?: number }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const value = (key: string) => payload.find((item) => item.dataKey === key)?.value ?? 0;
  return (
    <ChartTip>
      <p className="font-medium">{label}</p>
      <p className="font-mono tabular-nums">Entrados {value("entrados")}</p>
      <p className="font-mono tabular-nums">Cerrados {value("cerrados")}</p>
    </ChartTip>
  );
}

function FlowChart({ rows }: { rows: MonthFlow[] }) {
  const navigate = useNavigate();
  const motion = useMotion();
  const colors = useChartColors();
  return (
    <>
      <div className="h-56 w-full min-w-0">
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
                <stop offset="0%" stopColor={colors.primary} stopOpacity={0.2} />
                <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={colors.grid} vertical={false} strokeDasharray="4 4" />
            <XAxis dataKey="mes" minTickGap={28} tick={axisTick(colors)} />
            <YAxis width={32} allowDecimals={false} tick={axisTick(colors)} />
            <ChartTooltip content={<FlowTooltip />} />
            <Area
              type="monotone"
              dataKey="entrados"
              stroke={colors.primary}
              strokeWidth={2}
              fill="url(#entrados-fill)"
              isAnimationActive={motion}
              animationDuration={240}
            />
            <Line
              type="monotone"
              dataKey="cerrados"
              stroke={colors.warning}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={motion}
              animationDuration={240}
            />
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
      <ul className="grid gap-2">
        {shown.map((bucket) => (
          <li key={bucket.key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                to={hrefFor(bucket.key)}
                className="inline-flex min-h-11 min-w-0 items-center break-words font-medium text-foreground no-underline"
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
  const rows = [
    { label: "En plazo (0 a 5 días hábiles)", count: enPlazo.count, href: casosHref({ plazo: "en-plazo" }) },
    { label: "Por vencer (6 a 10)", count: porVencer.count, href: casosHref({ plazo: "por-vencer" }) },
    { label: "Vencido (más de 10)", count: vencido.count, href: casosHref({ plazo: "vencido" }) },
    {
      label: "Sin fecha de inicio",
      count: summary.sinFechaValida,
      href: casosHref({ estado: "abiertos", fecha: "invalida" }),
    },
  ];
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ul className="grid gap-2">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <Link
              to={row.href}
              className="inline-flex min-h-11 items-center font-medium text-foreground no-underline"
            >
              {row.label}
            </Link>
            <span className="font-mono text-sm tabular-nums">{row.count}</span>
          </div>
          <Meter value={row.count} max={max} />
        </li>
      ))}
    </ul>
  );
}

function CloseTable({ rows }: { rows: CloseRate[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">Tasa de cierre por tipo</caption>
      <thead>
        <tr className="border-b border-border text-left">
          <th className="py-2 font-semibold">Tipo</th>
          <th className="py-2 text-right font-semibold">Entrados</th>
          <th className="py-2 text-right font-semibold">Cerrados</th>
          <th className="w-1/3 py-2 pl-4 font-semibold">Tasa</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.tipo} className="border-b border-border">
            <td className="py-2 break-words">
              <Link className="font-semibold text-primary" to={casosHref({ tipo: row.tipo })}>
                {row.tipo}
              </Link>
            </td>
            <td className="py-2 text-right font-mono tabular-nums">{row.entrados}</td>
            <td className="py-2 text-right font-mono tabular-nums">{row.cerrados}</td>
            <td className="py-2 pl-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Meter value={row.tasa} max={1} />
                </div>
                <span className="w-12 text-right font-mono tabular-nums">{percent(row.tasa)}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResumenSkeleton() {
  return (
    <>
      <PageHead title="Panel" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
        <p className="sr-only">Cargando…</p>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  name,
  href,
  warn = false,
}: {
  label: ReactNode;
  value: string;
  name: string;
  href?: string;
  warn?: boolean;
}) {
  return (
    <UiCard className={`border-border shadow-none ${warn ? "border-warning/50" : ""}`}>
      <CardContent className="flex h-full flex-col gap-2 p-5">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <p
          className={`font-mono text-3xl font-semibold tracking-tight tabular-nums ${warn ? "text-warning-foreground" : "text-foreground"}`}
          data-kpi={name}
        >
          {href ? (
            <Link
              to={href}
              className="rounded-sm text-inherit no-underline outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {value}
            </Link>
          ) : (
            value
          )}
        </p>
      </CardContent>
    </UiCard>
  );
}

export function Resumen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) {
    return <p className="rounded-xl border border-border bg-card p-4">{error}</p>;
  }
  if (!summary) return <ResumenSkeleton />;

  const colaMissing = Boolean(summary.colaError) || summary.colaVencida === null;
  const vencidos = colaMissing ? "—" : String(summary.colaVencida);
  const late = !colaMissing && (summary.colaVencida ?? 0) > 0;

  return (
    <>
      <PageHead
        title="Panel"
        lede={colaMissing ? `${summary.abiertos} abiertos` : `${summary.abiertos} abiertos · ${summary.colaVencida} vencidos`}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Indicadores">
        <Kpi
          label="Abiertos"
          value={String(summary.abiertos)}
          name="abiertos"
          href={casosHref({ estado: "abiertos" })}
        />
        <Kpi
          label="Vencidos"
          value={vencidos}
          name="vencidos"
          href={colaMissing ? undefined : casosHref({ plazo: "vencido" })}
          warn={late}
        />
        <Kpi
          label="Sin fecha de inicio"
          value={String(summary.sinFechaValida)}
          name="sin-fecha"
          href={casosHref({ estado: "abiertos", fecha: "invalida" })}
        />
        <Kpi label="Días promedio" value={promedioText(summary.dias.promedio)} name="promedio" />
      </div>
      {summary.total === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-card p-6">
          Todavía no hay casos importados. Ejecuta <code className="font-mono">npm run import</code>.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Entrados y cerrados">
            {summary.flujoPorMes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay meses con fecha válida.</p>
            ) : (
              <FlowChart rows={summary.flujoPorMes} />
            )}
          </Card>
          <Card title="Plazos de casos abiertos">
            <Plazos summary={summary} />
          </Card>
          <Card title="Abiertos por proveedor">
            <RankedList
              buckets={summary.abiertosPorArea}
              hrefFor={(key) => casosHref({ estado: "abiertos", area: key })}
            />
          </Card>
          <Card title="Temas abiertos">
            <RankedList
              buckets={summary.abiertosPorTema}
              hrefFor={(key) => casosHref({ estado: "abiertos", tema: key })}
            />
          </Card>
          {summary.cierrePorTipo.length > 0 ? (
            <div className="min-w-0 lg:col-span-2">
              <Card title="Tasa de cierre por tipo">
                <CloseTable rows={summary.cierrePorTipo} />
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
