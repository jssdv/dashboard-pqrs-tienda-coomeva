import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createSummaryServer } from "../../src/api/summaryServer.js";
import { openSqliteRepository } from "../../src/store/sqliteRepository.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

async function start(): Promise<string> {
  const repo = openSqliteRepository(":memory:");
  const server = createSummaryServer(repo, { auth: repo });
  servers.push(server);
  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") resolve(address.port);
    });
  });
  return `http://127.0.0.1:${port}`;
}

const post = (fields: Record<string, string>, cookie?: string): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(fields),
});

// Returns the "name=value" pair to send back in the Cookie header.
const cookieOf = (response: Response): string => (response.headers.get("set-cookie") ?? "").split(";")[0];

async function setupAdmin(base: string): Promise<string> {
  const response = await fetch(`${base}/api/auth/setup`, post({ usuario: "admin", password: "clave-segura" }));
  expect(response.status).toBe(201);
  return cookieOf(response);
}

async function createAccount(base: string, cookie: string, usuario: string, rol: string): Promise<void> {
  const response = await fetch(
    `${base}/api/admin/usuarios`,
    post({ usuario, password: "clave-segura", rol }, cookie),
  );
  expect(response.status).toBe(201);
}

describe("setup", () => {
  it("creates the first admin and signs them in, then refuses a second setup", async () => {
    const base = await start();
    const first = await fetch(`${base}/api/auth/setup`, post({ usuario: "admin", password: "clave-segura" }));
    expect(first.status).toBe(201);
    expect(first.headers.get("set-cookie")).toMatch(/HttpOnly/);
    expect(first.headers.get("set-cookie")).toMatch(/SameSite=Lax/);

    const me = await fetch(`${base}/api/auth/me`, { headers: { cookie: cookieOf(first) } });
    expect((await me.json()).user).toMatchObject({ usuario: "admin", rol: "admin" });

    const second = await fetch(`${base}/api/auth/setup`, post({ usuario: "otro", password: "clave-segura" }));
    expect(second.status).toBe(409);
  });

  it("rejects passwords shorter than 8 characters and creates nobody", async () => {
    const base = await start();
    const short = await fetch(`${base}/api/auth/setup`, post({ usuario: "admin", password: "corta" }));
    expect(short.status).toBe(400);
    const status = await fetch(`${base}/api/auth/setup`, post({ usuario: "admin", password: "clave-segura" }));
    expect(status.status).toBe(201);
  });
});

describe("login", () => {
  it("accepts the right password and rejects a wrong one or an unknown user", async () => {
    const base = await start();
    await setupAdmin(base);

    const ok = await fetch(`${base}/api/auth/login`, post({ usuario: "admin", password: "clave-segura" }));
    expect(ok.status).toBe(200);
    expect(cookieOf(ok)).toMatch(/^pqr_session=/);

    const wrong = await fetch(`${base}/api/auth/login`, post({ usuario: "admin", password: "mala-clave" }));
    expect(wrong.status).toBe(401);
    const unknown = await fetch(`${base}/api/auth/login`, post({ usuario: "nadie", password: "clave-segura" }));
    expect(unknown.status).toBe(401);
  });

  it("blocks login after 5 failures in a minute", async () => {
    const base = await start();
    await setupAdmin(base);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await fetch(`${base}/api/auth/login`, post({ usuario: "admin", password: "mala-clave" }));
      expect(failed.status).toBe(401);
    }
    const blocked = await fetch(`${base}/api/auth/login`, post({ usuario: "admin", password: "clave-segura" }));
    expect(blocked.status).toBe(429);
  });

  it("ends the session on logout", async () => {
    const base = await start();
    const cookie = await setupAdmin(base);
    await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { cookie } });
    const me = await fetch(`${base}/api/auth/me`, { headers: { cookie } });
    expect(me.status).toBe(401);
  });
});

describe("gate", () => {
  it("answers 401 to /api and /summary without a session", async () => {
    const base = await start();
    await setupAdmin(base);
    expect((await fetch(`${base}/api/casos`)).status).toBe(401);
    expect((await fetch(`${base}/summary`)).status).toBe(401);
  });

  it("lets a viewer read but not write", async () => {
    const base = await start();
    const adminCookie = await setupAdmin(base);
    await createAccount(base, adminCookie, "visor", "viewer");
    const login = await fetch(`${base}/api/auth/login`, post({ usuario: "visor", password: "clave-segura" }));
    const viewerCookie = cookieOf(login);

    expect((await fetch(`${base}/api/casos`, { headers: { cookie: viewerCookie } })).status).toBe(200);
    const write = await fetch(`${base}/api/casos`, post({ fechaInicial: "2026-01-05" }, viewerCookie));
    expect(write.status).toBe(403);
  });

  it("answers 403 to a non-admin on admin routes", async () => {
    const base = await start();
    const adminCookie = await setupAdmin(base);
    await createAccount(base, adminCookie, "operador", "user");
    const login = await fetch(`${base}/api/auth/login`, post({ usuario: "operador", password: "clave-segura" }));
    const userCookie = cookieOf(login);

    const list = await fetch(`${base}/api/admin/usuarios`, { headers: { cookie: userCookie } });
    expect(list.status).toBe(403);
    const create = await fetch(
      `${base}/api/admin/usuarios`,
      post({ usuario: "intruso", password: "clave-segura", rol: "admin" }, userCookie),
    );
    expect(create.status).toBe(403);
  });

  it("revokes a user's open session when the admin deactivates them", async () => {
    const base = await start();
    const adminCookie = await setupAdmin(base);
    await createAccount(base, adminCookie, "operador", "user");
    const login = await fetch(`${base}/api/auth/login`, post({ usuario: "operador", password: "clave-segura" }));
    const userCookie = cookieOf(login);
    const listed = await (await fetch(`${base}/api/admin/usuarios`, { headers: { cookie: adminCookie } })).json();
    const operador = listed.usuarios.find((user: { usuario: string }) => user.usuario === "operador");

    const deactivated = await fetch(`${base}/api/admin/usuarios/${operador.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ activo: "false" }),
    });
    expect(deactivated.status).toBe(200);
    expect((await fetch(`${base}/api/auth/me`, { headers: { cookie: userCookie } })).status).toBe(401);
  });

  it("stops an admin from deactivating themselves", async () => {
    const base = await start();
    const cookie = await setupAdmin(base);
    const me = await (await fetch(`${base}/api/auth/me`, { headers: { cookie } })).json();
    const response = await fetch(
      `${base}/api/admin/usuarios/${me.user.id}`,
      { method: "PUT", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ activo: "false" }) },
    );
    expect(response.status).toBe(400);
  });
});
