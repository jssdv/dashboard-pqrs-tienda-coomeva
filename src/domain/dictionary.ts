import { lookupKey } from "./normalize.js";
import type { CatalogField } from "./types.js";

const FIELDS = new Set<CatalogField>(["area", "fuente", "tipo", "tema"]);

export class Dictionary {
  constructor(private readonly entries: Map<string, string>) {}

  official(field: CatalogField, original: string): string {
    const hit = this.entries.get(`${field}:${lookupKey(original)}`);
    if (hit !== undefined) return hit;
    return original.trim().replace(/\s+/g, " ");
  }
}

export function parseDictionary(csv: string): Dictionary {
  const entries = new Map<string, string>();
  const lines = csv.split(/\r?\n/);
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const [field, from, to] = line.split(",");
    if (!FIELDS.has(field as CatalogField)) {
      throw new Error(`Invalid dictionary field on line ${i + 1}: ${line}`);
    }
    entries.set(`${field}:${lookupKey(from)}`, to);
  }
  return new Dictionary(entries);
}
