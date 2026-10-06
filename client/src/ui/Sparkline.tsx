export function Sparkline({
  values,
  label,
  kind = "line",
  className = "text-primary",
}: {
  values: Array<number | null>;
  label: string;
  kind?: "line" | "bar";
  className?: string;
}) {
  const width = 100;
  const height = 28;
  const numeric = values.filter((value): value is number => value !== null);
  const max = Math.max(1, ...numeric);
  const min = kind === "bar" ? 0 : Math.min(...numeric, max);
  const span = max - min || 1;
  const x = (index: number) => (values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width);
  const y = (value: number) => height - 2 - ((value - min) / span) * (height - 4);

  const segments: string[] = [];
  let current = "";
  values.forEach((value, index) => {
    if (value === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)} `;
  });
  if (current) segments.push(current);

  const barWidth = values.length === 0 ? 0 : (width / values.length) * 0.7;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`h-7 w-full overflow-visible ${className}`}
    >
      {kind === "bar"
        ? values.map((value, index) =>
            value === null ? null : (
              <rect
                key={index}
                x={(index / values.length) * width + (width / values.length - barWidth) / 2}
                y={y(value)}
                width={barWidth}
                height={Math.max(1, height - 2 - y(value))}
                fill="currentColor"
                opacity={index === values.length - 1 ? 1 : 0.45}
                className="fade-up"
                style={{ "--i": index } as React.CSSProperties}
              />
            ),
          )
        : (
            <g className="reveal-x">
              {segments.map((d, index) => (
                <path
                  key={index}
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          )}
      {kind === "line" && numeric.length === 1 ? (
        <circle cx={x(values.findIndex((value) => value !== null))} cy={y(numeric[0])} r={2} fill="currentColor" />
      ) : null}
    </svg>
  );
}
