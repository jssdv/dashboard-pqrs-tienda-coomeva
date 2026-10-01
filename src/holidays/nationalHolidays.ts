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
): Promise<string[]> {
  const dates = new Set<string>();
  for (const year of [...new Set(years)].sort((a, b) => a - b)) {
    const response = await fetchImpl(
      `https://calendariosnacionales.com/co/v1/${year}/nacionales.json`,
      { headers: { "User-Agent": "pqr-core" } },
    );
    if (!response.ok) {
      throw new Error(`holiday request failed for ${year}: ${response.status}`);
    }
    for (const date of holidayDates(await response.json())) dates.add(date);
  }
  return [...dates].sort();
}

export async function importLoadedCases(input: {
  rows: RawRow[];
  dictionary: Dictionary;
  dbPath: string;
  fetchImpl: typeof fetch;
  openRepository: (dbPath: string) => CaseRepository;
}): Promise<{ imported: number; skipped: number; invalidDates: number; holidays: number }> {
  const holidays = await loadNationalHolidays(
    yearsToLoad(input.rows.map((row) => row.sheetYear)),
    input.fetchImpl,
  );
  const result = importCases({ rows: input.rows, holidays, dictionary: input.dictionary });
  input.openRepository(input.dbPath).replaceAll(result.cases);
  return {
    imported: result.cases.length,
    skipped: result.skipped,
    invalidDates: result.invalidDates,
    holidays: holidays.length,
  };
}
