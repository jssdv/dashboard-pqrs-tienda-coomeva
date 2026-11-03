import { expect, it } from "vitest";
import { matchesSearch } from "./matchesSearch";

const row = (over: { idOrden?: string | null; asociado?: string | null; correo?: string | null } = {}) => ({
  idOrden: null,
  asociado: null,
  correo: null,
  ...over,
});

it("matches a partial name or email and ignores case and accents", () => {
  expect(matchesSearch(row({ asociado: "Ana María" }), "ana")).toBe(true);
  expect(matchesSearch(row({ correo: "ana@coomeva.com.co" }), "ANA")).toBe(true);
  expect(matchesSearch(row({ asociado: "Boletería" }), "boleteria")).toBe(true);
  expect(matchesSearch(row({ asociado: "Luis" }), "ana")).toBe(false);
});

it("matches a partial order id", () => {
  expect(matchesSearch(row({ idOrden: "ORD-1234" }), "123")).toBe(true);
  expect(matchesSearch(row({ idOrden: "ORD-99" }), "123")).toBe(false);
});

it("does not match empty fields, other columns, or a blank query", () => {
  expect(matchesSearch(row({ idOrden: "ORD-1" }), "   ")).toBe(true);
  expect(matchesSearch(row(), "ana")).toBe(false);
  expect(matchesSearch(row({ idOrden: null, asociado: "", correo: "  " }), "ana")).toBe(false);
});
