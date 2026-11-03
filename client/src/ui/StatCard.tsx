import { Link } from "react-router-dom";
import { Card as UiCard, CardContent } from "@/components/ui/card";
import { CountUp } from "./CountUp";
import { Sparkline } from "./Sparkline";

export interface Delta {
  pct: number | null;
  good: "up" | "down" | "neutral";
}

function tone(delta: Delta): "good" | "bad" | "neutral" {
  if (delta.pct === null || delta.pct === 0 || delta.good === "neutral") return "neutral";
  const up = delta.pct > 0;
  return (delta.good === "up") === up ? "good" : "bad";
}

const TONE_CLASS = { good: "text-primary", bad: "text-destructive", neutral: "text-muted-foreground" } as const;

export function StatCard({
  label,
  value,
  caption,
  delta,
  series,
  seriesLabel,
  kind = "line",
  href,
  index = 0,
}: {
  label: string;
  value: string;
  caption?: string;
  delta?: Delta;
  series?: Array<number | null>;
  seriesLabel?: string;
  kind?: "line" | "bar";
  href?: string;
  index?: number;
}) {
  const t = delta ? tone(delta) : "neutral";
  return (
    <UiCard
      data-stat
      style={{ "--i": index } as React.CSSProperties}
      className="fade-up min-w-0 border-t-2 border-t-foreground shadow-none"
    >
      <CardContent className="flex h-full flex-col gap-2 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-mono text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">{label}</h3>
          {caption ? <span className="font-mono text-xs text-muted-foreground">{caption}</span> : null}
        </div>
        <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
          {href ? (
            <Link
              to={href}
              className="rounded-sm text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <CountUp value={value} />
            </Link>
          ) : (
            <CountUp value={value} />
          )}
        </p>
        {delta ? (
          <p data-tone={t} className={`flex items-center gap-1 text-xs font-medium ${TONE_CLASS[t]}`}>
            {delta.pct === null ? (
              <span>— vs mes anterior</span>
            ) : (
              <>
                <span className="sr-only">{delta.pct >= 0 ? "sube " : "baja "}</span>
                <span>
                  {delta.pct >= 0 ? "+" : "−"}
                  {Math.round(Math.abs(delta.pct))} % vs mes anterior
                </span>
              </>
            )}
          </p>
        ) : null}
        {series ? (
          <div className="mt-auto pt-1">
            <Sparkline values={series} label={seriesLabel ?? label} kind={kind} className={t === "bad" ? "text-destructive" : "text-primary"} />
          </div>
        ) : null}
      </CardContent>
    </UiCard>
  );
}
