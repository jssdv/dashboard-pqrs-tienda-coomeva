# Plazos y comportamiento por proveedor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar el riesgo de vencimiento por caso, una matriz proveedor × tipo y una línea de tiempo mensual por proveedor.

**Architecture:** Funciones de dominio puras nuevas en `src/domain/`, expuestas por `summarize`, `/api/casos` y un endpoint nuevo; la webapp las consume en `Casos.tsx` y `Resumen.tsx` reutilizando Card, Badge, Recharts y `casosHref`.

**Tech Stack:** TypeScript ESM, Vitest, React 19, React Router, Recharts, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-10-05-plazos-proveedor-design.md`

## Global Constraints

- Plazo: `PLAZO_DIAS = 10` días hábiles, igual para todos los tipos.
- Estados: `en-plazo` (0–5 días hábiles abiertos), `por-vencer` (6–10), `vencido` (>10). Debe coincidir con `agingBuckets` actual.
- "Hoy" = `bogotaToday()`. Sin festivos no se calcula: dominio lanza `Error("no holidays loaded")`, API responde 503 (mensaje existente en `applyFilters`).
- Proveedor = campo `area`; valores nulos se agrupan como `(sin valor)`.
- Fechas inválidas o nulas quedan fuera de riesgo y de líneas de tiempo.
- Parámetro de filtro nuevo: `plazo` (no `estado`, que ya existe en `Casos.tsx`).
- Ni `/summary` ni los endpoints nuevos exponen nombres, correos o texto libre.
- Imports del servidor con sufijo `.js`; pruebas de dominio importan sin sufijo (patrón existente).
- Textos de UI en español, objetivos táctiles `min-h-11`, estado nunca solo por color.
- El árbol de trabajo tiene cambios sin commit ajenos: cada commit usa `git add` solo de los archivos de la tarea.

## Review Focus

- Caso con fecha inicial en el futuro: `diasAbiertos` se recorta a 0 y queda `en-plazo` (Task 1).
- Frontera exacta 5/6 y 10/11 días hábiles; con 10 días `diasParaVencer = 0` y es `por-vencer` (Task 1).
- Proveedor con tildes, espacios o `/` en el nombre en `/api/proveedores/:nombre/linea` (Task 5).
- Proveedor sin casos o inexistente: `{ puntos: [] }`, no 404 (Task 5).
- Mes con casos entrados pero sin cierres: `diasPromedio: null`, la gráfica no dibuja 0 (Tasks 5, 6).
- Celda de matriz con 0 abiertos y tipo `(sin valor)`; el clic debe filtrar por `(sin valor)` (Task 3, 4).
- Sin festivos: `/api/casos?plazo=vencido` responde 503 y la columna Plazo muestra "—" en vez de inventar (Tasks 2, 3).

---

### Task 1: Riesgo de vencimiento (dominio)

**Files:**
- Create: `src/domain/risk.ts`
- Create: `tests/domain/risk.test.ts`
- Modify: `src/domain/summary.ts` (`agingBuckets`, líneas ~70-90)

**Interfaces:**
- Produces:
  ```ts
  export const PLAZO_DIAS = 10;
  export type PlazoEstado = "en-plazo" | "por-vencer" | "vencido";
  export interface Riesgo { diasAbiertos: number; diasParaVencer: number; estado: PlazoEstado }
  export function riskOf(caso: PqrCase, holidays: readonly string[], today: string): Riesgo | null;
  ```

- [ ] **Step 1: Write the failing test** `tests/domain/risk.test.ts` (copiar el helper `caso()` de `tests/domain/openQueue.test.ts`). Casos con festivo `["2026-01-01"]`:
  - `fechaInicial 2026-01-05` (lunes) y hoy `2026-01-09` → `diasAbiertos 5`, `en-plazo`, `diasParaVencer 5`.
  - hoy `2026-01-12` → `diasAbiertos 6`, `por-vencer`.
  - hoy `2026-01-16` → `diasAbiertos 10`, `por-vencer`, `diasParaVencer 0`.
  - hoy `2026-01-19` → `diasAbiertos 11`, `vencido`, `diasParaVencer -1`.
  - `fechaInicial 2026-02-02`, hoy `2026-01-19` → `diasAbiertos 0`, `en-plazo` (futuro recortado).
  - cerrado (`fechaSolucion` no nula), `fechaInicial` null o `fechaInicialInvalida` → `null`.
  - `holidays = []` → `toThrow("no holidays loaded")`.
- [ ] **Step 2: Run** `npx vitest run tests/domain/risk.test.ts` — Expected: FAIL (módulo no existe).
- [ ] **Step 3: Implement** `riskOf` en `src/domain/risk.ts` con `businessDays` de `./businessDays.js`; `diasAbiertos = Math.max(0, businessDays(...))`; lanzar si `holidays.length === 0` (mismo mensaje que `openQueue`).
- [ ] **Step 4: Refactor** `agingBuckets` en `summary.ts` para contar con `riskOf` (`en-plazo`→`"0-5"`, `por-vencer`→`"6-10"`, `vencido`→`"mas-10"`); la forma de `AgingBucket` no cambia.
- [ ] **Step 5: Run** `npx vitest run tests/domain` — Expected: PASS, incluidas las pruebas existentes de `summary.test.ts`.
- [ ] **Step 6: Commit**
  ```bash
  git add src/domain/risk.ts tests/domain/risk.test.ts src/domain/summary.ts
  git commit -m "feat: compute due-date risk for open cases"
  ```

### Task 2: Filtro `plazo` y `riesgo` en `/api/casos`

**Files:**
- Modify: `src/api/summaryServer.ts` (`CaseQuery`, `queryOf`, `applyFilters`, handler `GET /api/casos`)
- Modify: `tests/api/summaryServer.test.ts`

**Interfaces:**
- Consumes: `riskOf`, `Riesgo`, `PlazoEstado` de Task 1.
- Produces: `GET /api/casos` devuelve `{ cases: Array<PqrCase & { riesgo?: Riesgo }> }`; `riesgo` solo en casos abiertos con fecha válida y festivos cargados. Query `plazo=en-plazo|por-vencer|vencido`; valor desconocido se ignora.

- [ ] **Step 1: Write failing tests** en `describe("GET /api/casos")`, usando `memoryRepo`/`listen` y `options.now` existentes:
  - 3 casos abiertos (1 por estado) → `?plazo=vencido` devuelve solo el vencido; cada caso abierto trae `riesgo.estado`; un caso cerrado no trae `riesgo`.
  - `memoryRepo(cases, [])` + `?plazo=vencido` → 503 con el mensaje de festivos.
  - `memoryRepo(cases, [])` sin `plazo` → 200 y ningún caso con `riesgo`.
- [ ] **Step 2: Run** `npx vitest run tests/api/summaryServer.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** En `applyFilters`, si hay festivos adjuntar `riesgo` a cada caso abierto; si `query.plazo` es uno de los tres estados exigir festivos (reutilizar el bloque `try/catch` de `cola` para el mensaje 503) y filtrar por `riesgo?.estado`.
- [ ] **Step 4: Run** `npx vitest run tests/api` — Expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/api/summaryServer.ts tests/api/summaryServer.test.ts
  git commit -m "feat: add plazo filter and risk to case listing"
  ```

### Task 3: Columna y filtro Plazo en Casos

**Files:**
- Modify: `client/src/types.ts` (`PqrCase`, `CaseQuery`; agregar `Riesgo`, `PlazoEstado`)
- Modify: `client/src/Casos.tsx` (`queryFrom`, filtros, `CaseTable`, `CaseCards`, dependencias del `useEffect`)
- Modify: `client/src/format.ts` (`filterLabel`, helper `plazoLabel`)
- Modify: `src/components/ui/badge.tsx` (variante `destructive`)
- Modify: `client/src/screens.test.tsx`

**Interfaces:**
- Consumes: forma de respuesta de Task 2.
- Produces: `plazoLabel(riesgo?: Riesgo): { text: string; variant: "secondary" | "warning" | "destructive" } | null` en `format.ts`. Textos: `"En plazo · faltan N"`, `"Por vencer · faltan N"` (N = `diasParaVencer`; `0` → `"Vence hoy"`), `"Vencido · N días"` (N = `-diasParaVencer`).

- [ ] **Step 1: Write failing tests** en `screens.test.tsx` (seguir los mocks de `fetch` existentes): (a) fila abierta con `riesgo.estado: "vencido"` muestra "Vencido" en la fila; (b) fila cerrada muestra "—" en Plazo; (c) elegir "Por vencer" en el select `Plazo` llama a `/api/casos` con `plazo=por-vencer`; (d) `plazoLabel` cubre los tres textos y el caso `diasParaVencer 0`.
- [ ] **Step 2: Run** `npx vitest run client/src/screens.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** Añadir `plazo` a `CaseQuery` y a `queryFrom`/`useEffect`; select "Plazo" (Todos / En plazo / Por vencer / Vencido) con el mismo markup que `filtro-estado`; columna "Plazo" en la tabla y línea en la tarjeta móvil con `<Badge variant={...}>`; incluir `plazo` en `filtersActive` y `filterLabel`. Variante `destructive` del Badge con `border-transparent bg-destructive/12 text-destructive`; verificar que el token `--destructive` existe en `src/styles/theme.css`, y si no, usar el rojo ya presente en el tema.
- [ ] **Step 4: Run** `npx vitest run client` — Expected: PASS.
- [ ] **Step 5: Visual check** con `npm run build && npm run serve -- ./data/pqr.sqlite`: abrir `/casos` a 375px y 1280px; badge legible, tabla sin desbordar la página, filtro funcional.
- [ ] **Step 6: Commit**
  ```bash
  git add client/src/types.ts client/src/Casos.tsx client/src/format.ts client/src/screens.test.tsx src/components/ui/badge.tsx
  git commit -m "feat: show due-date risk and filter by plazo in Casos"
  ```

### Task 4: Matriz proveedor × tipo

**Files:**
- Create: `src/domain/providerTypeMatrix.ts`
- Create: `tests/domain/providerTypeMatrix.test.ts`
- Modify: `src/domain/summary.ts` (interfaz y retorno de `summarize`)
- Modify: `client/src/types.ts`, `client/src/Resumen.tsx`, `client/src/screens.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface MatrixCell { tipo: string; total: number; abiertos: number }
  export interface MatrixRow { area: string; total: number; abiertos: number; celdas: MatrixCell[] }
  export function providerTypeMatrix(cases: readonly PqrCase[]): MatrixRow[];
  ```
  `DashboardSummary.matrizProveedorTipo: MatrixRow[]` (tipos de `celdas` ordenados alfabéticamente y presentes en todas las filas, con 0 donde no hay casos; filas por `total` descendente y luego nombre).

- [ ] **Step 1: Write failing tests** `providerTypeMatrix.test.ts`: dos proveedores × dos tipos con abiertos y cerrados → totales y abiertos exactos; `area: null` → fila `(sin valor)`; `tipo: null` → columna `(sin valor)`; celda ausente rellena con `{total:0, abiertos:0}`; lista vacía → `[]`. En `summary.test.ts` agregar una aserción de que `summarize` incluye `matrizProveedorTipo`.
- [ ] **Step 2: Run** `npx vitest run tests/domain/providerTypeMatrix.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** la función (Map anidado, patrón de `areaCurves.ts`) y añadirla a `summarize`.
- [ ] **Step 4: Run** `npx vitest run tests` — Expected: PASS.
- [ ] **Step 5: UI.** Tarjeta "Proveedor por tipo" en `Resumen.tsx` (componente `Card` de `Shell`) con tabla: columna de proveedor fija a la izquierda, una columna por tipo y una de total, contenedor `overflow-x-auto`. Cada celda con casos es `<Link to={casosHref({ area, tipo })}>` mostrando `total` y, si `abiertos > 0`, `· N abiertos`; celdas en 0 muestran "—" sin enlace. Alto de enlace `min-h-11`.
- [ ] **Step 5b: Test UI** en `screens.test.tsx`: la celda renderiza enlace a `/casos?area=…&tipo=…` con `(sin valor)` codificado.
- [ ] **Step 6: Run** `npx vitest run client` — Expected: PASS; revisar en el navegador a 375px (scroll horizontal solo dentro de la tarjeta).
- [ ] **Step 7: Commit**
  ```bash
  git add src/domain/providerTypeMatrix.ts tests/domain/providerTypeMatrix.test.ts src/domain/summary.ts tests/domain/summary.test.ts client/src/types.ts client/src/Resumen.tsx client/src/screens.test.tsx
  git commit -m "feat: add provider by type matrix to summary"
  ```

### Task 5: Línea de tiempo por proveedor (dominio y API)

**Files:**
- Create: `src/domain/providerTimeline.ts`
- Create: `tests/domain/providerTimeline.test.ts`
- Modify: `src/api/summaryServer.ts`
- Modify: `tests/api/summaryServer.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TimelinePoint { mes: string; entrados: number; cerrados: number; diasPromedio: number | null }
  export function providerTimeline(cases: readonly PqrCase[], area: string): TimelinePoint[];
  ```
  Endpoint `GET /api/proveedores/:nombre/linea` → `200 { puntos: TimelinePoint[] }`. Meses ordenados ascendente. `entrados` por mes de `fechaInicial`, `cerrados` y `diasPromedio` por mes de `fechaSolucion` (promedio de `diasSolucion` no nulos; `null` si no hay).

- [ ] **Step 1: Write failing tests** de dominio: dos meses con entrados/cerrados distintos y promedio exacto (p. ej. cierres con 4 y 6 días → `5`); mes solo con entrados → `diasPromedio: null`; fecha inválida excluida; `area` desconocida → `[]`; `area: "(sin valor)"` selecciona casos con `area` nula. De API: nombre con tilde y espacio codificado con `encodeURIComponent` devuelve sus puntos; proveedor inexistente → 200 `{ puntos: [] }`; la respuesta no contiene `asociado`, `correo` ni `motivo`.
- [ ] **Step 2: Run** `npx vitest run tests/domain/providerTimeline.test.ts tests/api` — Expected: FAIL.
- [ ] **Step 3: Implement** la función y la ruta (`decodeURIComponent` del segmento; el regex debe aceptar `%2F` ya decodificado, es decir, tomar el segmento antes de decodificar). Declarar la ruta GET antes del fallback estático.
- [ ] **Step 4: Run** `npx vitest run tests` — Expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/domain/providerTimeline.ts tests/domain/providerTimeline.test.ts src/api/summaryServer.ts tests/api/summaryServer.test.ts
  git commit -m "feat: add monthly timeline per provider endpoint"
  ```

### Task 6: Gráfica de línea de tiempo en Resumen

**Files:**
- Modify: `client/src/api.ts` (`getProviderTimeline(nombre: string): Promise<TimelinePoint[]>`)
- Modify: `client/src/types.ts` (`TimelinePoint`)
- Modify: `client/src/Resumen.tsx`
- Modify: `client/src/screens.test.tsx`

**Interfaces:**
- Consumes: endpoint de Task 5; lista de proveedores de `summary.porArea`.

- [ ] **Step 1: Write failing tests** en `screens.test.tsx`: la tarjeta "Línea de tiempo por proveedor" muestra un select con los proveedores de `summary.porArea` (el primero seleccionado); cambiar el select dispara `GET /api/proveedores/<nombre codificado>/linea`; respuesta `puntos: []` muestra "Este proveedor no tiene meses con fecha válida."; error de red muestra mensaje y no rompe el resto del resumen.
- [ ] **Step 2: Run** `npx vitest run client/src/screens.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** Componente `ProviderTimeline` junto a `FlowChart` en `Resumen.tsx`: copiar el patrón de `FlowChart`/`FlowTooltip` (ComposedChart: barras `entrados` y `cerrados` con `PRIMARY`/`AMBER`, línea de `diasPromedio` con `connectNulls={false}`), tooltip con los cuatro valores, respetar `useMotion()`. Select con `Label` y `fieldClass` de `Shell`. Carga con `Skeleton` mientras llega la respuesta; cancelar peticiones al cambiar de proveedor (patrón `cancelled`).
- [ ] **Step 4: Run** `npx vitest run client` — Expected: PASS.
- [ ] **Step 5: Visual check** (`npm run build && npm run serve -- ./data/pqr.sqlite`): `/` a 375px y 1280px; leyenda legible, sin desbordar, cambio de proveedor actualiza la gráfica, `prefers-reduced-motion` sin animación.
- [ ] **Step 6: Full verification** `npm test && npm run build` — Expected: todo en verde.
- [ ] **Step 7: Commit**
  ```bash
  git add client/src/api.ts client/src/types.ts client/src/Resumen.tsx client/src/screens.test.tsx
  git commit -m "feat: add provider timeline chart to Resumen"
  ```

## Self-review

- Cobertura del spec: riesgo (Tasks 1–3), matriz (Task 4), línea de tiempo (Tasks 5–6), pruebas y verificación manual incluidas.
- Desviaciones del spec ya corregidas allí: parámetro `plazo` en lugar de `estado`; `Casos.tsx` ya lee `area`/`tipo`.
- Tipos consistentes: `Riesgo`/`PlazoEstado` (Task 1→2→3), `MatrixRow` (Task 4), `TimelinePoint` (Tasks 5→6).
