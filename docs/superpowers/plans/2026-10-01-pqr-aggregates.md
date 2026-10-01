# PQR Dashboard Aggregates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure `summarize(cases: PqrCase[])` that returns dashboard totals, catalog buckets, year and month counts, and the average solution days.

**Architecture:** Aggregates live in the domain layer and never open SQLite, HTTP, or a UI. Callers pass the in-memory array already returned by `CaseRepository.list()`. Null catalog values become the key `"(sin valor)"`. Month buckets use `YYYY-MM` from a valid `fechaInicial` only.

**Tech Stack:** Node.js 20+, TypeScript 5, Vitest.

## Global Constraints

- `summarize` is a pure function over `PqrCase[]`. No SQLite, no HTTP, no UI.
- Contract is exactly `CountBucket`, `DashboardSummary`, and `summarize(cases: PqrCase[])`.
- `abiertos` = `fechaSolucion === null`. `cerrados` = `total - abiertos`.
- `fechasInvalidas` counts a case when `fechaInicialInvalida` or `fechaSolucionInvalida` is true.
- Catalog buckets (`porArea`, `porFuente`, `porTipo`, `porTema`) use the official text. `null` becomes `"(sin valor)"`. Sort by count descending, then key ascending.
- `porAnio` key is `String(sheetYear)`, years ascending.
- `porMes` is `YYYY-MM` from valid `fechaInicial` only (skip `null` or `fechaInicialInvalida`), months ascending.
- `dias` counts a case only when both date-invalid flags are false and `diasSolucion !== null`. `promedio` is the exact arithmetic mean, or `null` when `casos === 0`.
- Work on branch `feature/pqr-core`. One commit per task. Do not push.

---

## File structure

| File | Responsibility |
|---|---|
| `src/domain/summary.ts` | `CountBucket`, `DashboardSummary`, `summarize` |
| `tests/domain/summary.test.ts` | Unit tests for totals, catalogs, months, and days |
| `README.md` | One line under “Qué ya está”; drop item 1 of “Qué sigue” |

---

### Task 1: Totals

**Files:**
- Create: `src/domain/summary.ts`
- Create: `tests/domain/summary.test.ts`

**Interfaces:**
- Consumes: `PqrCase` from `src/domain/types.ts`
- Produces: `summarize(cases: PqrCase[]): DashboardSummary` with `total`, `abiertos`, `cerrados`, `fechasInvalidas`. Other fields may be empty arrays or `{ casos: 0, promedio: null }` until later tasks.

- [x] **Step 1: Write the failing test**

`tests/domain/summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarize } from "../../src/domain/summary";
import type { PqrCase } from "../../src/domain/types";

function caso(over: Partial<PqrCase> & Pick<PqrCase, "id" | "sheetYear" | "rowNumber">): PqrCase {
  return {
    fechaInicial: "2026-01-05",
    fechaSolucion: "2026-01-06",
    fechaInicialInvalida: false,
    fechaSolucionInvalida: false,
    diasSolucion: 1,
    area: "Coomeva Recreacion",
    areaOriginal: "Coomeva Recreacion",
    idOrden: null,
    asociado: null,
    correo: null,
    fuente: "Correo Tienda",
    fuenteOriginal: "Correo Tienda",
    tipo: "RECLAMO",
    tipoOriginal: "RECLAMO",
    tema: "BOLETERIA",
    temaOriginal: "BOLETERIA",
    motivo: null,
    solucion: null,
    valorDevolucion: null,
    mesCompra: null,
    tipoDevolucion: null,
    fechaSolicitud: null,
    observaciones: null,
    ...over,
  };
}

describe("summarize totals", () => {
  it("returns zeros and a null average for an empty list", () => {
    const summary = summarize([]);
    expect(summary.total).toBe(0);
    expect(summary.abiertos).toBe(0);
    expect(summary.cerrados).toBe(0);
    expect(summary.fechasInvalidas).toBe(0);
    expect(summary.dias).toEqual({ casos: 0, promedio: null });
  });

  it("counts open, closed, and invalid dates", () => {
    const cases = [
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, fechaSolucion: null, diasSolucion: null }),
      caso({ id: "2026-3", sheetYear: 2026, rowNumber: 3 }),
      caso({
        id: "2025-4",
        sheetYear: 2025,
        rowNumber: 4,
        fechaInicialInvalida: true,
        fechaSolucion: null,
        diasSolucion: null,
      }),
    ];
    const summary = summarize(cases);
    expect(summary.total).toBe(3);
    expect(summary.abiertos).toBe(2);
    expect(summary.cerrados).toBe(1);
    expect(summary.fechasInvalidas).toBe(1);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/summary.test.ts`
Expected: FAIL, cannot resolve `src/domain/summary`.

- [x] **Step 3: Write minimal implementation**

`src/domain/summary.ts`:

```ts
import type { PqrCase } from "./types.js";

export interface CountBucket {
  key: string;
  count: number;
}

export interface DashboardSummary {
  total: number;
  abiertos: number;
  cerrados: number;
  fechasInvalidas: number;
  porAnio: CountBucket[];
  porArea: CountBucket[];
  porFuente: CountBucket[];
  porTipo: CountBucket[];
  porTema: CountBucket[];
  porMes: CountBucket[];
  dias: { casos: number; promedio: number | null };
}

const emptyBuckets = {
  porAnio: [] as CountBucket[],
  porArea: [] as CountBucket[],
  porFuente: [] as CountBucket[],
  porTipo: [] as CountBucket[],
  porTema: [] as CountBucket[],
  porMes: [] as CountBucket[],
  dias: { casos: 0, promedio: null as number | null },
};

export function summarize(cases: PqrCase[]): DashboardSummary {
  const total = cases.length;
  const abiertos = cases.filter((row) => row.fechaSolucion === null).length;
  const fechasInvalidas = cases.filter(
    (row) => row.fechaInicialInvalida || row.fechaSolucionInvalida,
  ).length;
  return {
    total,
    abiertos,
    cerrados: total - abiertos,
    fechasInvalidas,
    ...emptyBuckets,
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/summary.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add tests/domain/summary.test.ts src/domain/summary.ts docs/superpowers/plans/2026-10-01-pqr-aggregates.md
git commit -m "$(cat <<'EOF'
feat: count open, closed, and invalid PQR dates

EOF
)"
```

---

### Task 2: Catalog buckets and porAnio

**Files:**
- Modify: `src/domain/summary.ts`
- Modify: `tests/domain/summary.test.ts`

**Interfaces:**
- Consumes: `summarize` from Task 1
- Produces: filled `porArea`, `porFuente`, `porTipo`, `porTema`, `porAnio`

- [x] **Step 1: Write the failing test**

Append to `tests/domain/summary.test.ts` (keep the `caso` helper from Task 1):

```ts
describe("summarize catalogs and years", () => {
  it("buckets official text, labels nulls, and sorts years ascending", () => {
    const cases = [
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, tema: null, area: "B" }),
      caso({ id: "2026-3", sheetYear: 2026, rowNumber: 3, tema: "BOLETERIA", area: "A" }),
      caso({ id: "2025-4", sheetYear: 2025, rowNumber: 4, tema: "BOLETERIA", area: "A", fuente: null }),
    ];
    const summary = summarize(cases);
    expect(summary.porTema).toEqual([
      { key: "BOLETERIA", count: 2 },
      { key: "(sin valor)", count: 1 },
    ]);
    expect(summary.porArea).toEqual([
      { key: "A", count: 2 },
      { key: "B", count: 1 },
    ]);
    expect(summary.porFuente).toEqual([
      { key: "Correo Tienda", count: 2 },
      { key: "(sin valor)", count: 1 },
    ]);
    expect(summary.porTipo).toEqual([{ key: "RECLAMO", count: 3 }]);
    expect(summary.porAnio).toEqual([
      { key: "2025", count: 1 },
      { key: "2026", count: 2 },
    ]);
  });

  it("breaks catalog ties by key ascending", () => {
    const cases = [
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, tipo: "Z" }),
      caso({ id: "2026-3", sheetYear: 2026, rowNumber: 3, tipo: "A" }),
    ];
    expect(summarize(cases).porTipo).toEqual([
      { key: "A", count: 1 },
      { key: "Z", count: 1 },
    ]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/summary.test.ts`
Expected: FAIL, `porTema` / `porAnio` are empty arrays.

- [x] **Step 3: Write minimal implementation**

Replace `src/domain/summary.ts` with:

```ts
import type { CatalogField, PqrCase } from "./types.js";

export interface CountBucket {
  key: string;
  count: number;
}

export interface DashboardSummary {
  total: number;
  abiertos: number;
  cerrados: number;
  fechasInvalidas: number;
  porAnio: CountBucket[];
  porArea: CountBucket[];
  porFuente: CountBucket[];
  porTipo: CountBucket[];
  porTema: CountBucket[];
  porMes: CountBucket[];
  dias: { casos: number; promedio: number | null };
}

const SIN_VALOR = "(sin valor)";

function catalogBuckets(cases: PqrCase[], field: CatalogField): CountBucket[] {
  const counts = new Map<string, number>();
  for (const row of cases) {
    const raw = row[field];
    const key = raw === null ? SIN_VALOR : raw;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function summarize(cases: PqrCase[]): DashboardSummary {
  const total = cases.length;
  const abiertos = cases.filter((row) => row.fechaSolucion === null).length;
  const fechasInvalidas = cases.filter(
    (row) => row.fechaInicialInvalida || row.fechaSolucionInvalida,
  ).length;

  const years = new Map<number, number>();
  for (const row of cases) {
    years.set(row.sheetYear, (years.get(row.sheetYear) ?? 0) + 1);
  }
  const porAnio = [...years.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ key: String(year), count }));

  return {
    total,
    abiertos,
    cerrados: total - abiertos,
    fechasInvalidas,
    porAnio,
    porArea: catalogBuckets(cases, "area"),
    porFuente: catalogBuckets(cases, "fuente"),
    porTipo: catalogBuckets(cases, "tipo"),
    porTema: catalogBuckets(cases, "tema"),
    porMes: [],
    dias: { casos: 0, promedio: null },
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/summary.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add tests/domain/summary.test.ts src/domain/summary.ts docs/superpowers/plans/2026-10-01-pqr-aggregates.md
git commit -m "$(cat <<'EOF'
feat: bucket PQR catalogs and sheet years

EOF
)"
```

---

### Task 3: porMes and average days

**Files:**
- Modify: `src/domain/summary.ts`
- Modify: `tests/domain/summary.test.ts`

**Interfaces:**
- Consumes: `summarize` from Task 2
- Produces: `porMes` and `dias.casos` / `dias.promedio`

- [ ] **Step 1: Write the failing test**

Append:

```ts
describe("summarize months and days", () => {
  it("groups valid start months ascending and ignores invalid or null starts", () => {
    const cases = [
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, fechaInicial: "2026-03-01" }),
      caso({ id: "2026-3", sheetYear: 2026, rowNumber: 3, fechaInicial: "2026-01-15" }),
      caso({ id: "2026-4", sheetYear: 2026, rowNumber: 4, fechaInicial: "2026-01-20" }),
      caso({
        id: "2026-5",
        sheetYear: 2026,
        rowNumber: 5,
        fechaInicial: "1999-01-01",
        fechaInicialInvalida: true,
      }),
      caso({ id: "2026-6", sheetYear: 2026, rowNumber: 6, fechaInicial: null }),
    ];
    expect(summarize(cases).porMes).toEqual([
      { key: "2026-01", count: 2 },
      { key: "2026-03", count: 1 },
    ]);
  });

  it("averages days only when both dates are valid and diasSolucion is set", () => {
    const cases = [
      caso({ id: "2026-2", sheetYear: 2026, rowNumber: 2, diasSolucion: 1 }),
      caso({ id: "2026-3", sheetYear: 2026, rowNumber: 3, diasSolucion: 3 }),
      caso({
        id: "2026-4",
        sheetYear: 2026,
        rowNumber: 4,
        fechaSolucionInvalida: true,
        diasSolucion: 9,
      }),
      caso({ id: "2026-5", sheetYear: 2026, rowNumber: 5, diasSolucion: null }),
    ];
    expect(summarize(cases).dias).toEqual({ casos: 2, promedio: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/summary.test.ts`
Expected: FAIL, `porMes` is `[]` and `dias.casos` is `0`.

- [ ] **Step 3: Write minimal implementation**

In `summarize`, replace the `porMes: []` and `dias: { casos: 0, promedio: null }` return fields with computed values. Add this block before the `return`:

```ts
  const months = new Map<string, number>();
  for (const row of cases) {
    if (row.fechaInicial === null || row.fechaInicialInvalida) continue;
    const month = row.fechaInicial.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  const porMes = [...months.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));

  const withDays = cases.filter(
    (row) =>
      !row.fechaInicialInvalida && !row.fechaSolucionInvalida && row.diasSolucion !== null,
  );
  const casos = withDays.length;
  const promedio =
    casos === 0
      ? null
      : withDays.reduce((sum, row) => sum + (row.diasSolucion as number), 0) / casos;
```

And return `porMes` and `dias: { casos, promedio }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/summary.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/domain/summary.test.ts src/domain/summary.ts docs/superpowers/plans/2026-10-01-pqr-aggregates.md
git commit -m "$(cat <<'EOF'
feat: summarize PQR months and average solution days

EOF
)"
```

---

### Task 4: README status

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `summarize` from Task 3
- Produces: README status text only

- [ ] **Step 1: Update Qué ya está and Qué sigue**

Under `## Qué ya está`, add this bullet after the CLI line:

```md
- Resumen de agregados (`summarize`) sobre los casos ya importados: totales, catálogos, año, mes y días promedio.
```

Under `## Qué sigue`, remove the line `1. Consultas de agregados para el dashboard.` and renumber:

```md
## Qué sigue

1. API que alimente esas consultas.
2. Interfaz web.
```

- [ ] **Step 2: Commit**

```bash
git add README.md docs/superpowers/plans/2026-10-01-pqr-aggregates.md
git commit -m "$(cat <<'EOF'
docs: note PQR aggregate summary in the README

EOF
)"
```

---

## Self-review

- Totals, catalog order, year order, month filter, and day average each have a task and a test.
- No SQLite, HTTP, or UI.
- Signatures stay `CountBucket`, `DashboardSummary`, `summarize(cases: PqrCase[])` in every task.
