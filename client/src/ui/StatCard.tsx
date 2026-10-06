import { ArrowDown, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Card as UiCard, CardContent } from "@/components/ui/card";
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
}: {
  label: string;
  value: string;
  caption?: string;
  delta?: Delta;
  series?: Array<number | null>;
  seriesLabel?: string;
  kind?: "line" | "bar";
  href?: string;
}) {
  const t = delta ? tone(delta) : "neutral";
  return (
    <UiCard data-stat className="min-w-0 border-border shadow-none">
      <CardContent className="flex h-full flex-col gap-2 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
          {caption ? <span className="font-mono text-xs text-muted-foreground">{caption}</span> : null}
        </div>
        <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
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
        {delta ? (
          <p data-tone={t} className={`flex items-center gap-1 text-xs font-medium ${TONE_CLASS[t]}`}>
            {delta.pct === null ? (
              <span>— vs mes anterior</span>
            ) : (
              <>
                {delta.pct >= 0 ? <ArrowUp aria-hidden="true" className="size-3" /> : <ArrowDown aria-hidden="true" className="size-3" />}
                <span className="sr-only">{delta.pct >= 0 ? "sube " : "baja "}</span>
                <span>{Math.round(Math.abs(delta.pct))} % vs mes anterior</span>
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
