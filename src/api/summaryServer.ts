import { createServer, type Server } from "node:http";
import { summarize } from "../domain/summary.js";
import type { CaseRepository } from "../store/repository.js";

export function createSummaryServer(repository: CaseRepository): Server {
  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/summary") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(summarize(repository.list())));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });
}
