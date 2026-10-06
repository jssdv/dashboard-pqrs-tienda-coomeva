import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, getCases } from "./api";
import { CaseDetail } from "./CaseDetail";
import { CaseFilters } from "./CaseFilters";
import { plazoLabel, textOrDash } from "./format";
import { matchesSearch } from "./matchesSearch";
import type { Option } from "./ui/options";
import { useMinWidth } from "./useMinWidth";
import { PageHead } from "./Shell";
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
  if (params.get("cola") === "vencida") chips.push({ key: "cola", text: "Más de 10 días hábiles" });
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
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  }, [query.cola, query.area, query.tipo, query.mes, query.plazo, query.fecha]);

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
  const selected = cases.find((row) => row.id === selectedId) ?? null;

  return (
    <>
      <PageHead
        title="Casos"
        lede={status === "ready" ? `${visible.length} ${visible.length === 1 ? "caso" : "casos"}` : undefined}
      />
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
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-card pr-1 pl-3 text-sm"
            >
              {chip.text}
              <button
                type="button"
                aria-label={`Quitar filtro ${chip.text}`}
                className="grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted"
                onClick={() => setFilter(chip.key, "")}
              >
                <span aria-hidden="true">×</span>
              </button>
            </span>
          ))}
          <Button asChild variant="ghost" className="min-h-11">
            <Link to="/casos">Quitar filtros</Link>
          </Button>
        </div>
      ) : null}
      {status === "loading" ? (
        <p className="text-muted-foreground" aria-busy="true">
          Cargando…
        </p>
      ) : null}
      {status === "error" ? (
        <p className="rounded-xl border border-border bg-card p-4">{message}</p>
      ) : null}
      {status === "ready" && visible.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4">No hay casos con ese filtro.</p>
      ) : null}
      {status === "ready" && visible.length > 0 ? (
        <>
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
        </>
      ) : null}
      <CaseDetail caso={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}

function PlazoCell({ row }: { row: PqrCase }) {
  if (!isOpen(row)) {
    return <span className="font-mono tabular-nums">{row.diasSolucion === null ? "Cerrado" : `${row.diasSolucion} días`}</span>;
  }
  const plazo = plazoLabel(row.riesgo);
  if (plazo) return <Badge variant={plazo.variant}>{plazo.text}</Badge>;
  return <span className="text-muted-foreground">Sin fecha válida</span>;
}

function OpenButton({ row, onOpen }: { row: PqrCase; onOpen: (id: string) => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-11"
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
      {rows.map((row) => (
        <li key={row.id} className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 break-words font-semibold">{textOrDash(row.area)}</p>
              <p className="m-0 mt-1 break-words text-sm text-muted-foreground">
                {textOrDash(row.tipo)} · {textOrDash(row.tema)}
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
    <div className="max-h-[calc(100dvh-18rem)] min-w-0 overflow-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">Casos</caption>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border text-left">
            <th className="px-3 py-2 font-semibold">Fecha</th>
            <th className="px-3 py-2 font-semibold">Proveedor</th>
            <th className="px-3 py-2 font-semibold">Tipo</th>
            <th className="px-3 py-2 font-semibold">Tema</th>
            <th className="px-3 py-2 font-semibold">Plazo</th>
            <th className="px-3 py-2">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-border hover:bg-muted/70"
              onClick={() => onOpen(row.id)}
            >
              <td className="px-3 py-2 font-mono whitespace-nowrap tabular-nums">{textOrDash(row.fechaInicial)}</td>
              <td className="px-3 py-2 break-words">{textOrDash(row.area)}</td>
              <td className="px-3 py-2 break-words">{textOrDash(row.tipo)}</td>
              <td className="px-3 py-2 break-words">{textOrDash(row.tema)}</td>
              <td className="px-3 py-2">
                <PlazoCell row={row} />
              </td>
              <td className="px-3 py-1 text-right">
                <OpenButton row={row} onOpen={onOpen} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
