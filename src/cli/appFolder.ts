import { spawn } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAsset, isSea } from "node:sea";

export const DEFAULT_CSVS = ["dictionary.csv", "holidays.csv"];

// Everything the app writes lives under this folder. Packaged: the folder holding the executable.
// Dev: project root. Never the cwd, so a double-click from anywhere lands in the same place.
export function appFolder(): string {
  if (isSea()) return dirname(process.execPath);
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

// Creates <app>/data and fails with a readable message when it cannot be written (read-only volume,
// quarantined or translocated copy, Program Files on Windows).
export function ensureDataDir(dataDir: string): void {
  try {
    mkdirSync(dataDir, { recursive: true });
    accessSync(dataDir, constants.W_OK);
  } catch {
    throw new Error(
      `No se puede escribir en ${dataDir}. Mueve la carpeta de la aplicación a un lugar con permiso de escritura (escritorio, documentos) y vuelve a abrirla.`,
    );
  }
}

// Copies the embedded csv defaults into data/ on first run. Existing files are never overwritten,
// so edits made by the user survive upgrades.
export function ensureDefaultCsvs(dataDir: string): void {
  for (const name of DEFAULT_CSVS) {
    const target = join(dataDir, name);
    if (existsSync(target)) continue;
    const text = isSea() ? getAsset(`defaults/${name}`, "utf8") : undefined;
    if (text === undefined) throw new Error(`Falta el archivo ${target}.`);
    writeFileSync(target, text);
  }
}

export function openBrowser(url: string): void {
  if (process.env.PQR_NO_OPEN === "1") return;
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  // A missing opener must not stop the server; the URL is printed anyway.
  spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true }).on("error", () => {}).unref();
}
