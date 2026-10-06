import { useRef, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";

const WIDTH = {
  lg: "w-[min(58rem,calc(100vw-2rem))]",
  md: "w-[min(40rem,calc(100vw-2rem))]",
} as const;

export function FormDialog({
  title,
  description,
  width = "lg",
  submitLabel,
  pending,
  disabled,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  description?: string;
  width?: "md" | "lg";
  submitLabel: string;
  pending: boolean;
  disabled?: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const hint = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          ref={content}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const target =
              content.current?.querySelector<HTMLElement>("[data-autofocus]") ??
              content.current?.querySelector<HTMLElement>("form input, form textarea");
            target?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              form.current?.requestSubmit();
            }
          }}
          className={`fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] ${WIDTH[width]} -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 max-sm:top-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:translate-y-0 max-sm:rounded-none`}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-lg font-semibold tracking-tight">{title}</Dialog.Title>
              {description ? <p className="m-0 mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <Dialog.Close
              aria-label="Cerrar ventana"
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </header>
          <form ref={form} onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-3">
              <p className="m-0 hidden text-xs text-muted-foreground sm:block">
                <kbd className="rounded border border-border px-1.5 font-mono">{hint}</kbd> +{" "}
                <kbd className="rounded border border-border px-1.5 font-mono">Enter</kbd> para guardar
              </p>
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" variant="ghost" className="min-h-11" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="min-h-11" disabled={pending || disabled}>
                  {pending ? "Guardando…" : submitLabel}
                </Button>
              </div>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
