import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card as UiCard, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiError, getProviderTimeline, getSummary } from "./api";
import { Card, fieldClass } from "./Shell";
import { casosHref, percent, promedioText } from "./format";
import type {
  AgingBucket,
  CloseRate,
  CountBucket,
  DashboardSummary,
  MatrixRow,
  MonthFlow,
  TimelinePoint,
} from "./types";

const PRIMARY = "#00843D";
const AMBER = "#D97706";
const GRID = "#e7e5e4";
const TOP = 8;

const AGING_LABEL: Record<AgingBucket["key"], string> = {
  "0-5": "0 a 5 días hábiles",
  "6-10": "6 a 10 días hábiles",
  "mas-10": "Más de 10 días hábiles",
};

function useMotion() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setOn(!media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return on;
}

function ChartTip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">{children}</div>
  );
}

function CloseTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CloseRate }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <ChartTip>
      <p className="font-semibold">{row.tipo}</p>
      <p className="font-mono tabular-nums">Entrados {row.entrados}</p>
      <p className="font-mono tabular-nums">Cerrados {row.cerrados}</p>
      <p className="font-mono tabular-nums">Tasa {percent(row.tasa)}</p>
    </ChartTip>
  );
}

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

function ProviderMatrix({ rows }: { rows: MatrixRow[] }) {
  const tipos = rows[0]?.celdas.map((cell) => cell.tipo) ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-sm">
        <caption className="sr-only">Casos por proveedor y tipo</caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="sticky left-0 bg-card py-2 pr-3 font-semibold">
              Proveedor
            </th>
            {tipos.map((tipo) => (
              <th key={tipo} scope="col" className="px-2 py-2 font-semibold">
                {tipo}
              </th>
            ))}
            <th scope="col" className="px-2 py-2 text-right font-semibold">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.area} className="border-b border-border hover:bg-muted/70">
              <th scope="row" className="sticky left-0 bg-card py-2 pr-3 text-left font-semibold break-words">
                <Link className="text-primary" to={casosHref({ area: row.area })}>
                  {row.area}
                </Link>
              </th>
              {row.celdas.map((cell) => (
                <td key={cell.tipo} className="px-2 py-1 font-mono tabular-nums">
                  {cell.total === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Link
                      className="flex min-h-11 items-center text-primary"
                      to={casosHref({ area: row.area, tipo: cell.tipo })}
                    >
                      {cell.abiertos > 0 ? `${cell.total} · ${cell.abiertos} abiertos` : String(cell.total)}
                    </Link>
                  )}
                </td>
              ))}
              <td className="px-2 py-2 text-right font-mono tabular-nums">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

function ProviderTimeline({ providers }: { providers: string[] }) {
  const motion = useMotion();
  const [provider, setProvider] = useState(providers[0] ?? "");
  const [points, setPoints] = useState<TimelinePoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider) return;
    let cancelled = false;
    setPoints(null);
    setError(null);
    getProviderTimeline(provider).then(
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
  }, [provider]);

  return (
    <div className="grid gap-3">
      <div className="grid max-w-sm gap-1.5">
        <Label htmlFor="linea-proveedor">Proveedor</Label>
        <select
          id="linea-proveedor"
          className={fieldClass}
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
        >
          {providers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm">{error}</p> : null}
      {!error && points === null ? <Skeleton className="h-60 w-full" /> : null}
      {points !== null && points.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este proveedor no tiene meses con fecha válida.</p>
      ) : null}
      {points !== null && points.length > 0 ? (
        <div className="h-60 w-full min-w-0">
          <p className="sr-only">
            Línea de tiempo de {provider}.{" "}
            {points.map((row) => `${row.mes}: ${row.entrados} entrados, ${row.cerrados} cerrados`).join(". ")}
          </p>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="mes" minTickGap={28} tick={{ fontSize: 12, fill: "#3f3f46" }} />
              <YAxis yAxisId="casos" width={32} allowDecimals={false} tick={{ fontSize: 12, fill: "#3f3f46" }} />
              <YAxis
                yAxisId="dias"
                orientation="right"
                width={32}
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#3f3f46" }}
              />
              <ChartTooltip content={<TimelineTooltip />} />
              <Bar yAxisId="casos" dataKey="entrados" name="Entrados" fill={PRIMARY} isAnimationActive={motion} animationDuration={240} />
              <Bar yAxisId="casos" dataKey="cerrados" name="Cerrados" fill={AMBER} isAnimationActive={motion} animationDuration={240} />
              <Line
                yAxisId="dias"
                type="monotone"
                dataKey="diasPromedio"
                name="Días promedio"
                stroke="#3f3f46"
                strokeWidth={2}
                connectNulls={false}
                isAnimationActive={motion}
                animationDuration={240}
              />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

function CloseChart({ rows }: { rows: CloseRate[] }) {
  const navigate = useNavigate();
  const motion = useMotion();
  return (
    <div className="h-60 w-full min-w-0">
      <p className="sr-only">
        Tasa de cierre por tipo.{" "}
        {rows.map((row) => `${row.tipo}: ${percent(row.tasa)}`).join(". ")}
      </p>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="tipo" tick={{ fontSize: 12, fill: "#3f3f46" }} interval={0} />
          <YAxis
            domain={[0, 1]}
            width={48}
            tickFormatter={(value) => percent(Number(value))}
            tick={{ fontSize: 12, fill: "#3f3f46" }}
          />
          <ChartTooltip content={<CloseTooltip />} />
          <Bar
            dataKey="tasa"
            fill={PRIMARY}
            radius={[6, 6, 0, 0]}
            cursor="pointer"
            isAnimationActive={motion}
            animationDuration={240}
            onClick={(bar) => {
              const tipo = bar.payload?.tipo as string | undefined;
              if (tipo) navigate(casosHref({ tipo }));
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FlowChart({ rows }: { rows: MonthFlow[] }) {
  const navigate = useNavigate();
  const motion = useMotion();
  return (
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
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.2} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="mes" minTickGap={28} tick={{ fontSize: 12, fill: "#3f3f46" }} />
          <YAxis width={32} allowDecimals={false} tick={{ fontSize: 12, fill: "#3f3f46" }} />
          <ChartTooltip content={<FlowTooltip />} />
          <Area
            type="monotone"
            dataKey="entrados"
            stroke={PRIMARY}
            strokeWidth={2}
            fill="url(#entrados-fill)"
            isAnimationActive={motion}
            animationDuration={240}
          />
          <Line
            type="monotone"
            dataKey="cerrados"
            stroke={AMBER}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={motion}
            animationDuration={240}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Meter({ value, max }: { value: number; max: number }) {
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full w-full origin-left bg-primary"
        style={{ transform: `scaleX(${max === 0 ? 0 : value / max})` }}
      />
    </div>
  );
}

function RankedList({
  buckets,
  hrefFor,
}: {
  buckets: CountBucket[];
  hrefFor: (key: string) => string;
}) {
  const shown = buckets.slice(0, TOP);
  const max = Math.max(1, ...shown.map((bucket) => bucket.count));
  if (shown.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay casos abiertos.</p>;
  }
  return (
    <>
      <ul className="grid gap-3">
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

function AgingList({ buckets }: { buckets: AgingBucket[] | null }) {
  if (!buckets) {
    return <p className="text-sm text-muted-foreground">Sin festivos</p>;
  }
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return (
    <ul className="grid gap-3">
      {buckets.map((bucket) => {
        const label = AGING_LABEL[bucket.key];
        const late = bucket.key === "mas-10";
        return (
          <li key={bucket.key}>
            <div className="flex items-baseline justify-between gap-3">
              {late ? (
                <Link
                  to={casosHref({ cola: "vencida" })}
                  className="inline-flex min-h-11 items-center font-medium text-foreground no-underline"
                >
                  {label}
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground">
                  {label}
                </span>
              )}
              <span className="font-mono text-sm tabular-nums">{bucket.count}</span>
            </div>
            <Meter value={bucket.count} max={max} />
          </li>
        );
      })}
    </ul>
  );
}

function ResumenSkeleton() {
  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Tienda Coomeva</p>
        <h1 className="mt-1 font-display text-[1.75rem] leading-tight font-semibold tracking-tight">Resumen</h1>
      </header>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-busy="true">
        <p className="sr-only">Cargando…</p>
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
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
  action,
}: {
  label: ReactNode;
  value: string;
  name: string;
  href?: string;
  warn?: boolean;
  action?: ReactNode;
}) {
  const number = (
    <p
      className={`font-mono text-2xl tracking-tight font-semibold tabular-nums ${warn ? "text-warning-foreground" : "text-foreground"}`}
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
  );
  return (
    <UiCard
      className={`border-border shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/30 hover:shadow-md ${warn ? "border-warning/40" : ""}`}
    >
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        {number}
        {action ? <div className="mt-auto">{action}</div> : null}
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
  const cola = colaMissing ? "Sin festivos" : String(summary.colaVencida);
  const colaLate = !colaMissing && (summary.colaVencida ?? 0) > 0;

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Tienda Coomeva</p>
        <h1 className="mt-1 font-display text-[1.75rem] leading-tight font-semibold tracking-tight">Resumen</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Qué lleva más de 10 días hábiles, qué área concentra lo abierto y si el mes cierra lo que entra.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Indicadores">
        <Kpi label="Total" value={String(summary.total)} name="total" href="/casos" />
        <Kpi
          label="Abiertos"
          value={String(summary.abiertos)}
          name="abiertos"
          href={casosHref({ estado: "abiertos" })}
        />
        <Kpi
          label="Cerrados"
          value={String(summary.cerrados)}
          name="cerrados"
          href={casosHref({ estado: "cerrados" })}
        />
        <Kpi label="Días promedio" value={promedioText(summary.dias.promedio)} name="promedio" />
        <Kpi
          label={
            <Tooltip>
              <TooltipTrigger className="cursor-help border-0 bg-transparent p-0 text-left text-sm font-medium text-muted-foreground">
                Más de 10 días
              </TooltipTrigger>
              <TooltipContent>Cola con más de 10 días hábiles</TooltipContent>
            </Tooltip>
          }
          value={cola}
          name="cola"
          href={colaMissing ? undefined : "/casos?cola=vencida"}
          warn={colaLate}
          action={
            colaLate ? (
              <Button asChild className="min-h-11">
                <Link to="/casos?cola=vencida">Ver cola</Link>
              </Button>
            ) : null
          }
        />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Fechas inválidas: {summary.fechasInvalidas}</p>
      {summary.total === 0 ? (
        <p className="mt-4 rounded-xl border border-border bg-card p-6 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
          Todavía no hay casos importados. Ejecuta <code className="font-mono">npm run import</code>.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card title="Entrados y cerrados">
            {summary.flujoPorMes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay meses con fecha válida.</p>
            ) : (
              <>
                <FlowChart rows={summary.flujoPorMes} />
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
                <div className="mt-4 max-h-56 overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">Entrados y cerrados por mes</caption>
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border text-left">
                        <th className="py-2 font-semibold">Mes</th>
                        <th className="py-2 font-semibold">Entrados</th>
                        <th className="py-2 text-right font-semibold">Cerrados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.flujoPorMes.map((row) => (
                        <tr key={row.mes} className="border-b border-border">
                          <td className="py-2">
                            <Link className="font-semibold text-primary" to={casosHref({ mes: row.mes })}>
                              {row.mes}
                            </Link>
                          </td>
                          <td className="py-2 font-mono tabular-nums">{row.entrados}</td>
                          <td className="py-2 text-right font-mono tabular-nums">{row.cerrados}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
          <Card title="Antigüedad de abiertos">
            <AgingList buckets={summary.antiguedad} />
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
          {summary.porArea.length > 0 ? (
            <div className="lg:col-span-2">
              <Card title="Línea de tiempo por proveedor">
                <ProviderTimeline providers={summary.porArea.map((bucket) => bucket.key)} />
              </Card>
            </div>
          ) : null}
          {summary.matrizProveedorTipo.length > 0 ? (
            <div className="lg:col-span-2">
              <Card title="Proveedor por tipo">
                <ProviderMatrix rows={summary.matrizProveedorTipo} />
              </Card>
            </div>
          ) : null}
          {summary.cierrePorTipo.length > 0 ? (
            <div className="lg:col-span-2">
              <Card title="Cierre por tipo">
                <CloseChart rows={summary.cierrePorTipo} />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <caption className="mb-2 text-left font-semibold">Cierre por tipo</caption>
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2 font-semibold">Tipo</th>
                        <th className="py-2 font-semibold">Entrados</th>
                        <th className="py-2 font-semibold">Cerrados</th>
                        <th className="py-2 text-right font-semibold">Tasa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.cierrePorTipo.map((row) => (
                        <tr key={row.tipo} className="border-b border-border hover:bg-muted/70">
                          <td className="py-2 break-words">
                            <Link className="font-semibold text-primary" to={casosHref({ tipo: row.tipo })}>
                              {row.tipo}
                            </Link>
                          </td>
                          <td className="py-2 font-mono tabular-nums">{row.entrados}</td>
                          <td className="py-2 font-mono tabular-nums">{row.cerrados}</td>
                          <td className="py-2 text-right font-mono tabular-nums">{percent(row.tasa)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
