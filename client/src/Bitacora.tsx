import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, addBitacoraEntry, getBitacora } from "./api";
import { useAuth } from "./auth";
import { bogotaToday } from "./metrics";
import { useLive } from "./useLive";
import type { BitacoraEntry, FieldError } from "./types";

export function Bitacora({ caseId }: { caseId: string }) {
  const [entries, setEntries] = useState<BitacoraEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [fecha, setFecha] = useState(() => bogotaToday());
  const [texto, setTexto] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  const { canWrite } = useAuth();
  useLive(() => {
    getBitacora(caseId).then(setEntries, () => {});
  });

  useEffect(() => {
    let live = true;
    setEntries(null);
    setLoadError(false);
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
      setEntries((rows) =>
        [entry, ...(rows ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id),
      );
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

  const message = (field: string) => errors.find((error) => error.field === field)?.message;

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
      {loadError ? (
        <p role="alert" className="text-sm text-destructive">No se pudo cargar la bitácora</p>
      ) : entries === null ? (
        <Skeleton className="h-10 w-full" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin avances registrados.</p>
      ) : (
        <ol className="m-0 grid list-none gap-0 p-0">
          {entries.map((entry) => (
            <li key={entry.id} className="grid gap-1 border-t border-border py-2">
              <time className="font-mono text-xs text-muted-foreground tabular-nums" dateTime={entry.fecha}>
                {entry.fecha}
              </time>
              <p className="m-0 whitespace-pre-wrap break-words">{entry.texto}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
