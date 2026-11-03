function eachDate(startIso: string, endIso: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function span(from: string, to: string, holidays: ReadonlySet<string>): number {
  let count = 0;
  for (const iso of eachDate(from, to)) {
    const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
    if (day === 0 || day === 6) continue;
    if (holidays.has(iso)) continue;
    count += 1;
  }
  return count;
}

export function businessDays(
  startIso: string,
  endIso: string,
  holidays: readonly string[],
): number {
  const set = new Set(holidays);
  const raw = startIso <= endIso ? span(startIso, endIso, set) : -span(endIso, startIso, set);
  return raw < -5 ? 0 : raw;
}

/** Último día dentro de plazo: el día hábil número `count`, contando el día de inicio como en businessDays. */
export function dueDate(startIso: string, count: number, holidays: readonly string[]): string {
  const set = new Set(holidays);
  const cursor = new Date(`${startIso}T00:00:00Z`);
  let counted = 0;
  for (;;) {
    const iso = cursor.toISOString().slice(0, 10);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6 && !set.has(iso)) counted += 1;
    if (counted >= count) return iso;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}
