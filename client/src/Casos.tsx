import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getCases } from "./api";
import { filterLabel, plazoLabel, textOrDash } from "./format";
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

function daysLabel(row: PqrCase): string {
  return row.diasSolucion === null ? "Abierto" : `${row.diasSolucion} días`;
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
  const label = filterLabel(query);
  const filtersActive = Boolean(estado || tema || query.area || query.tipo || query.cola || query.mes || query.plazo || q.trim());

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
  }, [query.cola, query.area, query.tipo, query.mes, query.plazo]);

  function setFilter(key: "estado" | "area" | "tipo" | "tema" | "plazo", value: string) {
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

  return (
    <>
      <PageHead title="Casos" lede="Ficha de cada caso" />
      <div className="mb-4 flex min-w-0 flex-wrap items-end gap-3">
        <Button asChild variant="secondary" className="min-h-11">
          <Link to="/casos/nuevo">Nuevo caso</Link>
        </Button>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-estado">Estado</Label>
          <select
            id="filtro-estado"
            className={`${fieldClass} w-auto min-w-36`}
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
            className={`${fieldClass} w-auto min-w-36`}
            value={query.plazo ?? ""}
            onChange={(event) => setFilter("plazo", event.target.value)}
          >
            <option value="">Todos</option>
            <option value="en-plazo">En plazo</option>
            <option value="por-vencer">Por vencer</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>
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
        <div className="grid min-w-[12rem] flex-1 gap-1.5">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            placeholder="Orden, asociado o correo"
            value={q}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {label ? <p className="m-0 min-h-11 self-end leading-[2.75rem]">Filtro: {label}</p> : null}
        {tema ? <p className="m-0 min-h-11 self-end leading-[2.75rem]">Tema {tema}</p> : null}
        {filtersActive ? (
          <Button asChild variant="ghost" className="min-h-11">
            <Link to="/casos">Quitar filtros</Link>
          </Button>
        ) : null}
      </div>
      {status === "loading" ? (
        <p className="text-muted-foreground" aria-busy="true">
          Cargando…
        </p>
      ) : null}
      {status === "error" ? (
        <p className="rounded-xl border border-border bg-card p-4 shadow-sm">{message}</p>
      ) : null}
      {status === "ready" && visible.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 shadow-sm">No hay casos con ese filtro.</p>
      ) : null}
      {status === "ready" && visible.length > 0 ? (
        <>
          {wide ? <CaseTable rows={pageRows} /> : <CaseCards rows={pageRows} />}
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
    </>
  );
}

function PlazoBadge({ row }: { row: PqrCase }) {
  const plazo = plazoLabel(row.riesgo);
  if (!plazo) return <span aria-label="Sin plazo">—</span>;
  return <Badge variant={plazo.variant}>{plazo.text}</Badge>;
}

function StatusBadge({ row }: { row: PqrCase }) {
  const open = isOpen(row);
  return <Badge variant={open ? "warning" : "secondary"}>{open ? "Abierto" : "Cerrado"}</Badge>;
}

function CloseAction({ row }: { row: PqrCase }) {
  if (!isOpen(row)) return null;
  return (
    <Button asChild className="min-h-11">
      <Link to={`/casos/${encodeURIComponent(row.id)}/cerrar`}>Cerrar</Link>
    </Button>
  );
}

function CaseFacts({ row }: { row: PqrCase }) {
  return (
    <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Detail label="Fecha de solución" value={row.fechaSolucion} />
      <Detail label="ID de orden" value={row.idOrden} />
      <Detail label="Asociado" value={row.asociado} />
      <Detail label="Correo" value={row.correo} />
      <Detail label="Fuente" value={row.fuente} />
      <Detail label="Motivo" value={row.motivo} />
      <Detail label="Solución" value={row.solucion} />
    </dl>
  );
}

function CaseCards({ rows }: { rows: PqrCase[] }) {
  return (
    <ul className="grid list-none gap-3 p-0">
      {rows.map((row) => (
        <li
          key={row.id}
          className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]"
        >
          <div className="grid min-w-0 grid-cols-1 items-center gap-3 sm:grid-cols-[7.5rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
            <span className="font-mono tabular-nums">{textOrDash(row.fechaInicial)}</span>
            <span className="min-w-0 break-words">{textOrDash(row.area)}</span>
            <span className="min-w-0 break-words">{textOrDash(row.tipo)}</span>
            <span className="min-w-0 break-words">{textOrDash(row.tema)}</span>
            <span className="font-mono text-sm tabular-nums">{daysLabel(row)}</span>
            <StatusBadge row={row} />
          </div>
          {row.riesgo ? (
            <div className="mt-2">
              <PlazoBadge row={row} />
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <CloseAction row={row} />
          </div>
          <details className="group mt-2">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-primary">
              Detalle
            </summary>
            <CaseFacts row={row} />
          </details>
        </li>
      ))}
    </ul>
  );
}

function CaseTable({ rows }: { rows: PqrCase[] }) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-border bg-card shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
      <table className="w-full min-w-[58rem] border-collapse text-sm">
        <caption className="sr-only">Casos</caption>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border text-left">
            <th className="px-3 py-2 font-semibold">Fecha</th>
            <th className="px-3 py-2 font-semibold">Días</th>
            <th className="px-3 py-2 font-semibold">Proveedor</th>
            <th className="px-3 py-2 font-semibold">Tipo</th>
            <th className="px-3 py-2 font-semibold">Tema</th>
            <th className="px-3 py-2 font-semibold">Asociado</th>
            <th className="px-3 py-2 font-semibold">Estado</th>
            <th className="px-3 py-2 font-semibold">Plazo</th>
            <th className="px-3 py-2 font-semibold">Acción</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border align-top hover:bg-muted/70">
              <td className="px-3 py-3 font-mono tabular-nums">{textOrDash(row.fechaInicial)}</td>
              <td className="px-3 py-3 font-mono tabular-nums">{daysLabel(row)}</td>
              <td className="px-3 py-3 break-words">{textOrDash(row.area)}</td>
              <td className="px-3 py-3 break-words">{textOrDash(row.tipo)}</td>
              <td className="px-3 py-3 break-words">{textOrDash(row.tema)}</td>
              <td className="px-3 py-3 break-words">{textOrDash(row.asociado)}</td>
              <td className="px-3 py-3">
                <StatusBadge row={row} />
              </td>
              <td className="px-3 py-3">
                <PlazoBadge row={row} />
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-col items-start gap-2">
                  <CloseAction row={row} />
                  <details>
                    <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-primary">
                      Detalle
                    </summary>
                    <CaseFacts row={row} />
                  </details>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="m-0 break-words">{textOrDash(value)}</dd>
    </div>
  );
}
