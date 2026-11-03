import { readFileSync } from "node:fs";
import { createSummaryServer } from "../api/summaryServer.js";
import { parseDictionary } from "../domain/dictionary.js";
import { openSqliteRepository } from "../store/sqliteRepository.js";

const dbPath = process.argv[2];
if (!dbPath) {
  console.error("usage: serveSummary <db.sqlite>");
  process.exit(1);
}

try {
  const dictionaryPath = process.argv[3] ?? "data/dictionary.csv";
  const dictionary = parseDictionary(readFileSync(dictionaryPath, "utf8"));
  const port = Number(process.env.PORT ?? 3000);
  const repository = openSqliteRepository(dbPath);
  createSummaryServer(repository, { dictionary, auth: repository }).listen(port, "0.0.0.0", () =>
    console.log(`http://localhost:${port}`),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
