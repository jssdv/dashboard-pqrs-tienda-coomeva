import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { renameProveedor, updateProveedor, type ProveedorRow } from "./api";
import { FormDialog } from "./ui/FormDialog";

export function ProveedorEditar({
  row,
  onClose,
  onSaved,
}: {
  row: ProveedorRow;
  onClose: () => void;
  onSaved: (nombre: string) => void | Promise<void>;
}) {
  const [nombre, setNombre] = useState(row.nombre);
  const [contacto, setContacto] = useState(row.contacto);
  const [correo, setCorreo] = useState(row.correo);
  const [telefono, setTelefono] = useState(row.telefono);
  const [plazo, setPlazo] = useState(row.plazoDias === null ? "" : String(row.plazoDias));
  const [notas, setNotas] = useState(row.notas);
  const [activo, setActivo] = useState(row.activo);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = nombre.trim().replace(/\s+/g, " ");
    if (!next) {
      setError("El nombre es obligatorio");
      return;
    }
    setPending(true);
    setError("");
    try {
      if (next !== row.nombre) await renameProveedor(row.nombre, next);
      await updateProveedor(next, {
        contacto,
        correo,
        telefono,
        notas,
        activo,
        plazoDias: plazo.trim() ? Number(plazo) : null,
      });
      await onSaved(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el proveedor");
      setPending(false);
    }
  }

  return (
    <FormDialog
      title="Editar proveedor"
      description="El plazo vacío usa el estándar de 15 días hábiles."
      width="md"
      submitLabel="Guardar"
      pending={pending}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="prov-nombre">Nombre</Label>
          <Input id="prov-nombre" data-autofocus value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prov-contacto">Contacto</Label>
          <Input id="prov-contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prov-telefono">Teléfono</Label>
          <Input id="prov-telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prov-correo">Correo</Label>
          <Input id="prov-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prov-plazo">Plazo (días hábiles)</Label>
          <Input
            id="prov-plazo"
            type="number"
            min={1}
            max={60}
            value={plazo}
            onChange={(e) => setPlazo(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="prov-notas">Notas</Label>
          <Textarea id="prov-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
        <label className="flex min-h-11 items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Activo (los inactivos no aparecen al crear casos)
        </label>
        {error ? (
          <p role="alert" className="text-sm text-destructive sm:col-span-2">
            {error}
          </p>
        ) : null}
      </div>
    </FormDialog>
  );
}
