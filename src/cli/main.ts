import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createSummaryServer } from "../api/summaryServer.js";
import { parseDictionary } from "../domain/dictionary.js";
import { parseHolidayCsv } from "../holidays/nationalHolidays.js";
import { lanBases, URL_PUBLICA } from "../share/links.js";
import { createTunnel } from "../share/tunnel.js";
import { openSqliteRepository } from "../store/sqliteRepository.js";
import { appFolder, ensureDataDir, ensureDefaultCsvs, openBrowser } from "./appFolder.js";

const dataDir = join(appFolder(), "data");
const port = Number(process.env.PORT ?? 3000);

try {
  ensureDataDir(dataDir);
  ensureDefaultCsvs(dataDir);
  const dbPath = process.env.PQR_DB ? resolve(process.env.PQR_DB) : join(dataDir, "pqr.sqlite");
  const dictionary = parseDictionary(readFileSync(join(dataDir, "dictionary.csv"), "utf8"));
  const repository = openSqliteRepository(dbPath, { respaldos: join(dataDir, "respaldos") });
  // INSERT OR IGNORE: safe on every start, and lets closing cases work offline for the listed years.
  const extraHolidays = parseHolidayCsv(readFileSync(join(dataDir, "holidays.csv"), "utf8"));
  repository.addHolidays(extraHolidays);

  // Acceso desde internet: el túnel va empaquetado en <app>/bin. Al activarse, su URL pasa a ser la URL pública.
  const cloudflared = process.platform === "win32" ? "cloudflared.exe" : "cloudflared";
  const tunnel = createTunnel(process.env.PQR_CLOUDFLARED ?? join(appFolder(), "bin", cloudflared), (url) => {
    if (url) repository.setAjuste(URL_PUBLICA, url);
    else if ((repository.getAjuste(URL_PUBLICA) ?? "").endsWith(".trycloudflare.com")) repository.setAjuste(URL_PUBLICA, "");
  });
  process.on("exit", () => tunnel.stop());
  const server = createSummaryServer(repository, { dictionary, extraHolidays, auth: repository, tunnel });
  server.on("error", (error: NodeJS.ErrnoException) => {
    console.error(
      error.code === "EADDRINUSE"
        ? `El puerto ${port} ya está en uso: puede que otra copia de PQR esté abierta. Ciérrala, o abre con PORT=<otro> para cambiarlo.`
        : error.message,
    );
    process.exit(1);
  });
  // Cierre limpio: respaldo consistente y base cerrada. SQLite escribe de forma síncrona, así que no hace falta esperar peticiones.
  const apagar = () => {
    server.closeAllConnections();
    try {
      console.log(`Respaldo al cerrar: ${repository.respaldar()}`);
    } catch (error) {
      console.error(`No se pudo crear el respaldo al cerrar: ${error instanceof Error ? error.message : String(error)}`);
    }
    repository.cerrar();
    process.exit(0);
  };
  process.once("SIGINT", apagar);
  process.once("SIGTERM", apagar);
  server.listen(port, "0.0.0.0", () => {
    const local = `http://localhost:${port}`;
    console.log(`PQR listo. Abre: ${local}`);
    for (const base of lanBases(port)) console.log(`En la red local: ${base}`);
    console.log(`Datos: ${dataDir}`);
    openBrowser(local);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
