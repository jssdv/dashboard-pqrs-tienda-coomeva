import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, createUser, getUsers, updateUser, type AuthUser, type Rol } from "./api";
import { useAuth } from "./auth";
import { FormDialog } from "./ui/FormDialog";
import { Select } from "./ui/Select";
import type { Option } from "./ui/options";
import { PageHead, fieldClass } from "./Shell";

const ROLES: Option[] = [
  { value: "admin", label: "Administrador" },
  { value: "user", label: "Usuario" },
  { value: "viewer", label: "Solo consulta" },
];

function messageOf(reason: unknown, fallback: string): string {
  return reason instanceof ApiError ? reason.message : fallback;
}

function NewUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("user");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await createUser({ usuario: usuario.trim(), password, rol: rol as Rol });
      await onCreated();
      onClose();
    } catch (reason) {
      setError(messageOf(reason, "No se pudo crear el usuario"));
      setPending(false);
    }
  }

  return (
    <FormDialog
      title="Nuevo usuario"
      width="md"
      submitLabel="Crear usuario"
      pending={pending}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="nuevo-usuario">Usuario</Label>
          <Input id="nuevo-usuario" value={usuario} onChange={(event) => setUsuario(event.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nuevo-password">Contraseña inicial</Label>
          <Input
            id="nuevo-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <p className="m-0 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>
        <Select label="Rol" value={rol} onChange={setRol} options={ROLES} allLabel={null} required />
        {error ? (
          <p role="alert" className="m-0 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </FormDialog>
  );
}

function ResetPasswordDialog({
  target,
  onClose,
  onDone,
}: {
  target: AuthUser;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await updateUser(target.id, { password });
      await onDone();
      onClose();
    } catch (reason) {
      setError(messageOf(reason, "No se pudo restablecer la contraseña"));
      setPending(false);
    }
  }

  return (
    <FormDialog
      title={`Restablecer contraseña de ${target.usuario}`}
      description="Cierra las sesiones abiertas de este usuario."
      width="md"
      submitLabel="Restablecer"
      pending={pending}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="reset-password">Nueva contraseña</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <p className="m-0 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>
        {error ? (
          <p role="alert" className="m-0 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </FormDialog>
  );
}

export function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<AuthUser | null>(null);

  const reload = async () => setUsers(await getUsers());

  useEffect(() => {
    reload().catch((reason: unknown) => setError(messageOf(reason, "No se pudieron cargar los usuarios")));
  }, []);

  async function change(fields: Parameters<typeof updateUser>[1], target: AuthUser) {
    setError("");
    try {
      await updateUser(target.id, fields);
      await reload();
    } catch (reason) {
      setError(messageOf(reason, "No se pudo guardar el cambio"));
    }
  }

  return (
    <>
      <PageHead
        section="Administración"
        title="Usuarios"
        lede={users.length > 0 ? `${users.length} ${users.length === 1 ? "usuario" : "usuarios"}` : undefined}
        actions={
          <Button type="button" className="min-h-11" onClick={() => setCreating(true)}>
            Nuevo usuario
          </Button>
        }
      />
      {error ? (
        <p role="alert" className="mb-4 border border-orange-300 bg-orange-50 p-3">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">Usuarios</caption>
          <thead className="bg-card">
            <tr className="border-b border-border text-left font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
              <th scope="col" className="px-4 py-3 font-medium">Usuario</th>
              <th scope="col" className="px-3 py-3 font-medium">Rol</th>
              <th scope="col" className="px-3 py-3 font-medium">Estado</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((row) => {
              const self = row.id === user?.id;
              return (
                <tr key={row.id} className="border-b border-border hover:bg-muted/70">
                  <th scope="row" className="px-4 py-3 text-left font-semibold break-all">
                    {row.usuario}
                    {self ? <span className="ml-2 font-normal text-muted-foreground">(tú)</span> : null}
                  </th>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Rol de ${row.usuario}`}
                      className={`${fieldClass} w-auto`}
                      value={row.rol}
                      disabled={self}
                      onChange={(event) => change({ rol: event.target.value as Rol }, row)}
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">{row.activo ? "Activo" : "Inactivo"}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        disabled={self}
                        onClick={() => change({ activo: !row.activo }, row)}
                      >
                        {row.activo ? "Desactivar" : "Activar"}
                      </Button>
                      <Button type="button" variant="ghost" className="min-h-11" onClick={() => setResetting(row)}>
                        Restablecer contraseña
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {creating ? (
        <NewUserDialog onClose={() => setCreating(false)} onCreated={reload} />
      ) : null}
      {resetting ? (
        <ResetPasswordDialog target={resetting} onClose={() => setResetting(null)} onDone={reload} />
      ) : null}
    </>
  );
}
