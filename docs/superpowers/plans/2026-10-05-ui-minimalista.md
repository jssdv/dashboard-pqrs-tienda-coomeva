# UI minimalista Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplificar la webapp: Resumen en 4 bloques, sidebar con "Nuevo caso", Proveedores con tabla y detalle, Casos con filtros compactos y panel de detalle.

**Architecture:** Dos datos nuevos en el servidor (`sinFechaValida`, métricas por proveedor y filtro `fecha`), y reorganización de `client/src/` en pantallas más pequeñas que reutilizan los componentes existentes (Card, Badge, Sheet, Recharts, `casosHref`).

**Tech Stack:** TypeScript, React 19, React Router 7, Tailwind 4, Recharts, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-05-ui-minimalista-design.md`

## Global Constraints

- Idioma de la UI: español. Objetivos táctiles `min-h-11`. Estado nunca solo por color.
- Escala de espacio de 8px: gaps `gap-4`/`gap-6`, tarjetas `p-5`; contenido `max-w-[72rem]`; sidebar `w-52` (13rem).
- Colores de gráficas desde tokens (`var(--primary)`, `var(--warning)`, `var(--muted-foreground)`), sin hex nuevos.
- No se exponen datos personales en `/summary` ni `/api/proveedores`.
- Sin festivos: las métricas de plazo son `null` y la UI muestra "—" o "Sin festivos"; nunca un número inventado.
- Cada tarea termina con `npx vitest run` en verde y `npm run build` sin errores.
- Commits: `git add` solo de los archivos de la tarea; mensajes `feat:`/`refactor:` con la línea `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Resumen con 0 abiertos y con `sinFechaValida` = 0: la cifra se muestra "0" sin enlace roto (Task 2).
- Proveedor con casos pero ninguno cerrado: `diasPromedio` null → "—" en la tabla (Tasks 1, 4).
- Nombre de proveedor con `/` o tildes al abrir su detalle (Task 4).
- Casos: filtro oculto en "Más filtros" que está activo por URL debe verse como chip y poder quitarse (Task 5).
- Panel de detalle: cerrar con Escape devuelve el foco a la fila; "Cerrar caso" solo en casos abiertos (Task 5).
- Contador de vencidos en el sidebar cuando `/summary` falla o no hay festivos: no se muestra, la navegación sigue funcionando (Task 3).

---

### Task 1: Datos nuevos en dominio y API

**Files:**
- Modify: `src/domain/summary.ts`, `src/api/summaryServer.ts`
- Modify: `tests/domain/summary.test.ts`, `tests/api/summaryServer.test.ts`

**Interfaces:**
- Produces:
  - `DashboardSummary.sinFechaValida: number`
  - `GET /api/proveedores` → `{ proveedores: Array<{ nombre: string; casos: number; abiertos: number; vencidos: number | null; diasPromedio: number | null }> }`
  - `GET /api/casos?fecha=invalida` → solo casos con `fechaInicial === null || fechaInicialInvalida`.

- [ ] **Step 1: Write failing tests.** `summary.test.ts`: tres abiertos (uno `fechaInicial: null`, uno `fechaInicialInvalida: true`, uno válido) y un cerrado sin fecha → `sinFechaValida === 2`; lista vacía → `0`. `summaryServer.test.ts`: proveedor con 2 abiertos (uno vencido a `now = 2026-01-19`), 1 cerrado con `diasSolucion 4` → `{ casos: 3, abiertos: 2, vencidos: 1, diasPromedio: 4 }`; sin festivos → `vencidos: null`; proveedor sin cierres → `diasPromedio: null`; `?fecha=invalida` devuelve solo los dos casos sin fecha utilizable.
- [ ] **Step 2: Run** `npx vitest run tests` — Expected: FAIL.
- [ ] **Step 3: Implement.** `sinFechaValida` en `summarize`; en el handler `/api/proveedores` agrupar `repository.list()` por `area` y calcular métricas (`vencidos` con `riskOf`, `null` si no hay festivos; promedio sobre `diasSolucion` no nulos de casos con fechas válidas); filtro `fecha` en `queryOf`/`applyFilters`.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `git add src/domain/summary.ts src/api/summaryServer.ts tests/domain/summary.test.ts tests/api/summaryServer.test.ts` — `feat: expose invalid-date count and per-provider metrics`.

### Task 2: Resumen minimalista

**Files:**
- Modify: `client/src/Resumen.tsx`, `client/src/types.ts`, `client/src/api.ts` (tipos), `client/src/screens.test.tsx`
- Create: `client/src/ProveedorDetalle.tsx` (recibe aquí `ProviderMatrix` y `ProviderTimeline` movidos desde `Resumen.tsx`; se completa en Task 4)
- Modify: `client/src/format.ts` (`filterLabel` para `fecha`)

**Interfaces:**
- Consumes: `sinFechaValida`, `fecha=invalida` (Task 1).
- Produces: `Resumen()` con bloques, en orden: franja de 4 cifras (`Abiertos`→`/casos?estado=abiertos`, `Vencidos`→`/casos?plazo=vencido`, `Sin fecha válida`→`/casos?estado=abiertos&fecha=invalida`, `Días promedio` sin enlace); `Entrados y cerrados`; `Plazos` (en plazo / por vencer / vencido / sin fecha, cada uno con enlace al filtro correspondiente); `Abiertos por proveedor` y `Temas abiertos` (top 5, `TOP = 5`); `Cierre por tipo` como tabla de 5 filas con barra en línea.

- [ ] **Step 1: Update/write failing tests** en `screens.test.tsx` (helper `summary()` con `sinFechaValida: 0`): las cuatro cifras y sus `href`; ya no existen los textos "Total", "Cerrados", "Proveedor por tipo", "Línea de tiempo por proveedor" ni la tabla de meses; `Plazos` incluye "Sin fecha válida" con el conteo; la cifra "0" de `sinFechaValida` no es enlace roto (sigue siendo enlace a la lista vacía); conservar el test de enlaces `/casos?mes=…`, `?estado=abiertos&area=…`, `?tema=…`, `?tipo=RECLAMO`; ajustar `.recharts-responsive-container` a 1 (solo el flujo). Eliminar los tests del selector de línea de tiempo y de la matriz de Resumen (se reescriben en Task 4).
- [ ] **Step 2: Run** `npx vitest run client` — Expected: FAIL.
- [ ] **Step 3: Implement.** Quitar de `Resumen.tsx` Kpi Total/Cerrados, `CloseChart`, tabla de meses, `ProviderMatrix` y `ProviderTimeline` (mover los dos últimos a `ProveedorDetalle.tsx` tal cual, exportados). `PageHead`-like encabezado: solo `<h1>Resumen</h1>`. Colores de `FlowChart` desde tokens CSS. `Cierre por tipo`: `<table>` con columna de barra `Meter` reutilizando `percent`.
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** `git add client/src` — `refactor: simplify Resumen to four blocks`.

### Task 3: Sidebar y encabezados

**Files:**
- Modify: `client/src/Shell.tsx`, `client/src/screens.test.tsx` (test "keeps scrolling inside the content pane": `max-w-[72rem]`)
- Create: `client/src/useVencidos.ts`

**Interfaces:**
- Produces: `useVencidos(): number | null` (llama `getSummary()` una vez, devuelve `colaVencida` o `null` si falla o es `null`); `PageHead({ title, lede? })` sin eyebrow.

- [ ] **Step 1: Write failing tests:** el sidebar (`<aside>`) contiene enlace "Nuevo caso" a `/casos/nuevo` y no contiene "Tienda Coomeva"; el enlace Casos muestra el contador `63` cuando `colaVencida = 63` y nada cuando es `null` o el fetch falla; el panel móvil no tiene botón "Cerrar menú"; `PageHead` no renderiza el eyebrow.
- [ ] **Step 2: Run** `npx vitest run client` — Expected: FAIL.
- [ ] **Step 3: Implement.** `aside` `w-52` sin `Brand` ni `Separator`; botón primario "Nuevo caso" arriba; `NavLink` Casos con contador (`Badge variant="destructive"` con `aria-label="N vencidos"`). Móvil: barra superior (`md:hidden`) con nombre "PQRS" y botón "Menú"; el `Sheet` cierra al navegar y mantiene el control de cierre propio del panel.
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS. Revisión visual a 375px y 1280px.
- [ ] **Step 5: Commit** `git add client/src` — `refactor: slim sidebar with new-case action`.

### Task 4: Proveedores con tabla y detalle

**Files:**
- Modify: `client/src/Proveedores.tsx`, `client/src/ProveedorDetalle.tsx`, `client/src/api.ts` (`ProveedorRow` con las métricas nuevas), `client/src/types.ts`
- Modify: `client/src/screens.test.tsx` (o crear `client/src/proveedores.test.tsx` con el mismo patrón de mocks)

**Interfaces:**
- Consumes: `/api/proveedores` extendido (Task 1), `/api/proveedores/:nombre/linea`, `summary.matrizProveedorTipo`.
- Produces: `ProveedorDetalle({ row: ProveedorRow, tipos: MatrixRow | undefined, onRename: (desde: string, hacia: string) => Promise<void> })`; la línea de tiempo usa dos `Line` (entrados, cerrados) sin eje secundario y con tooltip que incluye días promedio.

- [ ] **Step 1: Write failing tests:** tabla con columnas Proveedor, Casos, Abiertos, Vencidos, Días promedio (valores `null` → "—"); clic en una fila abre el detalle con su desglose por tipo (enlaces a `/casos?area=…&tipo=…`) y pide `/api/proveedores/<nombre codificado>/linea`; proveedor con `/` en el nombre pide la URL codificada; renombrar desde el detalle llama `POST /api/proveedores/renombrar` y recarga; el campo "Nuevo proveedor" en línea crea y recarga; error de red muestra `role="alert"`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.** Cargar `getProveedores()` y `getSummary()` en paralelo; tabla ordenada por abiertos descendente; detalle como fila expandible (`aria-expanded`) en escritorio y bloque bajo la tarjeta en móvil; reutilizar `ProviderTimeline` con las dos líneas.
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS. Revisión visual.
- [ ] **Step 5: Commit** `git add client/src` — `feat: provider table with detail and timeline`.

### Task 5: Casos compacto con panel de detalle

**Files:**
- Modify: `client/src/Casos.tsx`, `client/src/format.ts`, `client/src/screens.test.tsx`
- Create: `client/src/CaseDetail.tsx`

**Interfaces:**
- Consumes: `fecha=invalida` (Task 1), `Sheet` de `@/components/ui/sheet`.
- Produces: `CaseDetail({ caso: PqrCase | null, onClose: () => void })` (panel lateral con todos los campos, incluidos asociado, correo, orden, motivo y solución, y el enlace "Cerrar caso" solo si está abierto); `Casos()` con buscador, Estado y Plazo visibles, `Más filtros` (`<details>`) con Proveedor, Tipo y Tema, y chips de filtros activos con botón "Quitar".

- [ ] **Step 1: Update/write failing tests:** reescribir "expands a case…" para abrir el panel al hacer clic en la fila y ver "Ana Ruiz", "ORD-9", "El pedido no llegó"; "Cerrar caso" apunta a `/casos/2026-2/cerrar` y no aparece en casos cerrados; Escape cierra el panel; un filtro de Proveedor activo por URL (`?area=Tienda`) aparece como chip "Proveedor Tienda" y "Quitar" lo elimina de la URL; `?fecha=invalida` muestra chip "Sin fecha válida"; la columna Asociado ya no existe; la columna Plazo muestra "N días" en cerrados y el texto de `plazoLabel` en abiertos; conservar tests de búsqueda, paginación y filtro por tema.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.** Columnas Fecha, Proveedor, Tipo, Tema, Plazo; fila clicable (`role="button"`, `tabIndex`, Enter/Espacio); tarjetas móviles con cuatro líneas y el mismo panel; `min-w` de la tabla ≤ `40rem`; `filterLabel` cubre `fecha`.
- [ ] **Step 4: Run** `npx vitest run` y `npm run build` — Expected: PASS. Revisión visual a 375px y 1280px: filtros en una sola fila, sin scroll horizontal de página.
- [ ] **Step 5: Commit** `git add client/src` — `refactor: compact case list with detail panel`.

### Task 6: Limpieza y documentación

**Files:**
- Delete: `src/domain/areaCurves.ts`, `tests/domain/areaCurves.test.ts`
- Modify: `src/domain/summary.ts` (quitar `curvas`), `client/src/types.ts` (quitar `AreaCurve`, `CurveSeries`, `CurvePoint`, `curvas`), `client/src/screens.test.tsx` (helper `summary()`), `docs/proyecto/cliente.md`, `docs/proyecto/dominio.md`, `docs/proyecto/api.md`, `README.md`

- [ ] **Step 1: Verify no uso** `grep -rn "curvas\|areaCurves" src client tests` — Expected: solo los archivos a editar.
- [ ] **Step 2: Remove** el cálculo y los tipos; ajustar tests que construyen `summary()` / `summarize`.
- [ ] **Step 3: Docs.** Actualizar las tres páginas de `docs/proyecto/` y el README (pantallas nuevas, datos nuevos, filtro `fecha`, endpoint de proveedores extendido).
- [ ] **Step 4: Full verification** `npm test && npm run build` — Expected: todo en verde. Recorrido final en el navegador (375px y 1280px) de Resumen, Casos, Proveedores y el formulario de caso.
- [ ] **Step 5: Commit** — `refactor: remove unused area curves and update docs`.

## Self-review

- Cobertura del spec: sidebar y encabezados (Task 3), Resumen (Task 2), Proveedores (Task 4), Casos (Task 5), espacio y tokens (Tasks 2–5, restricciones globales), datos nuevos (Task 1), limpieza de `curvas` (Task 6).
- Tipos consistentes: `ProveedorRow` (Tasks 1→4), `sinFechaValida` (1→2), `fecha=invalida` (1→2, 5).
- Decisión: "Cierre por tipo" se mantiene en Resumen como tabla de 5 filas (el spec lo lista como bloque), por lo que Resumen tiene la franja y 5 bloques.
