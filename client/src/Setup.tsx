import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getSetupRequired, setupAdmin } from "./api";
import { useAuth } from "./auth";
import { AuthFrame } from "./Login";

// Shown only while no user exists. The server refuses setup once one does (409).
export function Setup() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getSetupRequired()
      .then((required) => {
        if (!required) navigate("/login", { replace: true });
      })
      .catch(() => {});
  }, [navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setPending(true);
    setError("");
    try {
      setUser(await setupAdmin(usuario.trim(), password));
      navigate("/", { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "No se pudo crear el administrador");
      setPending(false);
    }
  }

  return (
    <AuthFrame title="Crear administrador">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <p className="m-0 text-sm text-muted-foreground">
          Primer uso: crea la cuenta de administrador. Después podrás crear más usuarios desde Administración.
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor="setup-usuario">Usuario</Label>
          <Input
            id="setup-usuario"
            autoComplete="username"
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="setup-password">Contraseña</Label>
          <Input
            id="setup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <p className="m-0 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="setup-confirmacion">Repite la contraseña</Label>
          <Input
            id="setup-confirmacion"
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(event) => setConfirmacion(event.target.value)}
            required
          />
        </div>
        {error ? (
          <p role="alert" className="m-0 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? "Creando…" : "Crear administrador"}
        </Button>
      </form>
    </AuthFrame>
  );
}
