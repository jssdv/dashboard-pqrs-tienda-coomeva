import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createSummaryServer } from "../api/summaryServer.js";
import { parseDictionary } from "../domain/dictionary.js";
import { parseHolidayCsv } from "../holidays/nationalHolidays.js";
import { lanBases } from "../share/links.js";
import { openSqliteRepository } from "../store/sqliteRepository.js";
import { appFolder, ensureDataDir, ensureDefaultCsvs, openBrowser } from "./appFolder.js";

const dataDir = join(appFolder(), "data");
const port = Number(process.env.PORT ?? 3000);

try {
  ensureDataDir(dataDir);
  ensureDefaultCsvs(dataDir);
  const dbPath = process.env.PQR_DB ? resolve(process.env.PQR_DB) : join(dataDir, "pqr.sqlite");
  const dictionary = parseDictionary(readFileSync(join(dataDir, "dictionary.csv"), "utf8"));
  const repository = openSqliteRepository(dbPath);
  // INSERT OR IGNORE: safe on every start, and lets closing cases work offline for the listed years.
  repository.addHolidays(parseHolidayCsv(readFileSync(join(dataDir, "holidays.csv"), "utf8")));

  const server = createSummaryServer(repository, { dictionary, auth: repository });
  server.on("error", (error: NodeJS.ErrnoException) => {
    console.error(error.code === "EADDRINUSE" ? `El puerto ${port} ya está en uso. Usa PORT=<otro> para cambiarlo.` : error.message);
    process.exit(1);
  });
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
