function searchKey(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toUpperCase();
}

export function matchesSearch(
  row: { idOrden: string | null; asociado: string | null; correo: string | null },
  q: string,
): boolean {
  const needle = searchKey(q);
  if (!needle) return true;
  return [row.idOrden, row.asociado, row.correo].some((value) => {
    const haystack = value ? searchKey(value) : "";
    return haystack.length > 0 && haystack.includes(needle);
  });
}
