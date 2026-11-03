import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Dialog } from "radix-ui";
import { useNavigate } from "react-router-dom";
import { getCases } from "./api";
import { matchesSearch } from "./matchesSearch";
import { useTheme, type ThemeMode } from "./theme";
import { searchKey } from "./ui/options";
import type { PqrCase } from "./types";

interface Entry {
  id: string;
  group: "Ir a" | "Acciones" | "Casos";
  label: string;
  hint?: string;
  run: () => void;
}

const NEXT_THEME: Record<ThemeMode, ThemeMode> = { light: "dark", dark: "system", system: "light" };
const MAX_CASES = 8;

export function CommandPalette({
  open,
  onOpenChange,
  returnFocusTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo?: RefObject<HTMLElement | null>;
}) {
  const navigate = useNavigate();
  const { mode, setMode } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [cases, setCases] = useState<PqrCase[] | null>(null);
  const loading = useRef(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    if (cases !== null || loading.current) return;
    loading.current = true;
    getCases({}).then(
      (rows) => setCases(rows),
      () => setCases([]),
    );
  }, [open, cases]);

  const entries = useMemo(() => {
    const go = (to: string, viewTransition = true) => () => {
      onOpenChange(false);
      navigate(to, { viewTransition });
    };
    const base: Entry[] = [
      { id: "go-panel", group: "Ir a", label: "Panel", run: go("/") },
      { id: "go-casos", group: "Ir a", label: "Casos", run: go("/casos") },
      { id: "go-proveedores", group: "Ir a", label: "Proveedores", run: go("/proveedores") },
      { id: "act-nuevo", group: "Acciones", label: "Nuevo caso", run: go("/casos/nuevo", false) },
      {
        id: "act-tema",
        group: "Acciones",
        label: "Cambiar tema",
        run: () => {
          setMode(NEXT_THEME[mode]);
          onOpenChange(false);
        },
      },
    ];
    const needle = searchKey(query);
    const commands = needle ? base.filter((entry) => searchKey(entry.label).includes(needle)) : base;
    const found: Entry[] =
      needle.length >= 2 && cases
        ? cases
            .filter((row) => matchesSearch(row, query))
            .slice(0, MAX_CASES)
            .map((row) => {
              const term = row.idOrden ?? row.correo ?? row.asociado ?? row.id;
              return {
                id: `caso-${row.id}`,
                group: "Casos" as const,
                label: [row.idOrden, row.asociado, row.area].filter(Boolean).join(" · ") || row.id,
                hint: row.fechaInicial ?? undefined,
                run: go(`/casos?q=${encodeURIComponent(term)}`),
              };
            })
        : [];
    return [...commands, ...found];
  }, [query, cases, mode, navigate, onOpenChange, setMode]);

  useEffect(() => setActive(0), [query]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (entries.length === 0 ? 0 : (index + 1) % entries.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (entries.length === 0 ? 0 : (index - 1 + entries.length) % entries.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      entries[active]?.run();
    }
  }

  const groups = (["Ir a", "Acciones", "Casos"] as const)
    .map((group) => ({ group, items: entries.filter((entry) => entry.group === group) }))
    .filter((entry) => entry.items.length > 0);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusTo?.current?.focus();
          }}
          className="fixed top-[12dvh] left-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden border border-border bg-card shadow-2xl outline-none duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title className="sr-only">Buscar</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <input
              role="combobox"
              aria-label="Buscar"
              aria-expanded="true"
              aria-controls="paleta-lista"
              aria-activedescendant={entries[active] ? `paleta-${entries[active].id}` : undefined}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar pantallas, acciones o casos (orden, asociado, correo)"
              className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </div>
          <div id="paleta-lista" role="listbox" aria-label="Resultados" className="max-h-[50dvh] overflow-y-auto p-2">
            {entries.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
            ) : null}
            {groups.map(({ group, items }) => (
              <div key={group} role="group" aria-label={group} className="mb-1">
                <p aria-hidden="true" className="px-3 pt-2 pb-1 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
                  {group}
                </p>
                {items.map((entry) => {
                  const index = entries.indexOf(entry);
                  return (
                    <div
                      key={entry.id}
                      id={`paleta-${entry.id}`}
                      role="option"
                      aria-selected={index === active}
                      onMouseMove={() => setActive(index)}
                      onClick={entry.run}
                      className={`flex min-h-11 cursor-pointer items-center gap-3 border-l-2 px-3 text-sm transition-colors duration-100 ${
                        index === active ? "border-primary bg-accent text-accent-foreground" : "border-transparent"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                      {entry.hint ? <span className="font-mono text-xs text-muted-foreground">{entry.hint}</span> : null}
                      {index === active ? (
                        <span aria-hidden="true" className="font-mono text-xs text-muted-foreground">
                          ↵
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
