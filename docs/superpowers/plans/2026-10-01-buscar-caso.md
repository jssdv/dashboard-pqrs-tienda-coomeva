# Buscar un caso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A search box on Casos narrows the existing cards by order, associate, or email.

**Architecture:** `GET /api/casos` stays as it is. The client already holds that list. A pure `matchesSearch` filters it after the estado filter and before the page of 20. The query text lives in `?q=`.

**Tech Stack:** Vite, React 19, React Router 7, Vitest, Testing Library. No new dependencies.

## Global Constraints

- The box label is `Buscar`. The placeholder is `Orden, asociado o correo`.
- The typed text is stored as `?q=` unchanged. Each keystroke calls `setParams(next, { replace: true })`.
- Matching copies the `lookupKey` rule without importing `src/domain/normalize.ts`: NFD, strip `\p{M}`, trim, collapse spaces, uppercase. A case matches when that key of `q` is contained in the key of `idOrden`, `asociado`, or `correo`.
- A null or empty field does not match. `q` empty or only spaces does not filter. Motivo, solución, and every other column are not searched.
- Search AND estado, área, tipo, cola, and mes. Changing `q` deletes `pagina`.
- **Quitar filtros** stays a link to `/casos`. It is shown when `q` has non-space text, even if the other filters are empty.
- No matches still render `No hay casos con ese filtro.`
- Do not change the card, create form, close form, API, or summary.
- Do not commit. `client/` is untracked. A partial commit would not build, and committing all of `client/` would include the rest of the webapp.

---

## File structure

| File | Responsibility |
|---|---|
| `client/src/matchesSearch.ts` | `matchesSearch(row, q)` |
| `client/src/matchesSearch.test.ts` | Pure match cases |
| `client/src/Casos.tsx` | Search box, URL, filter order |
| `client/src/screens.test.tsx` | The box against rendered cards |

### Task 1: matchesSearch

**Files:**
- Create: `client/src/matchesSearch.ts`
- Test: `client/src/matchesSearch.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `matchesSearch(row: { idOrden: string | null; asociado: string | null; correo: string | null }, q: string): boolean`

- [x] **Step 1: Write the failing test**

Create `client/src/matchesSearch.test.ts`:

```ts
import { expect, it } from "vitest";
import { matchesSearch } from "./matchesSearch";

const row = (over: { idOrden?: string | null; asociado?: string | null; correo?: string | null } = {}) => ({
  idOrden: null,
  asociado: null,
  correo: null,
  ...over,
});

it("matches a partial name or email and ignores case and accents", () => {
  expect(matchesSearch(row({ asociado: "Ana María" }), "ana")).toBe(true);
  expect(matchesSearch(row({ correo: "ana@coomeva.com.co" }), "ANA")).toBe(true);
  expect(matchesSearch(row({ asociado: "Boletería" }), "boleteria")).toBe(true);
  expect(matchesSearch(row({ asociado: "Luis" }), "ana")).toBe(false);
});

it("matches a partial order id", () => {
  expect(matchesSearch(row({ idOrden: "ORD-1234" }), "123")).toBe(true);
  expect(matchesSearch(row({ idOrden: "ORD-99" }), "123")).toBe(false);
});

it("does not match empty fields, other columns, or a blank query", () => {
  expect(matchesSearch(row({ idOrden: "ORD-1" }), "   ")).toBe(true);
  expect(matchesSearch(row(), "ana")).toBe(false);
  expect(matchesSearch(row({ idOrden: null, asociado: "", correo: "  " }), "ana")).toBe(false);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run client/src/matchesSearch.test.ts`

Expected: FAIL because `./matchesSearch` does not exist.

- [x] **Step 3: Write the minimal implementation**

Create `client/src/matchesSearch.ts`:

```ts
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
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run client/src/matchesSearch.test.ts`

Expected: PASS, 3 tests.

- [x] **Step 5: Do not commit**

Leave the two files uncommitted.

### Task 2: Search box on Casos

**Files:**
- Modify: `client/src/Casos.tsx`
- Test: `client/src/screens.test.tsx`

**Interfaces:**
- Consumes: `matchesSearch(row, q)` from Task 1
- Produces: a textbox labelled `Buscar` on `/casos`

- [x] **Step 1: Write the failing screen tests**

Add this helper and these tests to `client/src/screens.test.tsx`. Keep the existing tests.

```ts
function caso(over: Partial<PqrCase> = {}): PqrCase {
  return {
    id: "2026-1",
    sheetYear: 2026,
    rowNumber: 2,
    fechaInicial: "2026-01-05",
    fechaSolucion: null,
    fechaInicialInvalida: false,
    fechaSolucionInvalida: false,
    diasSolucion: null,
    area: "Tienda",
    areaOriginal: "Tienda",
    idOrden: null,
    asociado: null,
    correo: null,
    fuente: null,
    fuenteOriginal: null,
    tipo: "RECLAMO",
    tipoOriginal: "RECLAMO",
    tema: "Cine",
    temaOriginal: "Cine",
    motivo: "no buscar aquí",
    solucion: null,
    ...over,
  };
}

function stubCases(cases: PqrCase[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ cases }) })),
  );
}

it("filters cards by name, email, and order from the search box", async () => {
  stubCases([
    caso({ id: "a", asociado: "Ana María" }),
    caso({ id: "b", correo: "ana@coomeva.com.co", asociado: "Otra" }),
    caso({ id: "c", asociado: "Luis" }),
    caso({ id: "d", asociado: "Boletería" }),
    caso({ id: "e", idOrden: "ORD-1234", asociado: "Nadie" }),
  ]);
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  const box = await screen.findByRole("textbox", { name: "Buscar" });
  expect(box.getAttribute("placeholder")).toBe("Orden, asociado o correo");

  fireEvent.change(box, { target: { value: "ana" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  for (const summary of screen.getAllByText("Detalle")) summary.click();
  expect(screen.getByText("Ana María")).toBeTruthy();
  expect(screen.getByText("ana@coomeva.com.co")).toBeTruthy();
  expect(screen.queryByText("Luis")).toBeNull();

  fireEvent.change(box, { target: { value: "boleteria" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  screen.getByText("Detalle").click();
  expect(screen.getByText("Boletería")).toBeTruthy();

  fireEvent.change(box, { target: { value: "123" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  screen.getByText("Detalle").click();
  expect(screen.getByText("ORD-1234")).toBeTruthy();
});

it("hides a closed match when estado is Abiertos", async () => {
  stubCases([
    caso({ id: "open", asociado: "Ana María" }),
    caso({ id: "closed", asociado: "Ana Cerrada", fechaSolucion: "2026-02-01", diasSolucion: 4 }),
  ]);
  render(
    <MemoryRouter initialEntries={["/casos?estado=abiertos"]}>
      <Casos />
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByRole("textbox", { name: "Buscar" }), {
    target: { value: "ana" },
  });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  screen.getByText("Detalle").click();
  expect(screen.getByText("Ana María")).toBeTruthy();
  expect(screen.queryByText("Ana Cerrada")).toBeNull();
});

it("shows the empty filter message when search matches nothing", async () => {
  stubCases([caso({ asociado: "Luis" })]);
  render(
    <MemoryRouter initialEntries={["/casos?q=ana"]}>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("No hay casos con ese filtro.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Quitar filtros" }).getAttribute("href")).toBe("/casos");
});

it("returns to page 1 when the search text changes", async () => {
  stubCases([
    caso({ id: "ana", asociado: "Ana María" }),
    ...Array.from({ length: 24 }, (_, index) => caso({ id: `x-${index}`, asociado: "Luis" })),
  ]);
  render(
    <MemoryRouter initialEntries={["/casos?pagina=2"]}>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("21–25 de 25")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar" }), { target: { value: "ana" } });
  expect(screen.getByText("1–1 de 1")).toBeTruthy();
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
});
```

Import `PqrCase` from `./types` in that test file.

Name, email, and order sit inside closed `<details>`. Testing Library hides that content until Detalle is clicked. Count `listitem` first, then open Detalle, then assert the text.

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run client/src/screens.test.tsx`

Expected: FAIL because there is no textbox named Buscar.

- [x] **Step 3: Wire the box**

In `client/src/Casos.tsx`:

Import `matchesSearch` from `./matchesSearch`.

Read `const q = params.get("q") ?? "";`.

Include `q.trim()` in `filtersActive`.

Add `setQuery`:

```ts
function setQuery(value: string) {
  const next = new URLSearchParams(params);
  if (value) next.set("q", value);
  else next.delete("q");
  next.delete("pagina");
  setParams(next, { replace: true });
}
```

After the estado filter, apply search. Do not add `q` to the `useEffect` dependency list.

```ts
const byEstado =
  estado === "abiertos"
    ? cases.filter(isOpen)
    : estado === "cerrados"
      ? cases.filter((row) => !isOpen(row))
      : cases;
const visible = byEstado.filter((row) => matchesSearch(row, q));
```

Put this label after the Tipo select and before the filter label paragraph:

```tsx
<label className="grid min-w-[12rem] gap-1 text-sm font-semibold" htmlFor="buscar">
  Buscar
  <input
    id="buscar"
    className={selectClass}
    placeholder="Orden, asociado o correo"
    value={q}
    onChange={(event) => setQuery(event.target.value)}
  />
</label>
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run client/src/matchesSearch.test.ts client/src/screens.test.tsx`

Expected: PASS. The previous screen tests still pass, including «Más de 10 días», «Nuevo caso», and «No hay casos con ese filtro».

- [x] **Step 5: Do not commit**

Leave the edits uncommitted.
