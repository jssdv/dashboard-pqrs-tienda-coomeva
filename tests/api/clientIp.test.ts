import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { clientIp } from "../../src/api/summaryServer.js";

const req = (headers: Record<string, string>, remote: string) =>
  ({ headers, socket: { remoteAddress: remote } }) as unknown as IncomingMessage;

it("takes the real visitor from cf-connecting-ip only when the connection comes from loopback (the tunnel)", () => {
  expect(clientIp(req({ "cf-connecting-ip": "203.0.113.9" }, "127.0.0.1"))).toBe("203.0.113.9");
  expect(clientIp(req({ "cf-connecting-ip": "203.0.113.9" }, "::ffff:127.0.0.1"))).toBe("203.0.113.9");
});

it("ignores the header from the LAN, so it cannot be spoofed to dodge the login limit", () => {
  expect(clientIp(req({ "cf-connecting-ip": "203.0.113.9" }, "192.168.1.20"))).toBe("192.168.1.20");
  expect(clientIp(req({}, "10.0.0.7"))).toBe("10.0.0.7");
});
