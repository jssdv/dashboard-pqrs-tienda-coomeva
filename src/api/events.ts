import type { ServerResponse } from "node:http";

export interface EventHub {
  subscribe(res: ServerResponse): void;
  emit(event: string): void;
}

// Proxies and idle timers drop quiet streams; a comment line every 25 s keeps them open.
const HEARTBEAT_MS = 25_000;

export function createEventHub(): EventHub {
  const clients = new Set<ServerResponse>();
  const heartbeat = setInterval(() => {
    for (const res of clients) res.write(": ping\n\n");
  }, HEARTBEAT_MS);
  heartbeat.unref();

  return {
    subscribe(res) {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      res.write(": conectado\n\n");
      clients.add(res);
      res.on("close", () => clients.delete(res));
    },
    emit(event) {
      for (const res of clients) res.write(`event: ${event}\ndata: {}\n\n`);
    },
  };
}
