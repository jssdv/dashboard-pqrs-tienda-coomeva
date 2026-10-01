import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { summarize } from "../domain/summary.js";
import type { CaseRepository } from "../store/repository.js";
import { renderPage } from "../web/renderPage.js";

const dashboardCssPath = join(dirname(fileURLToPath(import.meta.url)), "../../public/dashboard.css");

export function createSummaryServer(repository: CaseRepository): Server {
  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/summary") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(summarize(repository.list())));
      return;
    }
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderPage(summarize(repository.list())));
      return;
    }
    if (req.method === "GET" && url.pathname === "/dashboard.css") {
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
      res.end(readFileSync(dashboardCssPath));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });
}
