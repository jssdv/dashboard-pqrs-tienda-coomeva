import { readFileSync } from "node:fs";
import { parseDictionary } from "../domain/dictionary.js";
import { importCases } from "../import/importCases.js";
import { readWorkbook } from "../import/readWorkbook.js";
import { openSqliteRepository } from "../store/sqliteRepository.js";

const [workbookPath, dictionaryPath, dbPath] = process.argv.slice(2);
if (!workbookPath || !dictionaryPath || !dbPath) {
  console.error("usage: importWorkbook <workbook> <dictionary.csv> <db.sqlite>");
  process.exit(1);
}

const { rows } = await readWorkbook(workbookPath);
const dictionary = parseDictionary(readFileSync(dictionaryPath, "utf8"));
const result = importCases({ rows, holidays: [], dictionary });
openSqliteRepository(dbPath).replaceAll(result.cases);
console.log(
  JSON.stringify({
    imported: result.cases.length,
    skipped: result.skipped,
    invalidDates: result.invalidDates,
  }),
);
