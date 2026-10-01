export function lookupKey(value: string): string {
  const withoutMarks = value.normalize("NFD").replace(/\p{M}/gu, "");
  return withoutMarks.trim().replace(/\s+/g, " ").toUpperCase();
}
