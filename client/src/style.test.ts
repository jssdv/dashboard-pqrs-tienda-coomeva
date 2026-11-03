import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

const FILES = [...sources(join(ROOT, "client/src")), ...sources(join(ROOT, "src/components/ui"))].filter(
  (path) => !path.endsWith("style.test.ts"),
);

function offenders(pattern: RegExp, allow: RegExp[] = []): string[] {
  // Normalize to "/" so the allow-list regexes also match on Windows.
  const rel = (path: string) => relative(ROOT, path).split(sep).join("/");
  return FILES.filter((path) => !allow.some((rule) => rule.test(rel(path)))).flatMap((path) => {
    const text = readFileSync(path, "utf8");
    return pattern.test(text) ? [rel(path)] : [];
  });
}

describe("editorial style rules", () => {
  it("has no pill or large rounded shapes", () => {
    expect(offenders(/rounded-(full|2xl|3xl|xl)\b|rounded-[lr]-full/)).toEqual([]);
  });

  it("has no bare `rounded` (4 px) either", () => {
    expect(offenders(/["'` ]rounded(?=["'` ])/)).toEqual([]);
  });

  it("has no soft shadows on controls or cards", () => {
    expect(offenders(/\bshadow-(xs|sm)\b/)).toEqual([]);
  });

  it("limits heavier shadows to floating surfaces", () => {
    const floating = [
      /ui\/options\.ts$/,
      /ui\/FormDialog\.tsx$/,
      /CommandPalette\.tsx$/,
      /ui\/tooltip\.tsx$/,
      /ui\/sheet\.tsx$/,
      /charts\.tsx$/,
    ];
    expect(offenders(/\bshadow-(md|lg|xl|2xl)\b/, floating)).toEqual([]);
  });

  it("has no blur, radial glow or soft focus halo", () => {
    expect(offenders(/backdrop-blur/)).toEqual([]);
    expect(offenders(/app-canvas/)).toEqual([]);
    expect(offenders(/ring-\[3px\]/)).toEqual([]);
  });

  it("imports no icon library anywhere", () => {
    expect(offenders(/lucide-react|@untitledui\/icons/)).toEqual([]);
  });

  it("does not depend on lucide-react", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies)).not.toContain("lucide-react");
  });
});
