import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getSetupRequired, login } from "./api";
import { useAuth } from "./auth";

// Only in-app paths: a crafted ?next= must not send the user to another site.
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10 text-foreground">
      <section className="grid w-full max-w-sm gap-6 border border-border bg-card p-6 shadow-none">
        <div className="grid gap-2">
          <img src="/logo.png" alt="Tienda Coomeva" className="h-auto w-32" />
          <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
        </div>
        {children}
      </section>
    </main>
  );
}

export function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // First run: no users yet, so the only useful screen is the admin setup.
  useEffect(() => {
    getSetupRequired()
      .then((required) => {
        if (required) navigate("/setup", { replace: true });
      })
      .catch(() => {});
  }, [navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      setUser(await login(usuario.trim(), password));
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "No se pudo iniciar sesión");
      setPending(false);
    }
  }

  return (
    <AuthFrame title="Iniciar sesión">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="login-usuario">Usuario</Label>
          <Input
            id="login-usuario"
            autoComplete="username"
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="login-password">Contraseña</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error ? (
          <p role="alert" className="m-0 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </AuthFrame>
  );
}
