import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("serveSummary", () => {
  it("exits 1 when the database path is missing", () => {
    const result = spawnSync("npx", ["tsx", "src/cli/serveSummary.ts"], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("usage: serveSummary <db.sqlite>");
  });
});
