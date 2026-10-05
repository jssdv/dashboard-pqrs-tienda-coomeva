# Responsive, selectores y nombres Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Controles de selección accesibles (con búsqueda donde hace falta), filtros en panel inferior en móvil, sidebar en tres anchos y nombres/encabezados más claros.

**Architecture:** Dos controles propios en `client/src/ui/` sobre `react-aria-components` con los tokens de este tema; `Casos.tsx` los usa y mueve los filtros a un `Sheet` inferior en móvil; `Shell.tsx` añade el modo de iconos; textos y encabezados se renombran en un solo pase con sus tests.

**Tech Stack:** React 19, react-aria-components 1.x (ya instalado), Radix Sheet (`src/components/ui/sheet.tsx`), Tailwind 4, lucide-react, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-05-ui-responsive-controles-design.md`

## Global Constraints

- Sin dependencias nuevas. Si las pruebas de interacción de React Aria exigen `@testing-library/user-event`, detenerse y pedir aprobación antes de instalarla; mientras tanto usar `fireEvent`.
- Importar de `react-aria-components` desde la raíz, como `src/components/base/select/select.tsx`, salvo que la versión instalada ya exponga subrutas (verificar con `node -e "console.log(Object.keys(require('react-aria-components/package.json').exports||{}).slice(0,5))"`).
- No usar `src/components/base/select`: sus tokens son de Untitled UI.
- Objetivos táctiles `min-h-11`; foco visible (`focus-visible:ring-[3px] focus-visible:ring-ring/50`); estado nunca solo por color.
- Colores solo desde tokens de `client/src/index.css`.
- Opción "Todos" de los filtros = valor `""`; la URL sigue usando los mismos parámetros (`estado`, `plazo`, `area`, `tipo`, `tema`).
- Cada tarea termina con `npx vitest run` y `npm run build` sin errores. Commits con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; `git add` solo de los archivos de la tarea.

## Review Focus

- Combobox con nombre que tiene tildes, `/` o mayúsculas distintas ("Educación / Coomeva"): escribir "educacion" debe encontrarlo (Task 1).
- Combobox sin coincidencias: muestra "Sin resultados" y no deja un valor a medias en la URL (Task 1).
- Valor de la URL que ya no existe en la lista (proveedor renombrado): el control lo muestra igualmente como seleccionado y se puede limpiar (Task 2).
- Panel de filtros en móvil: Escape o "Listo" lo cierran, el foco vuelve al botón "Filtros" y el contador refleja los filtros activos (Task 2).
- 768–1023px: ningún ítem del sidebar queda sin nombre accesible; el contador de vencidos sigue visible (Task 3).
- Proveedor sin vencidos ni días promedio: la tarjeta móvil muestra "—", no "null" ni vacío (Task 4).
- Rutas antiguas (`/` como Resumen): el enlace del menú y los `href` de Panel apuntan a `/` sin romper marcadores (Task 4).

---

### Task 1: Controles `Select` y `Combobox`

**Files:**
- Create: `client/src/ui/Select.tsx`, `client/src/ui/Combobox.tsx`, `client/src/ui/controls.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface Option { value: string; label: string }
  export function Select(props: { label: string; value: string; onChange: (value: string) => void; options: Option[]; allLabel?: string }): JSX.Element
  export function Combobox(props: { label: string; value: string; onChange: (value: string) => void; options: Option[]; allLabel?: string; emptyText?: string }): JSX.Element
  ```
  `allLabel` por defecto "Todos" (opción con valor `""`); `emptyText` por defecto "Sin resultados". Si `value` no está en `options`, se añade como opción para mostrarse.

- [ ] **Step 1: Write failing tests** (`controls.test.tsx`, jsdom): `Select` muestra la etiqueta y el valor actual; abrir y elegir "Abiertos" llama `onChange("abiertos")`; elegir "Todos" llama `onChange("")`. `Combobox`: escribir "educacion" deja una sola opción "Educación / Coomeva"; elegirla llama `onChange` con su valor; escribir "zzz" muestra "Sin resultados"; `value` fuera de `options` se muestra en el campo; tecla Escape cierra la lista sin llamar `onChange`.
- [ ] **Step 2: Run** `npx vitest run client/src/ui/controls.test.tsx` — Expected: FAIL (módulos inexistentes).
- [ ] **Step 3: Implement** `Select` con `Select`/`Button`/`SelectValue`/`Popover`/`ListBox`/`ListBoxItem` y `Combobox` con `ComboBox`/`Input`/`Button`/`Popover`/`ListBox`, `menuTrigger="focus"`, `defaultFilter` que normaliza con `normalize("NFD")` sin marcas y en mayúsculas (mismo criterio que `client/src/matchesSearch.ts`), `allowsEmptyCollection` y `ListBox` con `renderEmptyState`. Estilos: caja con `fieldClass` de `Shell.tsx`; lista `rounded-lg border border-border bg-card shadow-md max-h-[min(20rem,50dvh)] overflow-auto`; ítem seleccionado con marca (icono `Check` de lucide) además del color; icono `ChevronDown`.
- [ ] **Step 4: Run** `npx vitest run client` — Expected: PASS.
- [ ] **Step 5: Commit** `git add client/src/ui` — `feat: add Select and Combobox controls`.

### Task 2: Filtros de Casos con los controles nuevos y panel móvil

**Files:**
- Modify: `client/src/Casos.tsx`, `client/src/screens.test.tsx`
- Create: `client/src/CaseFilters.tsx`

**Interfaces:**
- Consumes: `Select`, `Combobox`, `Option` (Task 1).
- Produces: `CaseFilters({ values: { estado: string; plazo: string; area: string; tipo: string; tema: string }, options: { areas: Option[]; tipos: Option[]; temas: Option[] }, onChange: (key: "estado" | "plazo" | "area" | "tipo" | "tema", value: string) => void, activeCount: number })`. Renderiza: escritorio (`md:` y mayores) Estado y Plazo siempre visibles y botón "Filtros" que despliega Proveedor/Tipo/Tema; móvil un botón "Filtros (N)" que abre un `Sheet` inferior con los cinco controles y botón "Listo".

- [ ] **Step 1: Update/write failing tests** en `screens.test.tsx`: en escritorio (stub `matchMedia` en `true`) Estado y Plazo son controles accesibles por su etiqueta y elegir "Por vencer" pide `/api/casos?plazo=por-vencer`; el botón "Filtros" despliega Proveedor, Tipo y Tema; escribir en Proveedor y elegir filtra por `area`; en móvil (`matchMedia` en `false`) el botón dice "Filtros (2)" con `?plazo=vencido&area=Tienda`, abre un `dialog` con los cinco controles y "Listo" lo cierra; `?area=Inexistente` muestra "Inexistente" seleccionado y se limpia con "Todos"; los chips y "Quitar filtros" siguen funcionando. Reescribir los tests que usaban `getByLabelText("Estado")` sobre `<select>` nativo.
- [ ] **Step 2: Run** `npx vitest run client` — Expected: FAIL.
- [ ] **Step 3: Implement** `CaseFilters` y usarlo en `Casos.tsx` (quitar los `<select>` y `<details>` actuales; `activeCount` = filtros distintos de vacío entre los cinco más `cola`, `mes`, `fecha`). Opciones salen de `optionValues` ya existente, convertidas a `Option`.
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS. Revisión visual a 375 y 1280px.
- [ ] **Step 5: Commit** `git add client/src` — `feat: searchable filters and mobile filter sheet in Casos`.

### Task 3: Sidebar de tres anchos

**Files:**
- Modify: `client/src/Shell.tsx`, `client/src/shell.test.tsx`

**Interfaces:**
- Produces: `Nav({ compact?: boolean, onNavigate?: () => void })`; en `compact` los ítems muestran solo el icono con `aria-label` y `title` iguales al nombre, "Nuevo caso" pasa a botón de icono, y el contador de vencidos queda como punto numerado sobre el icono de Casos.

- [ ] **Step 1: Write failing tests:** a ≥1024px (clase `lg:flex`) el `aside` muestra textos; en el `aside` compacto (`md:flex lg:hidden`) cada enlace tiene `aria-label` ("Panel", "Casos", "Proveedores", "Nuevo caso"); el contador `63 vencidos` está presente en ambos modos. Como jsdom no evalúa media queries, comprobar la existencia de los dos `aside` con sus clases y atributos.
- [ ] **Step 2: Run** `npx vitest run client/src/shell.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** dos `aside` (completo `hidden lg:flex w-52`, compacto `hidden md:flex lg:hidden w-16`) usando el mismo `Nav` con `compact`.
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS. Revisión visual a 768, 1024 y 1280px.
- [ ] **Step 5: Commit** `git add client/src` — `feat: icon rail sidebar on tablet widths`.

### Task 4: Nombres, encabezados y tablas responsive

**Files:**
- Modify: `client/src/Shell.tsx` (menú: "Panel"), `client/src/Resumen.tsx`, `client/src/Casos.tsx`, `client/src/Proveedores.tsx`, `client/src/CaseDetail.tsx`, `client/src/screens.test.tsx`, `client/src/shell.test.tsx`, `client/src/proveedores.test.tsx`

**Interfaces:**
- Produces: `PageHead({ title: string; lede?: string })` ya existente; cada pantalla pasa un `lede` con el dato vivo indicado en el spec.

- [ ] **Step 1: Update/write failing tests:** textos del spec ("Panel", "Sin fecha de inicio", "Plazos de casos abiertos", "Tasa de cierre por tipo", "Filtros", botón "Abrir" con `aria-label` "Ver detalle"); ledes "245 abiertos · 63 vencidos" en Panel, "N casos" en Casos, "N proveedores" en Proveedores; encabezados de tabla numéricos alineados a la derecha (`text-right`); en Proveedores móvil (`matchMedia` en `false`) cada proveedor es una tarjeta con casos, abiertos, vencidos y días, y `null` se muestra "—".
- [ ] **Step 2: Run** `npx vitest run client` — Expected: FAIL.
- [ ] **Step 3: Implement** renombres, ledes, encabezados `sticky top-0 bg-card` con contenedor de scroll `max-h-[calc(100dvh-16rem)]` en Casos y Proveedores, y la variante de tarjetas de Proveedores bajo 768px (reutilizar `useMinWidth` de `Casos.tsx`, moviéndolo a `client/src/useMinWidth.ts`).
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** `git add client/src` — `refactor: clearer names, live subtitles and responsive tables`.

### Task 5: Recorrido responsive y documentación

**Files:**
- Modify: según hallazgos en `client/src/*.tsx`; `docs/proyecto/cliente.md`, `README.md`

- [ ] **Step 1: Recorrido** con `npm run build && npm run serve -- ./data/pqr.sqlite` en el navegador a 320, 375, 768, 1024 y 1280px: Panel, Casos (con panel de filtros abierto y detalle abierto), Proveedores (fila abierta) y `/casos/nuevo`. Comprobar en cada uno `document.documentElement.scrollWidth === innerWidth`.
- [ ] **Step 2: Fix** en un solo pase lo que desborde u oculte contenido; cada arreglo con su prueba si es de lógica, o anotado si es solo de estilo.
- [ ] **Step 3: Docs.** `cliente.md`: controles de `client/src/ui/`, `CaseFilters.tsx`, `useMinWidth.ts`, sidebar de tres anchos, nombres nuevos. `README.md`: el nombre "Panel".
- [ ] **Step 4: Full verification** `npm test && npm run build` — Expected: todo en verde.
- [ ] **Step 5: Commit** — `docs: describe responsive controls and naming`.

## Self-review

- Cobertura del spec: controles (Task 1), filtros y panel móvil (Task 2), sidebar (Task 3), nombres, encabezados y tablas (Task 4), verificación y docs (Task 5).
- Tipos consistentes: `Option` (Tasks 1→2), `Nav` `compact` (Task 3), `PageHead` sin cambios de firma (Task 4).
- Riesgo: las pruebas de React Aria en jsdom pueden necesitar `user-event`; la restricción global obliga a pedir aprobación antes de instalarlo.
