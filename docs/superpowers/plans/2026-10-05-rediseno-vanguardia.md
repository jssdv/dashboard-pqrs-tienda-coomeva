# Rediseño de vanguardia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nuevo sistema visual (Geist, tokens claro/oscuro, barra superior, ⌘K, indicadores con mini gráficos, tablas con barras de plazo, línea de tiempo del caso) sin cambiar reglas de negocio.

**Architecture:** Cimientos (tema, colores de gráficos, tipografía) → un dato nuevo del servidor (`serieMensual`) → componentes de presentación pequeños en `client/src/ui/` → pantallas que los componen (Marco, Panel, Casos, Proveedores, formularios).

**Tech Stack:** React 19, React Router 7, Tailwind 4, Recharts, react-aria-components, Radix Dialog/Sheet, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-05-rediseno-vanguardia-design.md`

## Global Constraints

- Sin dependencias nuevas; solo fuentes Geist y Geist Mono por Google Fonts (`client/index.html`).
- Texto en español. Objetivos táctiles `min-h-11`; foco visible; estado = color + icono + texto; contraste de texto ≥ 4,5:1 en claro y oscuro.
- Colores de gráficos solo vía `useChartColors()` (lee variables CSS del tema activo); nada de hex nuevos en componentes.
- Todo movimiento (entrada, conteo animado, gráficos) respeta `prefers-reduced-motion`.
- `localStorage` siempre dentro de `try/catch`; la app debe verse bien sin él.
- Un solo eje por gráfico (nada de doble eje); leyenda cuando hay ≥ 2 series; cada gráfico con texto `sr-only`.
- Cada tarea termina con `npx vitest run` y `npm run build` en verde. Commits con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; `git add` solo de los archivos de la tarea.
- Los tests existentes que dependan de textos o estructura que esta tarea cambia se actualizan en la misma tarea.

## Review Focus

- Tema guardado inválido o `localStorage` bloqueado: arranca en "sistema" sin error (Task 1).
- Cambiar de tema con un gráfico en pantalla: los colores del gráfico cambian sin recargar (Task 1).
- Serie mensual con un solo mes o vacía: indicadores sin variación ni error, mini gráfico vacío con texto alternativo (Tasks 2, 5).
- Variación cuando el mes anterior vale 0: se muestra "—", no "Infinity %" ni "NaN" (Task 5).
- `⌘K` en Mac y `Ctrl+K` en otros sistemas; Escape devuelve el foco; no se abre dentro de un campo de texto con otro atajo (Task 4).
- Caso con más de 10 días hábiles o sin fecha inicial en la barra de plazo y en la línea de tiempo: se recorta a 10+ y muestra "Sin fecha de inicio" (Task 6).
- Tabla de Casos con `prefers-reduced-motion` y modo oscuro: filas, insignias y barras siguen legibles (Task 6).

---

### Task 1: Tipografía, tokens y tema claro/oscuro

**Files:**
- Modify: `client/index.html` (fuentes), `client/src/index.css` (tokens, `--danger`, fuentes, números tabulares)
- Create: `client/src/theme.ts`, `client/src/theme.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type ThemeMode = "light" | "dark" | "system";
  export function useTheme(): { mode: ThemeMode; resolved: "light" | "dark"; setMode: (mode: ThemeMode) => void };
  export function applyTheme(mode: ThemeMode): "light" | "dark"; // pone/quita la clase `dark` en <html>
  export const THEME_KEY = "pqr-theme";
  ```

- [ ] **Step 1: Write failing tests** (`theme.test.tsx`, jsdom): `applyTheme("dark")` añade `dark` a `document.documentElement` y devuelve `"dark"`; `"system"` sigue `matchMedia("(prefers-color-scheme: dark)")` (stub true/false); `useTheme` lee `localStorage["pqr-theme"]`, ignora valores inválidos y cae en `"system"`; `setMode("dark")` guarda y aplica; con `localStorage` que lanza al leer/escribir no falla y funciona en memoria.
- [ ] **Step 2: Run** `npx vitest run client/src/theme.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** `theme.ts` y un script inline mínimo en `client/index.html` que aplica la clase antes de pintar (mismo criterio, con `try/catch`). Añadir `--danger` y `--danger-foreground` a `:root` y `.dark`, ajustar `--destructive` (se usa en insignias) a rojo, y declarar `--font-sans: "Geist"`, `--font-display: "Geist"`, `--font-mono: "Geist Mono"` con `font-variant-numeric: tabular-nums` para `.font-mono`.
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: Geist typography, tokens and light/dark theme`.

### Task 2: Serie mensual en el resumen

**Files:**
- Create: `src/domain/monthSeries.ts`, `tests/domain/monthSeries.test.ts`
- Modify: `src/domain/summary.ts`, `tests/domain/summary.test.ts`, `client/src/types.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface MonthPoint { mes: string; entrados: number; cerrados: number; abiertosAlCierre: number; diasPromedio: number | null }
  export function monthSeries(cases: readonly PqrCase[]): MonthPoint[];
  ```
  `DashboardSummary.serieMensual: MonthPoint[]` (y el tipo espejo en `client/src/types.ts`).

- [ ] **Step 1: Write failing tests:** casos en dos meses con cierres → `entrados`/`cerrados` por mes (fechas válidas), `abiertosAlCierre` = acumulado de entrados − cerrados, `diasPromedio` = promedio de `diasSolucion` de los cerrados de ese mes (`null` sin cierres); mes solo con cierres (entrada en otro mes); fechas inválidas excluidas; lista vacía → `[]`; `summarize([]).serieMensual` es `[]`.
- [ ] **Step 2: Run** `npx vitest run tests/domain` — Expected: FAIL.
- [ ] **Step 3: Implement** `monthSeries` (meses contiguos desde el primero al último con datos, rellenando meses sin movimiento con ceros) y añadirlo a `summarize`.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: monthly series in the summary`.

### Task 3: Colores de gráficos y paleta validada

**Files:**
- Create: `client/src/useChartColors.ts`, `client/src/palette.ts`, `client/src/palette.test.ts`
- Modify: `client/src/charts.tsx` (quita constantes hex y usa el hook), `client/src/Resumen.tsx` y `client/src/ProveedorDetalle.tsx` (consumen el hook)

**Interfaces:**
- Consumes: `useTheme` (Task 1).
- Produces:
  ```ts
  export interface ChartColors { primary: string; warning: string; danger: string; muted: string; grid: string; axis: string; surface: string; tipo: Record<string, string> }
  export function useChartColors(): ChartColors;
  export const TIPO_ORDER: readonly string[]; // orden fijo de asignación
  ```

- [ ] **Step 1: Validate the palette** con `node <skill dataviz>/scripts/validate_palette.js "<5 hex>" --mode light` y `--mode dark` para la paleta categórica de los 5 tipos (SOLICITUD, RECLAMO, PREGUNTA, QUEJA, DEVOLUCION) en orden fijo; ajustar hasta que no haya FAIL; anotar la salida en el mensaje de commit.
- [ ] **Step 2: Write failing tests:** `palette.test.ts` comprueba que hay 5 colores por modo, sin repetidos y con la asignación fija por tipo (un tipo desconocido recibe el gris neutro, nunca un hue generado); `useChartColors` devuelve los valores de las variables CSS del tema activo (se fijan en `document.documentElement.style` en el test) y se actualiza al cambiar `resolved`.
- [ ] **Step 3: Run** — Expected: FAIL.
- [ ] **Step 4: Implement** el hook (lee `getComputedStyle(document.documentElement)` y se recalcula al cambiar el tema) y migrar los gráficos existentes a `useChartColors()`.
- [ ] **Step 5: Run** `npx vitest run` y `npm run build` — Expected: PASS.
- [ ] **Step 6: Commit** — `feat: theme-aware chart colors with a validated palette`.

### Task 4: Marco: barra superior, sidebar y paleta de comandos

**Files:**
- Modify: `client/src/Shell.tsx` (barra superior, `PageHead` con `actions`, pie del sidebar), `client/src/shell.test.tsx`
- Create: `client/src/CommandPalette.tsx`, `client/src/commandPalette.test.tsx`, `client/src/ui/ThemeToggle.tsx`

**Interfaces:**
- Consumes: `useTheme` (Task 1), `getCases` de `client/src/api.ts`, `matchesSearch` de `client/src/matchesSearch.ts`.
- Produces:
  ```ts
  export function CommandPalette(props: { open: boolean; onOpenChange: (open: boolean) => void }): JSX.Element;
  export function ThemeToggle(): JSX.Element; // alterna claro / oscuro / sistema con aria-label
  export function PageHead(props: { title: string; lede?: string; actions?: ReactNode }): JSX.Element;
  ```

- [ ] **Step 1: Write failing tests:** barra superior con migas (texto de la ruta actual), botón "Buscar" con la indicación del atajo, `ThemeToggle` cambia la clase `dark` de `<html>`; `PageHead` muestra `actions`; en `commandPalette.test.tsx`: `Ctrl+K` y `Meta+K` abren el diálogo, Escape lo cierra y devuelve el foco al disparador, escribir "tienda" filtra las entradas de "Ir a" y "Acciones", escribir un número de orden lista casos coincidentes (máx. 8) cargados una sola vez, Enter sobre un caso navega a `/casos?q=<orden>`, "Nuevo caso" navega a `/casos/nuevo`, sin coincidencias muestra "Sin resultados".
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** la paleta con Radix Dialog y una lista con navegación por flechas (`role="listbox"`/`option`, `aria-activedescendant`); el atajo se registra en `Shell` con `keydown` en `document`. Barra superior fija (`sticky top-0`, desenfoque suave); pie del sidebar con "Datos al <hoy en es-CO>".
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS. Revisión visual en claro/oscuro a 375 y 1280px.
- [ ] **Step 5: Commit** — `feat: top bar, command palette and theme toggle`.

### Task 5: Panel con indicadores, banda de alertas y gráficos

**Files:**
- Create: `client/src/ui/Sparkline.tsx`, `client/src/ui/StatCard.tsx`, `client/src/ui/SegmentedBar.tsx`, `client/src/metrics.ts`, `client/src/metrics.test.ts`, `client/src/ui/panelParts.test.tsx`
- Modify: `client/src/Resumen.tsx`, `client/src/screens.test.tsx`

**Interfaces:**
- Consumes: `serieMensual` (Task 2), `useChartColors` (Task 3), `PageHead` con `actions` (Task 4).
- Produces:
  ```ts
  export function deltaPct(current: number, previous: number): number | null; // null si previous === 0
  export function Sparkline(props: { values: Array<number | null>; label: string; kind?: "line" | "bar" }): JSX.Element;
  export function StatCard(props: { label: string; value: string; delta?: { pct: number | null; good: "up" | "down" }; series?: Array<number | null>; seriesLabel?: string; kind?: "line" | "bar"; href?: string }): JSX.Element;
  export interface Segment { key: string; label: string; count: number; href?: string; tone: "ok" | "warn" | "danger" | "muted" }
  export function SegmentedBar(props: { segments: Segment[] }): JSX.Element;
  ```

- [ ] **Step 1: Write failing tests:** `deltaPct(12, 10) === 20`, `deltaPct(5, 0) === null`, `deltaPct(0, 0) === null`; `StatCard` muestra valor, "▲/▼ N % vs mes anterior" con icono y texto, "—" cuando `pct` es `null`, color según `good`, enlace cuando hay `href`; `Sparkline` con `values` vacío o de un punto no falla y trae `role="img"` con `aria-label`; `SegmentedBar` reparte anchos proporcionales, omite segmentos en 0, cada segmento con enlace tiene texto accesible y la leyenda muestra los conteos. En `screens.test.tsx`: cuatro `StatCard` (Abiertos, Entrados del último mes, Tasa de cierre, Días promedio) con variación calculada de `serieMensual`; banda de alertas con Vencidos y Sin fecha de inicio enlazados (`?plazo=vencido`, `?estado=abiertos&fecha=invalida`); selector de rango "6 m / 12 m / Todo" que limita los meses del gráfico; "Plazos de casos abiertos" como `SegmentedBar` con enlaces por segmento; barras por proveedor/tema con enlace por barra; tabla de cierre con color por umbral y el porcentaje en texto.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** los componentes y recomponer `Resumen.tsx`. Conteo animado de las cifras (600 ms, sin animación con `prefers-reduced-motion`). `Entrados y cerrados`: área + línea con el estilo de `useChartColors`, marcas de meses atípicos (> 1,5× la media) con texto en el tooltip.
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS. Revisión visual en claro/oscuro a 375, 768 y 1280px.
- [ ] **Step 5: Commit** — `feat: redesigned Panel with stat cards, alert band and charts`.

### Task 6: Casos: tabla con barra de plazo y línea de tiempo del caso

**Files:**
- Create: `client/src/ui/PlazoBar.tsx`, `client/src/ui/CaseTimeline.tsx`, `client/src/ui/tipoDot.tsx`, `client/src/ui/caseParts.test.tsx`
- Modify: `client/src/Casos.tsx`, `client/src/CaseDetail.tsx`, `client/src/CaseFilters.tsx`, `client/src/screens.test.tsx`

**Interfaces:**
- Consumes: `Riesgo`/`PqrCase` de `client/src/types.ts`, `TIPO_ORDER` y `useChartColors` (Task 3).
- Produces:
  ```ts
  export function PlazoBar(props: { dias: number | null; estado: "en-plazo" | "por-vencer" | "vencido" | null }): JSX.Element; // escala 0–10+, marcas en 5 y 10
  export function CaseTimeline(props: { caso: PqrCase }): JSX.Element;
  export function TipoTag(props: { tipo: string | null }): JSX.Element; // punto de color de la paleta + texto
  ```

- [ ] **Step 1: Write failing tests:** `PlazoBar` ancho proporcional a `dias/10`, recorta a 100 % con `dias > 10`, texto accesible "N días hábiles de 10", sin `dias` muestra "Sin fecha de inicio"; `CaseTimeline` para caso abierto marca inicio y "hoy" con los días hábiles, para caso cerrado marca inicio y solución con `diasSolucion`, sin fecha válida muestra "Sin fecha de inicio"; `TipoTag` usa el color asignado y el texto; tabla de Casos muestra `TipoTag` y `PlazoBar` en la columna Plazo (abiertos con `riesgo`) y texto "N días" en cerrados; la barra de herramientas está en una tarjeta; el detalle muestra la línea de tiempo y secciones "Caso", "Persona" y "Texto".
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** y aplicar el estilo nuevo a la tabla (encabezado de 12 px, filas de 44 px, resaltado al pasar, punto de estado) y al panel de detalle.
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS. Revisión visual en claro/oscuro a 375 y 1280px, con el detalle abierto.
- [ ] **Step 5: Commit** — `feat: case table plazo bars and case timeline`.

### Task 7: Proveedores, formularios y detalles de gráficos

**Files:**
- Modify: `client/src/Proveedores.tsx`, `client/src/ProveedorDetalle.tsx`, `client/src/CaseForm.tsx`, `client/src/proveedores.test.tsx`, `client/src/caseform.test.tsx`

**Interfaces:**
- Consumes: `TipoTag`, `Sparkline`, `useChartColors`, `PageHead` con `actions`.

- [ ] **Step 1: Write failing tests:** la columna "Abiertos" de Proveedores incluye una barra proporcional al máximo de la tabla y un punto de alerta con texto accesible cuando `vencidos > 0`; el detalle muestra el desglose por tipo como barras con `TipoTag` y la línea de tiempo con colores del tema; el formulario agrupa los campos en secciones con título ("Datos del caso", "Clasificación", "Detalle") y mantiene etiquetas, errores y enlaces `#campo`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** el estilo nuevo en estas pantallas.
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: redesigned Proveedores and forms`.

### Task 8: Verificación completa y documentación

**Files:**
- Modify: según hallazgos; `docs/proyecto/cliente.md`, `docs/proyecto/dominio.md`, `docs/proyecto/api.md`, `README.md`

- [ ] **Step 1: Recorrido** con `npm run build && npm run serve -- <copia de data/pqr.sqlite>` en claro y oscuro a 320, 375, 768, 1024 y 1280px: Panel, Casos (detalle abierto), Proveedores (fila abierta), `/casos/nuevo` y ⌘K. Comprobar `scrollWidth === innerWidth` y que no hay texto con contraste insuficiente (revisar con la herramienta de inspección del navegador los pares texto/fondo de tarjetas, insignias, tabla y gráficos).
- [ ] **Step 2: Fix** en un solo pase lo que falle; cada arreglo de lógica con su prueba.
- [ ] **Step 3: Prueba de teclado:** Tab recorre barra, menú y tabla con foco visible; ⌘K abre/cierra y devuelve el foco; el detalle de caso se cierra con Escape.
- [ ] **Step 4: Docs.** `cliente.md` (sistema visual, componentes nuevos, tema, ⌘K), `dominio.md` y `api.md` (`serieMensual`), `README.md`.
- [ ] **Step 5: Full verification** `npm test && npm run build` — Expected: todo en verde.
- [ ] **Step 6: Commit** — `docs: describe the redesigned UI`.

## Self-review

- Cobertura del spec: sistema visual y tema (Task 1), datos nuevos (Task 2), gráficos y paleta (Task 3), marco, ⌘K y migas (Task 4), Panel (Task 5), Casos y línea de tiempo (Task 6), Proveedores y formularios (Task 7), verificación y docs (Task 8).
- Tipos consistentes: `MonthPoint` (Tasks 2→5), `ChartColors`/`TIPO_ORDER` (3→5,6,7), `PageHead.actions` (4→5,7), `StatCard`/`Sparkline` (5→7), `TipoTag` (6→7).
- Riesgo: el rediseño toca casi todos los componentes de `client/src/`; por eso cada tarea actualiza sus propios tests y no se avanza con la suite en rojo.
