import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getCases } from "./api";
import { CaseDetail } from "./CaseDetail";
import { plazoLabel, textOrDash } from "./format";
import { matchesSearch } from "./matchesSearch";
import { fieldClass, PageHead } from "./Shell";
import type { CaseQuery, PqrCase } from "./types";

const PAGE_SIZE = 20;

function useMinWidth(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window.matchMedia !== "function") return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const apply = () => setMatches(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [query]);
  return matches;
}

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

function optionValues(values: (string | null)[], selected?: string): string[] {
  const set = new Set(values.filter((value): value is string => Boolean(value)));
  if (selected) set.add(selected);
  return [...set].sort((left, right) => left.localeCompare(right, "es"));
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
  if (params.get("fecha") === "invalida") chips.push({ key: "fecha", text: "Sin fecha válida" });
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
  const filtersActive = Boolean(estado || query.plazo || chips.length > 0 || q.trim());

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
      <PageHead title="Casos" />
      <div className="mb-3 flex min-w-0 flex-wrap items-end gap-3">
        <div className="grid min-w-[12rem] flex-1 gap-1.5">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            placeholder="Orden, asociado o correo"
            value={q}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-estado">Estado</Label>
          <select
            id="filtro-estado"
            className={`${fieldClass} w-auto min-w-32`}
            value={estado === "abiertos" || estado === "cerrados" ? estado : ""}
            onChange={(event) => setFilter("estado", event.target.value)}
          >
            <option value="">Todos</option>
            <option value="abiertos">Abiertos</option>
            <option value="cerrados">Cerrados</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-plazo">Plazo</Label>
          <select
            id="filtro-plazo"
            className={`${fieldClass} w-auto min-w-32`}
            value={query.plazo ?? ""}
            onChange={(event) => setFilter("plazo", event.target.value)}
          >
            <option value="">Todos</option>
            <option value="en-plazo">En plazo</option>
            <option value="por-vencer">Por vencer</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>
        <Button asChild variant="secondary" className="min-h-11 md:hidden">
          <Link to="/casos/nuevo">Nuevo caso</Link>
        </Button>
      </div>
      <details className="mb-3">
        <summary className="flex min-h-11 w-fit cursor-pointer items-center font-semibold text-primary">
          Más filtros
        </summary>
        <div className="mt-1 flex flex-wrap gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="filtro-area">Proveedor</Label>
            <select
              id="filtro-area"
              className={`${fieldClass} w-auto min-w-36`}
              value={query.area ?? ""}
              onChange={(event) => setFilter("area", event.target.value)}
            >
              <option value="">Todos</option>
              {optionValues(
                cases.map((row) => row.area),
                query.area,
              ).map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filtro-tipo">Tipo</Label>
            <select
              id="filtro-tipo"
              className={`${fieldClass} w-auto min-w-36`}
              value={query.tipo ?? ""}
              onChange={(event) => setFilter("tipo", event.target.value)}
            >
              <option value="">Todos</option>
              {optionValues(
                cases.map((row) => row.tipo),
                query.tipo,
              ).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filtro-tema">Tema</Label>
            <select
              id="filtro-tema"
              className={`${fieldClass} w-auto min-w-36`}
              value={tema}
              onChange={(event) => setFilter("tema", event.target.value)}
            >
              <option value="">Todos</option>
              {optionValues(
                cases.map((row) => row.tema),
                tema,
              ).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>
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
      Ver
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
    <div className="min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
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
              <td className="px-3 py-2 font-mono tabular-nums">{textOrDash(row.fechaInicial)}</td>
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
