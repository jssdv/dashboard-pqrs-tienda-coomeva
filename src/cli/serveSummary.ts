import { createSummaryServer } from "../api/summaryServer.js";
import { openSqliteRepository } from "../store/sqliteRepository.js";

const dbPath = process.argv[2];
if (!dbPath) {
  console.error("usage: serveSummary <db.sqlite>");
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3000);
createSummaryServer(openSqliteRepository(dbPath)).listen(port, "0.0.0.0");
