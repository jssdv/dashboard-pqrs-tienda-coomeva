import { readFileSync } from "node:fs";
import { parseDictionary } from "../domain/dictionary.js";
import { importLoadedCases } from "../holidays/nationalHolidays.js";
import { readWorkbook } from "../import/readWorkbook.js";
import { openSqliteRepository } from "../store/sqliteRepository.js";

const [workbookPath, dictionaryPath, dbPath] = process.argv.slice(2);
if (!workbookPath || !dictionaryPath || !dbPath) {
  console.error("usage: importWorkbook <workbook> <dictionary.csv> <db.sqlite>");
  process.exit(1);
}

try {
  const { rows } = await readWorkbook(workbookPath);
  const dictionary = parseDictionary(readFileSync(dictionaryPath, "utf8"));
  const summary = await importLoadedCases({
    rows,
    dictionary,
    dbPath,
    fetchImpl: fetch,
    openRepository: openSqliteRepository,
  });
  console.log(JSON.stringify(summary));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
