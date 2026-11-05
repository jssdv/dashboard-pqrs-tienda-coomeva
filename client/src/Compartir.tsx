import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  createEnlace,
  getEnlaces,
  getShareInfo,
  getTunel,
  getUrlPublica,
  revokeEnlace,
  setTunel,
  setUrlPublica,
  type Enlace,
  type ShareInfo,
  type TunnelStatus,
} from "./api";
import { fieldClass } from "./Shell";

function messageOf(reason: unknown, fallback: string): string {
  return reason instanceof ApiError ? reason.message : fallback;
}

function fechaOf(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium" });
}

function estadoOf(enlace: Enlace): string {
  if (enlace.revocado) return "Revocado";
  if (enlace.expira && new Date(enlace.expira).getTime() <= Date.now()) return "Vencido";
  return "Activo";
}

export function Compartir() {
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [publica, setPublica] = useState("");
  const [publicaMessage, setPublicaMessage] = useState("");
  const [expira, setExpira] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const [tunel, setTunelState] = useState<TunnelStatus | null>(null);
  const [tunelBusy, setTunelBusy] = useState(false);

  const reload = () => getEnlaces().then(setEnlaces);

  useEffect(() => {
    reload().catch((reason: unknown) => setError(messageOf(reason, "No se pudieron cargar los enlaces")));
    getShareInfo().then(setInfo, () => setInfo({ puerto: 0, urls: [] }));
    getUrlPublica().then(setPublica, () => {});
    getTunel().then(setTunelState, () => {});
  }, []);

  // Mientras el túnel abre, consulta hasta que termine; al quedar activo, la URL pública ya está guardada.
  useEffect(() => {
    if (tunel?.estado !== "iniciando") return;
    const id = setInterval(() => {
      getTunel().then((next) => {
        setTunelState(next);
        if (next.estado === "activo") getUrlPublica().then(setPublica, () => {});
      }, () => {});
    }, 1000);
    return () => clearInterval(id);
  }, [tunel?.estado]);

  async function onTunel(activo: boolean) {
    setTunelBusy(true);
    setError("");
    try {
      setTunelState(await setTunel(activo));
    } catch (reason) {
      setError(messageOf(reason, "No se pudo cambiar el acceso desde internet"));
    } finally {
      setTunelBusy(false);
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setCopied(false);
    try {
      const { url } = await createEnlace(expira);
      setCreated(url);
      setExpira("");
      await reload();
    } catch (reason) {
      setError(messageOf(reason, "No se pudo crear el enlace"));
    } finally {
      setPending(false);
    }
  }

  async function onSavePublica(event: FormEvent) {
    event.preventDefault();
    setPublicaMessage("");
    try {
      setPublica(await setUrlPublica(publica.trim()));
      setPublicaMessage("Guardado. Los enlaces nuevos usarán esta dirección.");
    } catch (reason) {
      setPublicaMessage(messageOf(reason, "No se pudo guardar la URL pública"));
    }
  }

  async function onRevoke(enlace: Enlace) {
    setError("");
    try {
      await revokeEnlace(enlace.id);
      await reload();
    } catch (reason) {
      setError(messageOf(reason, "No se pudo revocar el enlace"));
    }
  }

  async function onCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      setCopied(true);
    } catch {
      setError("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  return (
    <section aria-labelledby="compartir-titulo" className="mt-10 grid gap-6">
      <div className="grid gap-1">
        <h2 id="compartir-titulo" className="font-display text-xl font-semibold tracking-tight">
          Compartir
        </h2>
        <p className="text-sm text-muted-foreground">
          Crea un enlace para que otra persona vea el tablero en vivo. Debe iniciar sesión con su propio usuario.
        </p>
      </div>

      {error ? (
        <p role="alert" className="border border-orange-300 bg-orange-50 p-3">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 border border-border bg-card p-4">
        <h3 className="font-semibold">Acceso desde internet</h3>
        {tunel === null ? null : !tunel.disponible ? (
          <p className="text-sm text-muted-foreground">
            Esta copia de la aplicación no incluye el acceso desde internet. Usa la versión más reciente.
          </p>
        ) : tunel.estado === "activo" && tunel.url ? (
          <>
            <p className="text-sm">Abierto. Quien tenga un enlace puede entrar desde cualquier red:</p>
            <p className="font-mono text-sm break-all">{tunel.url}</p>
            <p className="text-sm text-muted-foreground">
              Funciona mientras esta computadora tenga la aplicación abierta. Al cerrarla, el acceso se apaga.
            </p>
            <Button variant="outline" className="w-fit" disabled={tunelBusy} onClick={() => onTunel(false)}>
              Apagar acceso desde internet
            </Button>
          </>
        ) : tunel.estado === "iniciando" ? (
          <p className="text-sm">Abriendo el acceso… espera unos segundos.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Permite abrir los enlaces desde cualquier red, sin instalar nada más.
            </p>
            {tunel.error ? (
              <p role="alert" className="text-sm text-destructive">
                {tunel.error}
              </p>
            ) : null}
            <Button className="w-fit" disabled={tunelBusy} onClick={() => onTunel(true)}>
              Activar acceso desde internet
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid content-start gap-3 border border-border bg-card p-4">
          <h3 className="font-semibold">Direcciones en tu red</h3>
          {info && info.urls.length > 0 ? (
            <ul className="grid gap-1 font-mono text-sm break-all">
              {info.urls.map((url) => (
                <li key={url}>{url}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No se encontró una dirección de red.</p>
          )}
          <p className="text-sm text-muted-foreground">
            Solo funcionan dentro de la misma red. Para verlo desde fuera, indica una URL pública.
          </p>
        </div>

        <form className="grid content-start gap-3 border border-border bg-card p-4" onSubmit={onSavePublica}>
          <div className="grid gap-1.5">
            <Label htmlFor="url-publica">URL pública (opcional)</Label>
            <Input
              id="url-publica"
              type="url"
              placeholder="https://pqr.ejemplo.com"
              value={publica}
              onChange={(event) => setPublica(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" className="min-h-11">
              Guardar URL
            </Button>
            {publicaMessage ? <span className="text-sm text-muted-foreground">{publicaMessage}</span> : null}
          </div>
        </form>
      </div>

      <form className="grid gap-4 border border-border bg-card p-4 sm:flex sm:items-end" onSubmit={onCreate}>
        <div className="grid gap-1.5">
          <Label htmlFor="enlace-expira">Vence el (opcional)</Label>
          <Input
            id="enlace-expira"
            type="date"
            min={today}
            className={fieldClass}
            value={expira}
            onChange={(event) => setExpira(event.target.value)}
          />
        </div>
        <Button type="submit" className="min-h-11" disabled={pending}>
          Crear enlace
        </Button>
      </form>

      {created ? (
        <div className="grid gap-3 border border-border bg-muted/50 p-4">
          <p className="text-sm">
            Copia el enlace ahora. Por seguridad solo se muestra esta vez.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input readOnly aria-label="Enlace para compartir" value={created} className="min-w-0 flex-1 font-mono" />
            <Button type="button" variant="outline" className="min-h-11" onClick={onCopy}>
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <caption className="sr-only">Enlaces para compartir</caption>
          <thead className="bg-card">
            <tr className="border-b border-border text-left font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
              <th scope="col" className="px-4 py-3 font-medium">Creado por</th>
              <th scope="col" className="px-3 py-3 font-medium">Vence</th>
              <th scope="col" className="px-3 py-3 font-medium">Estado</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {enlaces.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Aún no hay enlaces.
                </td>
              </tr>
            ) : null}
            {enlaces.map((enlace) => {
              const estado = estadoOf(enlace);
              return (
                <tr key={enlace.id} className="border-b border-border hover:bg-muted/70">
                  <td className="px-4 py-3 break-all">{enlace.creadoPor}</td>
                  <td className="px-3 py-3">{enlace.expira ? fechaOf(enlace.expira) : "Sin vencimiento"}</td>
                  <td className="px-3 py-3">{estado}</td>
                  <td className="px-4 py-2 text-right">
                    {estado === "Activo" ? (
                      <Button type="button" variant="ghost" className="min-h-11" onClick={() => onRevoke(enlace)}>
                        Revocar
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
