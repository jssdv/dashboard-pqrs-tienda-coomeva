# Cliente web (`client/`)

Vite (root `client/`), React 19, React Router, Tailwind 4, Recharts. Dev en 5173 con proxy de `/summary` y `/api` a `127.0.0.1:3000`. Build en `client/dist`. `index.css` declara `@source "../../src"` para que Tailwind genere las clases de `src/components`.

## Pantallas (`App.tsx`)

| Ruta | Componente | Función |
|---|---|---|
| `/` | `Resumen` (título "Panel") | 4 cifras clicables (Abiertos, Vencidos, Sin fecha de inicio, Días promedio); Entrados y cerrados; Plazos de casos abiertos; Abiertos por proveedor y Temas abiertos (top 5); Tasa de cierre por tipo |
| `/casos` | `Casos` | `CaseFilters`: buscador, Estado y Plazo (`Select`) visibles y botón "Filtros" que despliega Proveedor, Tipo y Tema (`Combobox` con búsqueda); en móvil, botón "Filtros (N)" que abre un panel inferior. Filtros de la URL como chips; tabla (Fecha, Proveedor, Tipo, Tema, Plazo) con encabezado fijo, o tarjetas en móvil; "Abrir" muestra `CaseDetail` |
| `/casos/nuevo`, `/casos/:id/cerrar` | `NuevoCaso`, `CerrarCaso` (`CaseForm.tsx`) | Alta (Fuente y Tipo con `Select`; Proveedor y Tema con `Combobox`; listas de `/api/catalogos`, sin "Todos"; aviso si no hay datos cargados) y cierre |
| `/proveedores` | `Proveedores` | Tabla con casos, abiertos, vencidos y días promedio; fila expandible con `ProveedorDetalle` (desglose por tipo, línea de tiempo, renombrar); alta en línea |

## Archivos

- `Shell.tsx` — sidebar completo (≥1024px), columna de iconos de 4rem (768–1023px) o barra superior con "Menú" (<768px); "Nuevo caso" y contador de vencidos (`useVencidos.ts`). `PageHead` (título y línea opcional) y `Card`.
- `ui/` — `Select` y `Combobox` propios sobre `react-aria-components` (opción "Todos" = valor vacío; el Combobox filtra sin tildes ni mayúsculas); `ui/options.ts` con estilos y helpers.
- `CaseFilters.tsx`, `useMinWidth.ts` — filtros de Casos y hook de media query.
- `CaseDetail.tsx` — panel lateral con todos los campos y "Cerrar caso" (solo abiertos).
- `charts.tsx` — `useMotion`, `ChartTip`, `Meter` y colores de gráficas (hex espejo de los tokens, porque los atributos SVG no resuelven `var()`).
- `api.ts` — fetch (`getSummary`, `getCases`, `createCase`, `closeCase`, `getProveedores`, `createProveedor`, `renameProveedor`, `getProviderTimeline`, `ApiError`). `format.ts` — `casosHref`, `plazoLabel`, `percent`, `promedioText`, `textOrDash`.

## Componentes compartidos (`src/`)

- `components/ui/` — shadcn: badge (incluye `destructive`), button, card, input, label, separator, sheet, skeleton, tabs, textarea, tooltip.
- `components/base/`, `components/foundations/` — Untitled UI sobre react-aria e iconos (sin uso aparente en pantallas).
- `styles/`, `lib/utils.ts`, `utils/cx.ts` — tema y utilidades.

## Pruebas

`client/src/screens.test.tsx`, `shell.test.tsx`, `proveedores.test.tsx`, `ui/controls.test.tsx`, `matchesSearch.test.ts`.
