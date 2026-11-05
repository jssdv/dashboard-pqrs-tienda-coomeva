import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createTunnel, parseTunnelUrl } from "../../src/share/tunnel.js";

it("finds the public https address in cloudflared output", () => {
  expect(parseTunnelUrl("INF +--  https://abc-123.trycloudflare.com  ")).toBe("https://abc-123.trycloudflare.com");
  expect(parseTunnelUrl("INF connecting to edge")).toBeNull();
});

it("refuses to start when this copy has no cloudflared", () => {
  const tunnel = createTunnel(null, () => {});
  expect(tunnel.status()).toMatchObject({ estado: "apagado", disponible: false });
  expect(() => tunnel.start(3000)).toThrow(/no incluye/);
});

it.skipIf(process.platform === "win32")("starts, reports the URL, and stops a fake cloudflared", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "tunnel-"));
  const fake = path.join(dir, "cloudflared");
  writeFileSync(fake, "#!/bin/sh\necho 'INF https://fake-test.trycloudflare.com' >&2\nsleep 30\n");
  chmodSync(fake, 0o755);
  const seen: Array<string | null> = [];
  let onActive = () => {};
  const active = new Promise<void>((resolve) => (onActive = resolve));
  const tunnel = createTunnel(fake, (url) => {
    seen.push(url);
    if (url) onActive();
  });
  tunnel.start(3000);
  await active;
  expect(tunnel.status()).toMatchObject({ estado: "activo", url: "https://fake-test.trycloudflare.com" });
  tunnel.stop();
  expect(tunnel.status()).toMatchObject({ estado: "apagado", url: null });
  expect(seen).toEqual(["https://fake-test.trycloudflare.com", null]);
});
