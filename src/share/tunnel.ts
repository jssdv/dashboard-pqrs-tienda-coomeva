import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";

export interface TunnelStatus {
  estado: "apagado" | "iniciando" | "activo";
  url: string | null;
  error: string | null;
  disponible: boolean;
}

export interface TunnelController {
  status(): TunnelStatus;
  // Lanza error si esta copia no trae cloudflared o no se puede arrancar.
  start(port: number): void;
  stop(): void;
}

const TUNNEL_URL = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const START_TIMEOUT_MS = 30_000;

export function parseTunnelUrl(text: string): string | null {
  return TUNNEL_URL.exec(text)?.[0] ?? null;
}

// Un túnel a la vez. El ejecutable cloudflared va empaquetado junto a la app: no hay que instalar nada.
// onUrl recibe la dirección pública al activarse y null al apagarse.
export function createTunnel(binary: string | null, onUrl: (url: string | null) => void): TunnelController {
  const disponible = binary !== null && existsSync(binary);
  let child: ChildProcess | null = null;
  let timer: NodeJS.Timeout | undefined;
  let state: TunnelStatus = { estado: "apagado", url: null, error: null, disponible };

  function apagar(error: string | null) {
    const tenia = state.url;
    child = null;
    clearTimeout(timer);
    state = { estado: "apagado", url: null, error, disponible };
    if (tenia) onUrl(null);
  }

  return {
    status: () => state,
    start(port) {
      if (!binary || !disponible) throw new Error("Esta copia no incluye el acceso desde internet.");
      if (child) return;
      const proceso = spawn(binary, ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${port}`], {
        windowsHide: true,
      });
      child = proceso;
      state = { estado: "iniciando", url: null, error: null, disponible };
      const leer = (chunk: Buffer) => {
        const url = parseTunnelUrl(chunk.toString());
        if (!url || child !== proceso || state.estado === "activo") return;
        clearTimeout(timer);
        state = { estado: "activo", url, error: null, disponible };
        onUrl(url);
      };
      proceso.stdout?.on("data", leer);
      proceso.stderr?.on("data", leer);
      timer = setTimeout(() => {
        if (child !== proceso || state.estado !== "iniciando") return;
        proceso.kill();
        apagar("No se pudo abrir el acceso desde internet. Revisa la conexión y vuelve a intentar.");
      }, START_TIMEOUT_MS);
      proceso.on("exit", () => {
        if (child !== proceso) return; // apagado a propósito
        apagar(state.estado === "activo" ? "El acceso desde internet se cortó." : "No se pudo abrir el acceso desde internet.");
      });
      proceso.on("error", () => {
        if (child === proceso) apagar("No se pudo ejecutar el acceso desde internet.");
      });
    },
    stop() {
      if (!child) return;
      const proceso = child;
      child = null;
      proceso.kill();
      apagar(null);
    },
  };
}
