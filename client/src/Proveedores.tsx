import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  createProveedor,
  getProveedores,
  getSummary,
  renameProveedor,
  type ProveedorRow,
} from "./api";
import { casosHref, promedioText, textOrDash } from "./format";
import { ProveedorDetalle } from "./ProveedorDetalle";
import { PageHead } from "./Shell";
import { useMinWidth } from "./useMinWidth";
import type { MatrixRow } from "./types";

export function Proveedores() {
  const [rows, setRows] = useState<ProveedorRow[]>([]);
  const [matriz, setMatriz] = useState<MatrixRow[]>([]);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const wide = useMinWidth("(min-width: 768px)");
  const maxAbiertos = Math.max(1, ...rows.map((row) => row.abiertos));

  const load = useCallback(async () => {
    const [proveedores, summary] = await Promise.allSettled([getProveedores(), getSummary()]);
    if (proveedores.status === "rejected") throw proveedores.reason;
    setRows([...proveedores.value].sort((a, b) => b.abiertos - a.abiertos || a.nombre.localeCompare(b.nombre)));
    setMatriz(summary.status === "fulfilled" ? (summary.value.matrizProveedorTipo ?? []) : []);
  }, []);

  useEffect(() => {
    load().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar los proveedores");
    });
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await createProveedor(nombre);
      setNombre("");
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "No se pudo crear el proveedor");
    } finally {
      setPending(false);
    }
  }

  async function onRename(desde: string, hacia: string) {
    const next = hacia.trim();
    if (!next || next === desde) return;
    setError("");
    try {
      await renameProveedor(desde, next);
      setSelected(next);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo renombrar");
    }
  }

  return (
    <>
      <PageHead
        title="Proveedores"
        lede={rows.length > 0 ? `${rows.length} ${rows.length === 1 ? "proveedor" : "proveedores"}` : undefined}
      />
      {error ? (
        <p role="alert" className="mb-4 border border-orange-300 bg-orange-50 p-3">
          {error}
        </p>
      ) : null}
      <form className="mb-6 flex max-w-xl flex-wrap items-end gap-3" onSubmit={onCreate}>
        <div className="grid min-w-48 flex-1 gap-1.5">
          <Label htmlFor="nuevo-proveedor">Nuevo proveedor</Label>
          <Input id="nuevo-proveedor" value={nombre} onChange={(event) => setNombre(event.target.value)} required />
        </div>
        <Button className="min-h-11" type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Agregar"}
        </Button>
      </form>
      {rows.length === 0 && !error ? <p className="text-muted-foreground">Todavía no hay proveedores.</p> : null}
      {rows.length > 0 && wide ? (
        <div className="max-h-[calc(100dvh-20rem)] overflow-auto border border-border bg-card">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">Proveedores</caption>
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Proveedor</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Casos</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Abiertos</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Vencidos</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Días promedio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const open = selected === row.nombre;
                return (
                  <Fragment key={row.nombre}>
                    <tr className="border-b border-border hover:bg-muted/70">
                      <th scope="row" className="px-4 py-1 text-left font-semibold">
                        <button
                          type="button"
                          aria-expanded={open}
                          className="min-h-11 w-full cursor-pointer text-left break-words text-primary"
                          onClick={() => setSelected(open ? null : row.nombre)}
                        >
                          {row.nombre}
                        </button>
                      </th>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{row.casos}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden bg-muted">
                            <div
                              data-bar
                              className="h-full bg-primary"
                              style={{ width: `${Math.round((row.abiertos / maxAbiertos) * 100)}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-mono tabular-nums">{row.abiertos}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">
                        {row.vencidos === null || row.vencidos === 0 ? (
                          textOrDash(row.vencidos === 0 ? 0 : null)
                        ) : (
                          <Link
                            aria-label={`${row.vencidos} vencidos`}
                            className="inline-flex items-center gap-1.5 text-destructive no-underline"
                            to={casosHref({ area: row.nombre, plazo: "vencido" })}
                          >
                            <span aria-hidden="true" className="size-1.5 bg-destructive" />
                            {row.vencidos}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {promedioText(row.diasPromedio)}
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-border bg-muted/30">
                        <td colSpan={5} className="px-4">
                          <ProveedorDetalle
                            row={row}
                            tipos={matriz.find((item) => item.area === row.nombre)}
                            onRename={onRename}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {rows.length > 0 && !wide ? (
        <ul className="m-0 grid list-none gap-3 p-0">
          {rows.map((row) => {
            const open = selected === row.nombre;
            return (
              <li key={row.nombre} className="border border-border bg-card p-4">
                <button
                  type="button"
                  aria-expanded={open}
                  className="min-h-11 w-full cursor-pointer text-left font-semibold break-words text-primary"
                  onClick={() => setSelected(open ? null : row.nombre)}
                >
                  {row.nombre}
                </button>
                <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Casos", String(row.casos)],
                    ["Abiertos", String(row.abiertos)],
                    ["Vencidos", row.vencidos === null ? "—" : String(row.vencidos)],
                    ["Días promedio", promedioText(row.diasPromedio)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="m-0 font-mono tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                {open ? (
                  <ProveedorDetalle
                    row={row}
                    tipos={matriz.find((item) => item.area === row.nombre)}
                    onRename={onRename}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
