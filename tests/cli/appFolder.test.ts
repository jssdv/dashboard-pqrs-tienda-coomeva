import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appFolder, ensureDataDir, ensureDefaultCsvs } from "../../src/cli/appFolder.js";

describe("appFolder helpers", () => {
  it("resolves to the project root in dev", () => {
    expect(existsSync(join(appFolder(), "package.json"))).toBe(true);
  });

  it("fails with a readable message when data/ cannot be created", () => {
    const blocker = join(mkdtempSync(join(tmpdir(), "pqr-")), "file");
    writeFileSync(blocker, "");
    expect(() => ensureDataDir(join(blocker, "data"))).toThrow(/No se puede escribir/);
  });

  it("never overwrites an existing csv", () => {
    const dir = mkdtempSync(join(tmpdir(), "pqr-"));
    writeFileSync(join(dir, "dictionary.csv"), "mine");
    writeFileSync(join(dir, "holidays.csv"), "date\n");
    ensureDefaultCsvs(dir);
    expect(readFileSync(join(dir, "dictionary.csv"), "utf8")).toBe("mine");
  });

  it("throws in dev when a csv is missing and there is no embedded default", () => {
    expect(() => ensureDefaultCsvs(mkdtempSync(join(tmpdir(), "pqr-")))).toThrow(/Falta el archivo/);
  });
});
