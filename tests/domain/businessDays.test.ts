import { describe, expect, it } from "vitest";
import { businessDays } from "../../src/domain/businessDays";

describe("businessDays", () => {
  it("counts Mon 2026-01-05 through Mon 2026-01-05 as 1", () => {
    expect(businessDays("2026-01-05", "2026-01-05", [])).toBe(1);
  });

  it("skips the weekend between Fri 2026-01-02 and Mon 2026-01-05", () => {
    expect(businessDays("2026-01-02", "2026-01-05", [])).toBe(2);
  });

  it("excludes a holiday", () => {
    expect(businessDays("2026-01-05", "2026-01-06", ["2026-01-06"])).toBe(1);
  });

  it("turns a large negative span into 0", () => {
    expect(businessDays("2026-01-20", "2026-01-05", [])).toBe(0);
  });
});
