import { Link } from "react-router-dom";

export interface Segment {
  key: string;
  label: string;
  count: number;
  href?: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

const BG = {
  ok: "bg-primary",
  warn: "bg-warning",
  danger: "bg-destructive",
  muted: "bg-muted-foreground/40",
} as const;

export function SegmentedBar({ segments }: { segments: Segment[] }) {
  const shown = segments.filter((segment) => segment.count > 0);
  const summary = shown.map((segment) => `${segment.label} ${segment.count}`).join(", ");
  return (
    <div className="grid gap-4">
      <div
        role="img"
        aria-label={summary || "Sin casos"}
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {shown.map((segment, index) => (
          <div
            key={segment.key}
            data-segment={segment.key}
            style={{ flexGrow: segment.count, flexBasis: 0, "--i": index } as React.CSSProperties}
            className={`${BG[segment.tone]} grow-x min-w-1 first:rounded-l-full last:rounded-r-full`}
          />
        ))}
      </div>
      <ul className="m-0 grid list-none gap-1 p-0">
        {segments.map((segment) => {
          const row = (
            <>
              <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${BG[segment.tone]}`} />
              <span className="min-w-0 flex-1 truncate">{segment.label}</span>
              <span className="font-mono tabular-nums">{segment.count}</span>
            </>
          );
          return (
            <li key={segment.key}>
              {segment.href ? (
                <Link to={segment.href} className="flex min-h-11 items-center gap-2 text-sm text-foreground no-underline hover:text-primary">
                  {row}
                </Link>
              ) : (
                <div className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
