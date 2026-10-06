import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
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
  return FILES.filter((path) => !allow.some((rule) => rule.test(relative(ROOT, path)))).flatMap((path) => {
    const text = readFileSync(path, "utf8");
    return pattern.test(text) ? [relative(ROOT, path)] : [];
  });
}

describe("editorial style rules", () => {
  it("has no pill or large rounded shapes", () => {
    expect(offenders(/rounded-(full|2xl|3xl|xl)\b|rounded-[lr]-full/)).toEqual([]);
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

  it("uses no library icons in the controls migrated so far", () => {
    const migrated = [
      /ui\/Select\.tsx$/,
      /ui\/Combobox\.tsx$/,
      /ui\/ThemeToggle\.tsx$/,
      /ui\/FormDialog\.tsx$/,
      /ui\/sheet\.tsx$/,
      /Shell\.tsx$/,
      /CommandPalette\.tsx$/,
      /Resumen\.tsx$/,
      /ui\/StatCard\.tsx$/,
    ];
    const hits = FILES.filter((path) => migrated.some((rule) => rule.test(path))).filter((path) =>
      /lucide-react/.test(readFileSync(path, "utf8")),
    );
    expect(hits.map((path) => relative(ROOT, path))).toEqual([]);
  });
});
