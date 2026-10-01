const MIN_YEAR = 2024;
const MAX_YEAR = 2100;

export function excelSerialToIso(serial: number): string {
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  return new Date(utc).toISOString().slice(0, 10);
}

export function parseDateCell(
  value: string | number | Date | null,
): { iso: string | null; invalid: boolean } {
  if (value === null || value === "") return { iso: null, invalid: false };
  let iso: string | null = null;
  if (typeof value === "number" && Number.isFinite(value)) iso = excelSerialToIso(value);
  else if (value instanceof Date && !Number.isNaN(value.getTime())) {
    iso = value.toISOString().slice(0, 10);
  } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    iso = value.trim();
  }
  if (!iso) return { iso: null, invalid: true };
  const year = Number(iso.slice(0, 4));
  if (year < MIN_YEAR || year > MAX_YEAR) return { iso: null, invalid: true };
  return { iso, invalid: false };
}
