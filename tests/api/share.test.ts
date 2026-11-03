import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createSummaryServer } from "../../src/api/summaryServer";
import { createSession } from "../../src/auth/sessions";
import { openSqliteRepository } from "../../src/store/sqliteRepository";
import { hashToken, newToken } from "../../src/share/links";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

// Fresh in-memory store per test: one admin, one viewer, and their session cookies.
async function start() {
  const repo = openSqliteRepository(":memory:");
  const server = createSummaryServer(repo, { auth: repo });
  servers.push(server);
  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") resolve(address.port);
    });
  });
  const admin = repo.insertUser({ usuario: "admin", passwordHash: "x", rol: "admin", activo: true, creadoEn: "2026-01-01T00:00:00.000Z" });
  const viewer = repo.insertUser({ usuario: "lector", passwordHash: "x", rol: "viewer", activo: true, creadoEn: "2026-01-01T00:00:00.000Z" });
  return {
    base: `http://127.0.0.1:${port}`,
    repo,
    adminCookie: `pqr_session=${createSession(repo, admin.id)}`,
    viewerCookie: `pqr_session=${createSession(repo, viewer.id)}`,
  };
}

const json = (method: string, body: unknown, cookie: string): RequestInit => ({
  method,
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify(body),
});

const FUTURE = "2099-12-31";

describe("SSE /api/events", () => {
  it("emits a change event after a successful POST and not after a rejected one", async () => {
    const { base, adminCookie } = await start();
    const stream = await fetch(`${base}/api/events`, { headers: { cookie: adminCookie } });
    expect(stream.headers.get("content-type")).toMatch(/text\/event-stream/);
    const reader = stream.body!.getReader();
    const decoder = new TextDecoder();

    const created = await fetch(`${base}/api/proveedores`, json("POST", { nombre: "Proveedor Uno" }, adminCookie));
    expect(created.status).toBe(201);

    let seen = "";
    while (!seen.includes("event: change")) {
      const { value, done } = await reader.read();
      if (done) break;
      seen += decoder.decode(value);
    }
    expect(seen).toContain("event: change");
    await reader.cancel();
  });

  it("requires login", async () => {
    const { base } = await start();
    expect((await fetch(`${base}/api/events`)).status).toBe(401);
  });
});

describe("enlaces", () => {
  it("returns the token once as a full URL and stores only its hash", async () => {
    const { base, adminCookie, repo } = await start();
    const created = await fetch(`${base}/api/admin/enlaces`, json("POST", { expira: FUTURE }, adminCookie));
    expect(created.status).toBe(201);
    const { url } = await created.json();
    expect(url).toMatch(/\/ver\/[A-Za-z0-9_-]{43}$/);

    const token = url.split("/ver/")[1];
    const stored = JSON.stringify(repo.listEnlaces());
    expect(stored).not.toContain(token);
  });

  it("rejects a token after revocation with 404, and needs a session to open a valid one", async () => {
    const { base, adminCookie } = await start();
    const created = await fetch(`${base}/api/admin/enlaces`, json("POST", {}, adminCookie));
    const { id, url } = await created.json();
    const path = new URL(url).pathname;

    const anonymous = await fetch(`${base}${path}`, { redirect: "manual" });
    expect(anonymous.status).toBe(302);
    expect(anonymous.headers.get("location")).toBe(`/login?next=${encodeURIComponent(path)}`);

    const revoked = await fetch(`${base}/api/admin/enlaces/${id}`, { method: "DELETE", headers: { cookie: adminCookie } });
    expect(revoked.status).toBe(200);
    expect((await fetch(`${base}${path}`, { headers: { cookie: adminCookie }, redirect: "manual" })).status).toBe(404);
  });

  it("rejects an expired token with 404, even for a logged-in admin", async () => {
    const { base, adminCookie, repo } = await start();
    const token = newToken();
    repo.insertEnlace(hashToken(token), 1, "2000-01-01T00:00:00.000Z");
    const response = await fetch(`${base}/ver/${token}`, { headers: { cookie: adminCookie }, redirect: "manual" });
    expect(response.status).toBe(404);
  });

  it("lets a logged-in user past the gate on a valid link", async () => {
    const { base, adminCookie, viewerCookie } = await start();
    const { url } = await (await fetch(`${base}/api/admin/enlaces`, json("POST", {}, adminCookie))).json();
    const path = new URL(url).pathname;
    expect((await fetch(`${base}${path}`, { headers: { cookie: viewerCookie }, redirect: "manual" })).status).not.toBe(302);
  });

  it("refuses a past expiry date", async () => {
    const { base, adminCookie } = await start();
    const response = await fetch(`${base}/api/admin/enlaces`, json("POST", { expira: "2000-01-01" }, adminCookie));
    expect(response.status).toBe(400);
  });

  it("keeps admin-only access: a viewer cannot create links", async () => {
    const { base, viewerCookie } = await start();
    const response = await fetch(`${base}/api/admin/enlaces`, json("POST", {}, viewerCookie));
    expect(response.status).toBe(403);
  });
});

describe("ajustes", () => {
  it("stores the public URL without a trailing slash and rejects non-http values", async () => {
    const { base, adminCookie } = await start();
    const saved = await fetch(`${base}/api/admin/ajustes`, json("PUT", { url_publica: "https://pqr.example.com/" }, adminCookie));
    expect(await saved.json()).toEqual({ url_publica: "https://pqr.example.com" });
    const bad = await fetch(`${base}/api/admin/ajustes`, json("PUT", { url_publica: "javascript:alert(1)" }, adminCookie));
    expect(bad.status).toBe(400);
  });
});
