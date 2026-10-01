import type { Dictionary } from "../domain/dictionary.js";
import { mapHeaders } from "../domain/headers.js";
import type { PqrCase, RawRow } from "../domain/types.js";
import { mapRow } from "./mapRow.js";

export function importCases(input: {
  rows: RawRow[];
  holidays: readonly string[];
  dictionary: Dictionary;
}): { cases: PqrCase[]; skipped: number; invalidDates: number } {
  const labels = Object.keys(input.rows.find((row) => Object.keys(row.cells).length > 0)?.cells ?? {});
  const headers = mapHeaders(labels);
  const cases: PqrCase[] = [];
  let skipped = 0;
  for (const row of input.rows) {
    const mapped = mapRow(row, headers, input.dictionary, input.holidays);
    if (!mapped) {
      skipped += 1;
      continue;
    }
    cases.push(mapped);
  }
  return {
    cases,
    skipped,
    invalidDates: cases.filter((row) => row.fechaInicialInvalida).length,
  };
}
