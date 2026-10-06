import { expect, it } from "vitest";
import { deltaPct, tasaCierre } from "./metrics";

it("deltaPct is the percent change against the previous value", () => {
  expect(deltaPct(12, 10)).toBe(20);
  expect(deltaPct(5, 10)).toBe(-50);
  expect(deltaPct(10, 10)).toBe(0);
});

it("deltaPct is null when the previous value is 0 or a value is missing", () => {
  expect(deltaPct(5, 0)).toBeNull();
  expect(deltaPct(0, 0)).toBeNull();
  expect(deltaPct(null, 4)).toBeNull();
  expect(deltaPct(4, null)).toBeNull();
});

it("tasaCierre is cerrados over entrados, null without entrados", () => {
  expect(tasaCierre({ entrados: 12, cerrados: 9 })).toBe(0.75);
  expect(tasaCierre({ entrados: 0, cerrados: 3 })).toBeNull();
});
