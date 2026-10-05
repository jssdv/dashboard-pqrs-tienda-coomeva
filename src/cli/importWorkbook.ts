import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseDictionary } from "../domain/dictionary.js";
import { importLoadedCases, parseHolidayCsv } from "../holidays/nationalHolidays.js";
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
  const extraPath = join(dirname(dictionaryPath), "holidays.csv");
  const extraHolidays = existsSync(extraPath) ? parseHolidayCsv(readFileSync(extraPath, "utf8")) : [];
  const summary = await importLoadedCases({
    rows,
    dictionary,
    dbPath,
    fetchImpl: fetch,
    extraHolidays,
    openRepository: openSqliteRepository,
    onMissingYear: (year) =>
      console.error(`warning: no national holidays available for ${year}; business days use none for that year`),
  });
  console.log(JSON.stringify(summary));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
