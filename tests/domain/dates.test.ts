import { describe, expect, it } from "vitest";
import { excelSerialToIso, parseDateCell } from "../../src/domain/dates";

describe("dates", () => {
  it("converts the known holiday serial", () => {
    expect(excelSerialToIso(45658)).toBe("2025-01-01");
  });

  it("flags 2024 junk serials and accepts a real 2026 date", () => {
    expect(parseDateCell(678)).toEqual({ iso: null, invalid: true });
    expect(parseDateCell(46027)).toEqual({ iso: "2026-01-05", invalid: false });
    expect(parseDateCell(null)).toEqual({ iso: null, invalid: false });
    expect(parseDateCell("")).toEqual({ iso: null, invalid: false });
  });
});
