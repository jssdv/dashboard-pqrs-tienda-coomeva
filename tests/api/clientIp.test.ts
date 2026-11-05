import type { IncomingMessage } from "node:http";
import { afterEach, expect, it } from "vitest";
import { clientIp } from "../../src/api/summaryServer.js";

const req = (headers: Record<string, string>, remote = "127.0.0.1") =>
  ({ headers, socket: { remoteAddress: remote } }) as unknown as IncomingMessage;

afterEach(() => {
  delete process.env.PQR_PROXY;
});

it("ignores forwarding headers unless PQR_PROXY=1 (no spoofing the login limit)", () => {
  expect(clientIp(req({ "cf-connecting-ip": "203.0.113.9" }))).toBe("127.0.0.1");
});

it("reads the real visitor behind a tunnel when PQR_PROXY=1", () => {
  process.env.PQR_PROXY = "1";
  expect(clientIp(req({ "cf-connecting-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  expect(clientIp(req({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" }))).toBe("198.51.100.4");
  expect(clientIp(req({}, "10.0.0.7"))).toBe("10.0.0.7");
});
