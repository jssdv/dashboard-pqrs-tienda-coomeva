// Three marks drawn for this product: square caps, 1.5 px strokes, no library icon set.
const PATHS = {
  chevron: "M2 4.25 L6 8.25 L10 4.25",
  cross: "M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5",
  arrow: "M3 9 L9 3 M4 3 H9 V8",
} as const;

export function Mark({ name, className = "size-3" }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
