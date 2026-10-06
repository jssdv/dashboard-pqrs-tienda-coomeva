export interface Option {
  value: string;
  label: string;
}

export const ALL_KEY = "__todos__";

export function withCurrent(options: Option[], value: string): Option[] {
  if (value === "" || options.some((option) => option.value === value)) return options;
  return [{ value, label: value }, ...options];
}

export function searchKey(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toUpperCase();
}

export const controlClass =
  "flex min-h-11 w-full items-center rounded-lg border border-input bg-card px-3 text-base text-foreground shadow-xs outline-none transition-[color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring/50 md:text-sm";

export const listClass =
  "max-h-[min(20rem,50dvh)] w-[var(--trigger-width)] min-w-44 overflow-auto rounded-lg border border-border bg-card p-1 text-sm shadow-md outline-none";

export const itemClass =
  "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md px-3 outline-none transition-colors duration-100 data-[focused]:bg-accent data-[hovered]:bg-accent data-[selected]:font-semibold md:min-h-9";

// Popovers are portaled to <body>, where a modal Radix Dialog/Sheet sets pointer-events: none.
export const popoverClass =
  "pointer-events-auto data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 duration-150";
