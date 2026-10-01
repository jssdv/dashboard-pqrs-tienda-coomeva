# PQR National Holidays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Load Colombian national holidays during workbook import and pass those ISO dates into the existing business-day calculation.

**Architecture:** `holidayDates` parses one API body. `yearsToLoad` expands sheet years by one year on each side. `loadNationalHolidays` fetches each year with an injected `fetch`. `importLoadedCases` loads holidays before it opens SQLite, then calls `importCases`. The CLI does not read the Excel `Festivos` sheet.

**Tech Stack:** Node.js 20+, TypeScript 5, Vitest, global `fetch`. No new dependencies.

## Global Constraints

- Endpoint: `https://calendariosnacionales.com/co/v1/${year}/nacionales.json`.
- Request header: `User-Agent: pqr-core`.
- Keep only `holidays[].date` values matching `YYYY-MM-DD`. Drop duplicates and sort.
- A non-200 response or a body without a `holidays` array throws. The CLI exits 1 and does not call `openSqliteRepository`.
- Years requested are every `sheetYear`, plus the year before the minimum and the year after the maximum.
- Tests use a fake `fetch`. No test calls the network.
- Do not change the summary page, `GET /summary`, or `businessDays` weekend rules.
- Work on branch `feature/pqr-core`. One commit per task. Do not push.

---

## File structure

| File | Responsibility |
|---|---|
| `src/holidays/nationalHolidays.ts` | `holidayDates`, `yearsToLoad`, `loadNationalHolidays`, `importLoadedCases` |
| `tests/holidays/nationalHolidays.test.ts` | Parse, fetch, and failed-import tests |
| `src/cli/importWorkbook.ts` | Call `importLoadedCases` and print `holidays` |
| `README.md` | Import now calls the holiday API |

---

### Task 1: Parse holiday dates

**Files:**
- Create: `src/holidays/nationalHolidays.ts`
- Test: `tests/holidays/nationalHolidays.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `holidayDates(body: unknown): string[]`

- [x] **Step 1: Write the failing test**

A body with `2026-01-12`, `2026-01-01`, and a repeated `2026-01-01` returns `["2026-01-01","2026-01-12"]`. `{ year: 2026 }` throws an error matching `/holidays/`.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/holidays/nationalHolidays.test.ts`

Expected: FAIL because `holidayDates` is not defined.

- [x] **Step 3: Write minimal implementation**

Throw when `body.holidays` is not an array. Keep strings matching `/^\d{4}-\d{2}-\d{2}$/`, dedupe, and sort.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/holidays/nationalHolidays.test.ts`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/holidays/nationalHolidays.ts tests/holidays/nationalHolidays.test.ts
git commit -m "feat: parse Colombian national holiday dates"
```

---

### Task 2: Load holiday years

**Files:**
- Modify: `src/holidays/nationalHolidays.ts`
- Modify: `tests/holidays/nationalHolidays.test.ts`

**Interfaces:**
- Consumes: `holidayDates(body: unknown): string[]`
- Produces: `yearsToLoad(sheetYears: readonly number[]): number[]` and `loadNationalHolidays(years: readonly number[], fetchImpl: typeof fetch): Promise<string[]>`

- [x] **Step 1: Write the failing test**

`yearsToLoad([2026, 2025])` makes the fake fetch receive, in order:

```txt
https://calendariosnacionales.com/co/v1/2024/nacionales.json
https://calendariosnacionales.com/co/v1/2025/nacionales.json
https://calendariosnacionales.com/co/v1/2026/nacionales.json
https://calendariosnacionales.com/co/v1/2027/nacionales.json
```

The first request sends `User-Agent: pqr-core`. A status 500 throws an error matching `/2026/` when the only requested year is 2026.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/holidays/nationalHolidays.test.ts`

Expected: FAIL because `loadNationalHolidays` is not defined.

- [x] **Step 3: Write minimal implementation**

Request each unique year in ascending order. Throw `holiday request failed for ${year}: ${status}` when `response.ok` is false. Merge parsed dates and sort.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/holidays/nationalHolidays.test.ts`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/holidays/nationalHolidays.ts tests/holidays/nationalHolidays.test.ts
git commit -m "feat: load national holidays for the workbook years"
```

---

### Task 3: CLI and README

**Files:**
- Modify: `src/holidays/nationalHolidays.ts`
- Modify: `src/cli/importWorkbook.ts`
- Modify: `tests/holidays/nationalHolidays.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `loadNationalHolidays`, `importCases`, `CaseRepository.replaceAll`
- Produces: `importLoadedCases(...)` returning `{ imported, skipped, invalidDates, holidays }`

- [x] **Step 1: Write the failing test**

A failing fetch passed to `importLoadedCases` rejects and the injected `openRepository` is not called.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/holidays/nationalHolidays.test.ts`

Expected: FAIL because `importLoadedCases` is not defined.

- [x] **Step 3: Write minimal implementation**

Load holidays first. Only then open the repository and `replaceAll`. The CLI prints the returned object, including `holidays`. On any thrown error it writes the message to stderr and exits 1.

README: the import calls `/co/v1/{año}/nacionales.json`. Remove the “Qué sigue” holiday paragraph. The sample JSON includes `"holidays": 0`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/holidays/nationalHolidays.test.ts && npm test`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/holidays/nationalHolidays.ts src/cli/importWorkbook.ts tests/holidays/nationalHolidays.test.ts README.md
git commit -m "feat: import PQR cases with national holidays"
```
