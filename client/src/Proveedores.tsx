import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, createProveedor, getProveedores, renameProveedor, type ProveedorRow } from "./api";
import { PageHead } from "./Shell";

export function Proveedores() {
  const [rows, setRows] = useState<ProveedorRow[]>([]);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    setRows(await getProveedores());
  }

  useEffect(() => {
    let cancelled = false;
    getProveedores()
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "No se pudieron cargar");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo renombrar");
    }
  }

  return (
    <>
      <PageHead
        title="Proveedores"
        lede="Catálogo que usan los casos. Renombrar un proveedor actualiza los casos que ya lo tienen."
      />
      {error ? (
        <p role="alert" className="mb-4 rounded-xl border border-orange-300 bg-orange-50 p-3">
          {error}
        </p>
      ) : null}
      <Card className="mb-6 max-w-xl shadow-sm">
        <CardContent className="pt-4">
          <form className="grid gap-3" onSubmit={onCreate}>
            <div className="grid gap-1.5">
              <Label htmlFor="nuevo-proveedor">Nuevo proveedor</Label>
              <Input
                id="nuevo-proveedor"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                required
              />
            </div>
            <Button className="min-h-11 w-fit" type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Agregar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <ul className="m-0 grid list-none gap-3 p-0">
        {rows.map((row) => (
          <li key={row.nombre}>
            <ProveedorItem row={row} onRename={onRename} />
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-muted-foreground">Todavía no hay proveedores.</p> : null}
    </>
  );
}

function ProveedorItem({
  row,
  onRename,
}: {
  row: ProveedorRow;
  onRename: (desde: string, hacia: string) => void;
}) {
  const [nombre, setNombre] = useState(row.nombre);
  useEffect(() => setNombre(row.nombre), [row.nombre]);
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onRename(row.nombre, nombre);
      }}
    >
      <div className="grid min-w-48 flex-1 gap-1.5">
        <Label htmlFor={`proveedor-${row.nombre}`}>{row.casos} casos</Label>
        <Input
          id={`proveedor-${row.nombre}`}
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
        />
      </div>
      <Button className="min-h-11" type="submit" disabled={nombre.trim() === row.nombre}>
        Renombrar
      </Button>
    </form>
  );
}
