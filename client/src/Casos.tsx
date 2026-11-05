import { useEffect, useState } from "react";
import { Link, Outlet, useMatch, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mark } from "./ui/Mark";
import { ApiError, exportCases, getCases } from "./api";
import { CaseDetail } from "./CaseDetail";
import { useLive } from "./useLive";
import { CaseFilters } from "./CaseFilters";
import { plazoLabel, textOrDash } from "./format";
import { matchesSearch } from "./matchesSearch";
import type { Option } from "./ui/options";
import { useMinWidth } from "./useMinWidth";
import { PageHead } from "./Shell";
import { Skeleton } from "@/components/ui/skeleton";
import { PlazoBar } from "./ui/PlazoBar";
import { TipoTag } from "./ui/TipoTag";
import type { CaseQuery, PqrCase } from "./types";

const PAGE_SIZE = 20;

function queryFrom(params: URLSearchParams): CaseQuery {
  return {
    cola: params.get("cola") ?? undefined,
    area: params.get("area") ?? undefined,
    tipo: params.get("tipo") ?? undefined,
    mes: params.get("mes") ?? undefined,
    plazo: params.get("plazo") ?? undefined,
    fecha: params.get("fecha") ?? undefined,
  };
}

function pageFrom(params: URLSearchParams): number {
  const raw = Number(params.get("pagina"));
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
}

function isOpen(row: PqrCase): boolean {
  return row.fechaSolucion === null || row.fechaSolucion === "";
}

function toOptions(values: (string | null)[]): Option[] {
  const set = new Set(values.filter((value): value is string => Boolean(value)));
  return [...set]
    .sort((left, right) => left.localeCompare(right, "es"))
    .map((value) => ({ value, label: value }));
}


const CHIP_KEYS = [
  ["area", "Proveedor"],
  ["tipo", "Tipo"],
  ["tema", "Tema"],
  ["mes", "Mes"],
] as const;

function chipsFrom(params: URLSearchParams): Array<{ key: string; text: string }> {
  const chips: Array<{ key: string; text: string }> = [];
  for (const [key, label] of CHIP_KEYS) {
    const value = params.get(key);
    if (value) chips.push({ key, text: `${label} ${value}` });
  }
  if (params.get("cola") === "vencida") chips.push({ key: "cola", text: "Fuera de plazo" });
  if (params.get("fecha") === "invalida") chips.push({ key: "fecha", text: "Sin fecha de inicio" });
  return chips;
}

export function Casos() {
  const [params, setParams] = useSearchParams();
  const wide = useMinWidth("(min-width: 768px)");
  const query = queryFrom(params);
  const estado = params.get("estado") ?? "";
  const tema = params.get("tema") ?? "";
  const q = params.get("q") ?? "";
  const [cases, setCases] = useState<PqrCase[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useLive(() => setReloadKey((key) => key + 1));
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const atList = useMatch("/casos") !== null;

  useEffect(() => {
    if (!atList) setSelectedId(null);
  }, [atList]);
  const chips = chipsFrom(params);
  const activeCount = [estado, query.plazo, query.area, query.tipo, tema, query.cola, query.mes, query.fecha].filter(
    Boolean,
  ).length;
  const filtersActive = Boolean(activeCount > 0 || q.trim());

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getCases(query).then(
      (rows) => {
        if (cancelled) return;
        setCases(rows);
        setMessage(null);
        setLoaded(true);
        setStatus("ready");
      },
      (reason: unknown) => {
        if (cancelled) return;
        setCases([]);
        setMessage(reason instanceof ApiError ? reason.message : "No se pudieron cargar los casos");
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [query.cola, query.area, query.tipo, query.mes, query.plazo, query.fecha, reloadKey]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("pagina");
    setParams(next);
  }

  function setQuery(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    next.delete("pagina");
    setParams(next, { replace: true });
  }

  function setPage(page: number) {
    const next = new URLSearchParams(params);
    if (page <= 1) next.delete("pagina");
    else next.set("pagina", String(page));
    setParams(next);
  }

  const byEstado =
    estado === "abiertos"
      ? cases.filter(isOpen)
      : estado === "cerrados"
        ? cases.filter((row) => !isOpen(row))
        : cases;
  const byTema = tema ? byEstado.filter((row) => (row.tema ?? "(sin valor)") === tema) : byEstado;
  const visible = byTema.filter((row) => matchesSearch(row, q));
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = Math.min(pageFrom(params), pageCount);
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageRows = visible.slice(startIndex, startIndex + PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = startIndex + pageRows.length;
  async function onExport() {
    setExporting(true);
    setExportError(null);
    try {
      await exportCases(params);
    } catch (reason) {
      setExportError(reason instanceof Error ? reason.message : "No se pudo exportar");
    } finally {
      setExporting(false);
    }
  }

  const selected = cases.find((row) => row.id === selectedId) ?? null;

  return (
    <>
      <PageHead
        section="Casos"
        title="Casos"
        lede={loaded ? `${visible.length} ${visible.length === 1 ? "caso" : "casos"}` : undefined}
        actions={
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2"
            disabled={!loaded || visible.length === 0 || exporting}
            onClick={onExport}
          >
            {exporting ? "Exportando…" : "Exportar Excel"}
          </Button>
        }
      />
      {exportError ? (
        <p role="alert" className="mb-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm">
          {exportError}
        </p>
      ) : null}
      <CaseFilters
        q={q}
        onSearch={setQuery}
        values={{ estado: estado === "abiertos" || estado === "cerrados" ? estado : "", plazo: query.plazo ?? "", area: query.area ?? "", tipo: query.tipo ?? "", tema }}
        options={{
          areas: toOptions(cases.map((row) => row.area)),
          tipos: toOptions(cases.map((row) => row.tipo)),
          temas: toOptions(cases.map((row) => row.tema)),
        }}
        onChange={setFilter}
        activeCount={activeCount}
      />
      {chips.length > 0 || filtersActive ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="fade-up inline-flex min-h-8 items-center gap-1 border border-border bg-card pr-1 pl-3 text-sm"
            >
              {chip.text}
              <button
                type="button"
                aria-label={`Quitar filtro ${chip.text}`}
                className="grid size-8 cursor-pointer place-items-center text-muted-foreground hover:bg-muted"
                onClick={() => setFilter(chip.key, "")}
              >
                <Mark name="cross" className="size-3" />
              </button>
            </span>
          ))}
          <Button asChild variant="ghost" className="min-h-11">
            <Link to="/casos">Quitar filtros</Link>
          </Button>
        </div>
      ) : null}
      {status === "loading" && !loaded ? (
        <div role="status" aria-busy="true" className="grid gap-2">
          <span className="sr-only">Cargando…</span>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      ) : null}
      {status === "error" ? (
        <p className="border border-border bg-card p-4">{message}</p>
      ) : null}
      {loaded && status !== "error" && visible.length === 0 ? (
        <p className="border border-border bg-card p-4">No hay casos con ese filtro.</p>
      ) : null}
      {loaded && status !== "error" && visible.length > 0 ? (
        <div aria-busy={status === "loading"} className={status === "loading" ? "is-reloading" : "is-reloading-done"}>
          {wide ? (
            <CaseTable rows={pageRows} onOpen={setSelectedId} />
          ) : (
            <CaseCards rows={pageRows} onOpen={setSelectedId} />
          )}
          <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center gap-3">
            <p className="m-0 min-h-11 font-mono leading-[2.75rem] tabular-nums">
              {rangeStart}–{rangeEnd} de {visible.length}
            </p>
            <Button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </nav>
        </div>
      ) : null}
      <CaseDetail
        caso={selected}
        onClose={() => setSelectedId(null)}
        onChanged={() => setReloadKey((key) => key + 1)}
      />
      <Outlet context={{ reload: () => setReloadKey((key) => key + 1) }} />
    </>
  );
}

function PlazoCell({ row }: { row: PqrCase }) {
  if (!isOpen(row)) {
    return (
      <span className="font-mono text-sm tabular-nums">
        {row.diasSolucion === null ? "Cerrado" : `${row.diasSolucion} días`}
      </span>
    );
  }
  const plazo = plazoLabel(row.riesgo);
  if (!plazo || !row.riesgo) return <span className="text-sm text-muted-foreground">Sin fecha de inicio</span>;
  const TEXT = { secondary: "text-muted-foreground", warning: "text-warning-foreground", destructive: "text-destructive" } as const;
  return (
    <div className="grid min-w-28 gap-1">
      <PlazoBar
        dias={row.riesgo.diasAbiertos}
        estado={row.riesgo.estado}
        plazo={row.riesgo.diasAbiertos + row.riesgo.diasParaVencer}
      />
      <span className={`text-xs font-medium ${TEXT[plazo.variant]}`}>{plazo.text}</span>
    </div>
  );
}

function OpenButton({ row, onOpen }: { row: PqrCase; onOpen: (id: string) => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-11 px-2"
      aria-label="Ver detalle"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(row.id);
      }}
    >
      Abrir
    </Button>
  );
}

function CaseCards({ rows, onOpen }: { rows: PqrCase[]; onOpen: (id: string) => void }) {
  return (
    <ul className="grid list-none gap-3 p-0">
      {rows.map((row, index) => (
        <li
          key={row.id}
          style={{ "--i": index } as React.CSSProperties}
          className="fade-up min-w-0 border border-border bg-card p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 break-words font-semibold">{textOrDash(row.area)}</p>
              <p className="m-0 mt-1 break-words text-sm text-muted-foreground">
                <TipoTag tipo={row.tipo} /> · {textOrDash(row.tema)}
              </p>
            </div>
            <span className="shrink-0 font-mono text-sm tabular-nums">{textOrDash(row.fechaInicial)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <PlazoCell row={row} />
            <OpenButton row={row} onOpen={onOpen} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CaseTable({ rows, onOpen }: { rows: PqrCase[]; onOpen: (id: string) => void }) {
  return (
    <div className="max-h-[calc(100dvh-18rem)] min-w-0 overflow-auto border border-border bg-card">
      <table className="w-full min-w-0 border-collapse text-sm">
        <caption className="sr-only">Casos</caption>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border text-left font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
            <th className="px-2 py-2 font-medium lg:px-3">Fecha</th>
            <th className="px-2 py-2 font-medium lg:px-3">Proveedor</th>
            <th className="px-2 py-2 font-medium lg:px-3">Tipo</th>
            <th className="px-2 py-2 font-medium lg:px-3">Tema</th>
            <th className="px-2 py-2 font-medium lg:px-3">Plazo</th>
            <th className="px-2 py-2 lg:px-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              style={{ "--i": index } as React.CSSProperties}
              className="fade-up cursor-pointer border-b border-border hover:bg-muted/70"
              onClick={() => onOpen(row.id)}
            >
              <td className="px-2 py-2 lg:px-3 font-mono whitespace-nowrap tabular-nums">{textOrDash(row.fechaInicial)}</td>
              <td className="px-2 py-2 lg:px-3 break-words">{textOrDash(row.area)}</td>
              <td className="px-2 py-2 lg:px-3 break-words">
                <TipoTag tipo={row.tipo} />
              </td>
              <td className="px-2 py-2 lg:px-3 break-words">{textOrDash(row.tema)}</td>
              <td className="px-2 py-2 lg:px-3">
                <PlazoCell row={row} />
              </td>
              <td className="px-1 py-1 text-right">
                <OpenButton row={row} onOpen={onOpen} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
