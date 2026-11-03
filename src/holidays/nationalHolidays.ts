import type { Dictionary } from "../domain/dictionary.js";
import type { RawRow } from "../domain/types.js";
import { importCases } from "../import/importCases.js";
import type { CaseRepository } from "../store/repository.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function holidayDates(body: unknown): string[] {
  if (body === null || typeof body !== "object" || !Array.isArray((body as { holidays?: unknown }).holidays)) {
    throw new Error("holiday response has no holidays array");
  }
  const dates = new Set<string>();
  for (const item of (body as { holidays: unknown[] }).holidays) {
    if (item === null || typeof item !== "object") continue;
    const date = (item as { date?: unknown }).date;
    if (typeof date === "string" && DATE.test(date)) dates.add(date);
  }
  return [...dates].sort();
}

export function parseHolidayCsv(text: string): string[] {
  const dates = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.toLowerCase() === "date") continue;
    if (!DATE.test(line)) throw new Error(`invalid holiday date: ${line}`);
    dates.add(line);
  }
  return [...dates].sort();
}

export function yearsToLoad(sheetYears: readonly number[]): number[] {
  if (sheetYears.length === 0) return [];
  const min = Math.min(...sheetYears);
  const max = Math.max(...sheetYears);
  const years: number[] = [];
  for (let year = min - 1; year <= max + 1; year += 1) years.push(year);
  return years;
}

export async function loadNationalHolidays(
  years: readonly number[],
  fetchImpl: typeof fetch,
  onMissing?: (year: number) => void,
): Promise<string[]> {
  const dates = new Set<string>();
  const unique = [...new Set(years)].sort((a, b) => a - b);
  for (const year of unique) {
    const response = await fetchImpl(
      `https://calendariosnacionales.com/co/v1/${year}/nacionales.json`,
      { headers: { "User-Agent": "pqr-core" } },
    );
    if (response.status === 404) {
      onMissing?.(year);
      continue;
    }
    if (!response.ok) {
      throw new Error(`holiday request failed for ${year}: ${response.status}`);
    }
    for (const date of holidayDates(await response.json())) dates.add(date);
  }
  if (unique.length > 0 && dates.size === 0) {
    throw new Error(`no holidays available for ${unique.join(", ")}`);
  }
  return [...dates].sort();
}

export async function importLoadedCases(input: {
  rows: RawRow[];
  dictionary: Dictionary;
  repository: CaseRepository;
  fetchImpl: typeof fetch;
  onMissingYear?: (year: number) => void;
  extraHolidays?: readonly string[];
}): Promise<{ imported: number; skipped: number; invalidDates: number; holidays: number }> {
  const extra = input.extraHolidays ?? [];
  const covered = new Set(extra.map((date) => Number(date.slice(0, 4))));
  const fetched = await loadNationalHolidays(
    yearsToLoad(input.rows.map((row) => row.sheetYear)).filter((year) => !covered.has(year)),
    input.fetchImpl,
    input.onMissingYear,
  );
  const holidays = [...new Set([...extra, ...fetched])].sort();
  const result = importCases({ rows: input.rows, holidays, dictionary: input.dictionary });
  input.repository.replaceAll(result.cases);
  input.repository.addHolidays(holidays);
  return {
    imported: result.cases.length,
    skipped: result.skipped,
    invalidDates: result.invalidDates,
    holidays: holidays.length,
  };
}

export async function ensureHolidayYears(
  repository: CaseRepository,
  years: readonly number[],
  fetchImpl: typeof fetch,
): Promise<void> {
  const present = new Set(repository.listHolidays().map((date) => date.slice(0, 4)));
  const missing = [...new Set(years)]
    .filter((year) => !present.has(String(year)))
    .sort((a, b) => a - b);
  if (missing.length === 0) return;
  const dates = await loadNationalHolidays(missing, fetchImpl);
  repository.addHolidays(dates);
  const loaded = new Set(repository.listHolidays().map((date) => date.slice(0, 4)));
  for (const year of missing) {
    if (!loaded.has(String(year))) throw new Error(`no holidays loaded for ${year}`);
  }
}
