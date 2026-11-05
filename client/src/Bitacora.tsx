import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, addBitacoraEntry, deleteBitacoraEntry, getBitacora, updateBitacoraEntry } from "./api";
import { useAuth } from "./auth";
import { bogotaToday } from "./metrics";
import { useLive } from "./useLive";
import type { BitacoraEntry, FieldError } from "./types";

const sortEntries = (rows: BitacoraEntry[]) => rows.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);

export function Bitacora({ caseId }: { caseId: string }) {
  const [entries, setEntries] = useState<BitacoraEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [fecha, setFecha] = useState(() => bogotaToday());
  const [texto, setTexto] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ id: number; fecha: string; texto: string } | null>(null);
  const [editErrors, setEditErrors] = useState<FieldError[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const { canWrite, user } = useAuth();
  // Quien escribió el avance (o un administrador) puede cambiarlo.
  const puedeCambiar = (entry: BitacoraEntry) => canWrite && (user?.rol === "admin" || entry.autor === user?.usuario);
  useLive(() => {
    getBitacora(caseId).then(setEntries, () => {});
  });

  useEffect(() => {
    let live = true;
    setEntries(null);
    setLoadError(false);
    setEditing(null);
    getBitacora(caseId).then(
      (rows) => live && setEntries(rows),
      () => live && setLoadError(true),
    );
    return () => {
      live = false;
    };
  }, [caseId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      const entry = await addBitacoraEntry(caseId, { fecha, texto });
      setEntries((rows) => sortEntries([entry, ...(rows ?? [])]));
      setTexto("");
    } catch (reason) {
      setErrors(
        reason instanceof ApiError && reason.errors.length > 0
          ? reason.errors
          : [{ field: "form", message: "No se pudo guardar el avance" }],
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setEditErrors([]);
    try {
      const updated = await updateBitacoraEntry(editing.id, { fecha: editing.fecha, texto: editing.texto });
      setEntries((rows) => sortEntries((rows ?? []).map((row) => (row.id === updated.id ? updated : row))));
      setEditing(null);
    } catch (reason) {
      setEditErrors(
        reason instanceof ApiError && reason.errors.length > 0
          ? reason.errors
          : [{ field: "form", message: reason instanceof Error ? reason.message : "No se pudo guardar el avance" }],
      );
    }
  }

  async function remove(entry: BitacoraEntry) {
    if (!window.confirm("¿Eliminar este avance de la bitácora?")) return;
    setActionError(null);
    try {
      await deleteBitacoraEntry(entry.id);
      setEntries((rows) => (rows ?? []).filter((row) => row.id !== entry.id));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "No se pudo eliminar el avance");
    }
  }

  const message = (field: string) => errors.find((error) => error.field === field)?.message;
  const editMessage = (field: string) => editErrors.find((error) => error.field === field)?.message;

  return (
    <section aria-labelledby="det-bitacora" className="grid gap-3">
      <h3 id="det-bitacora" className="text-sm font-semibold">Bitácora</h3>
      {canWrite ? (
        <form onSubmit={submit} className="grid gap-2" noValidate>
          <div className="grid gap-1">
            <Label htmlFor="bitacora-fecha">Fecha del avance</Label>
            <Input
              id="bitacora-fecha"
              type="date"
              value={fecha}
              max={bogotaToday()}
              onChange={(event) => setFecha(event.target.value)}
              aria-invalid={Boolean(message("fecha"))}
            />
            {message("fecha") ? <p role="alert" className="text-sm text-destructive">{message("fecha")}</p> : null}
          </div>
          <div className="grid gap-1">
            <Label htmlFor="bitacora-texto">Avance</Label>
            <Textarea
              id="bitacora-texto"
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              aria-invalid={Boolean(message("texto"))}
            />
            {message("texto") ? <p role="alert" className="text-sm text-destructive">{message("texto")}</p> : null}
          </div>
          {message("form") ? <p role="alert" className="text-sm text-destructive">{message("form")}</p> : null}
          <Button type="submit" variant="outline" disabled={saving} className="w-fit">
            Registrar avance
          </Button>
        </form>
      ) : null}
      {actionError ? <p role="alert" className="text-sm text-destructive">{actionError}</p> : null}
      {loadError ? (
        <p role="alert" className="text-sm text-destructive">No se pudo cargar la bitácora</p>
      ) : entries === null ? (
        <Skeleton className="h-10 w-full" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin avances registrados.</p>
      ) : (
        <ol className="m-0 grid list-none gap-0 p-0">
          {entries.map((entry) =>
            editing?.id === entry.id ? (
              <li key={entry.id} className="border-t border-border py-2">
                <form onSubmit={saveEdit} className="grid gap-2" noValidate>
                  <div className="grid gap-1">
                    <Label htmlFor={`edit-fecha-${entry.id}`}>Fecha del avance</Label>
                    <Input
                      id={`edit-fecha-${entry.id}`}
                      type="date"
                      value={editing.fecha}
                      max={bogotaToday()}
                      onChange={(event) => setEditing({ ...editing, fecha: event.target.value })}
                      aria-invalid={Boolean(editMessage("fecha"))}
                    />
                    {editMessage("fecha") ? <p role="alert" className="text-sm text-destructive">{editMessage("fecha")}</p> : null}
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`edit-texto-${entry.id}`}>Avance</Label>
                    <Textarea
                      id={`edit-texto-${entry.id}`}
                      value={editing.texto}
                      onChange={(event) => setEditing({ ...editing, texto: event.target.value })}
                      aria-invalid={Boolean(editMessage("texto"))}
                    />
                    {editMessage("texto") ? <p role="alert" className="text-sm text-destructive">{editMessage("texto")}</p> : null}
                  </div>
                  {editMessage("form") ? <p role="alert" className="text-sm text-destructive">{editMessage("form")}</p> : null}
                  <div className="flex gap-2">
                    <Button type="submit" variant="outline">Guardar</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                  </div>
                </form>
              </li>
            ) : (
              <li key={entry.id} className="grid gap-1 border-t border-border py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <time className="font-mono text-xs text-muted-foreground tabular-nums" dateTime={entry.fecha}>
                    {entry.fecha}
                  </time>
                  <span className="text-xs text-muted-foreground">por {entry.autor ?? "usuario no registrado"}</span>
                </div>
                <p className="m-0 whitespace-pre-wrap break-words">{entry.texto}</p>
                {puedeCambiar(entry) ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing({ id: entry.id, fecha: entry.fecha, texto: entry.texto })}
                    >
                      Editar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => remove(entry)}>
                      Eliminar
                    </Button>
                  </div>
                ) : null}
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  );
}
