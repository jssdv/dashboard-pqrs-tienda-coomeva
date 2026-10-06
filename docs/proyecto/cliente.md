# Cliente web (`client/`)

Vite (root `client/`), React 19, React Router, Tailwind 4, Recharts. Dev en 5173 con proxy de `/summary` y `/api` a `127.0.0.1:3000`. Build en `client/dist`. `index.css` declara `@source "../../src"` para que Tailwind genere las clases de `src/components`.

## Sistema visual

- **Tipografía**: Geist y Geist Mono (Google Fonts); las cifras usan `tabular-nums`.
- **Tema**: claro, oscuro o del sistema (`theme.ts`, `ui/ThemeToggle.tsx`). La clase `dark` en `<html>` se aplica antes de pintar con un script en `client/index.html`; la elección se guarda en `localStorage` (`pqr-theme`) y todo funciona sin él. Tokens en `index.css` (`:root` y `.dark`); `--destructive` es el rojo de peligro.
- **Gráficos**: `useChartColors()` lee las variables CSS del tema activo (los atributos SVG no resuelven `var()`); `palette.ts` asigna un color fijo a cada tipo (validado con `validate_palette.js`; en claro, aqua, amarillo y magenta tienen contraste <3:1, por eso siempre van con texto, ver `ui/TipoTag.tsx`).
- **Movimiento**: entrada de 200 ms (`rise-in`) y animación de gráficos, apagados con `prefers-reduced-motion`.

## Pantallas (`App.tsx`)

| Ruta | Componente | Función |
|---|---|---|
| `/` | `Resumen` (título "Panel") | 4 indicadores (`StatCard`) con mini gráfico y variación contra el mes anterior: Abiertos, Entrados, Tasa de cierre y Días promedio; banda de alertas (Vencidos, Sin fecha de inicio); Entrados y cerrados con selector 6 m / 12 m / Todo; Plazos de casos abiertos (`SegmentedBar`); Abiertos por proveedor y Temas abiertos (top 8); Tasa de cierre por tipo |
| `/casos` | `Casos` | `CaseFilters` en una tarjeta (buscador, Estado y Plazo, "Filtros"; en móvil un panel inferior); chips de filtros de la URL; tabla (Fecha, Proveedor, Tipo con `TipoTag`, Tema, Plazo con `PlazoBar`) con encabezado fijo, o tarjetas en móvil; "Abrir" muestra `CaseDetail` con `CaseTimeline` |
| `/casos/nuevo`, `/casos/:id/cerrar` | `NuevoCaso`, `CerrarCaso` (`CaseForm.tsx`) | Alta en secciones (Datos del caso, Clasificación, Detalle; listas de `/api/catalogos`) y cierre |
| `/proveedores` | `Proveedores` | Tabla con barra de abiertos y alerta de vencidos (tarjetas en móvil); fila expandible con `ProveedorDetalle` (desglose por tipo, línea de tiempo, renombrar) |

## Marco (`Shell.tsx`)

Barra superior con migas, búsqueda (⌘K / Ctrl K), interruptor de tema y "Nuevo caso". Sidebar completo (≥1024px), columna de iconos (768–1023px) o menú móvil (<768px), con contador de vencidos (`useVencidos.ts`) y "Datos al <fecha>". `CommandPalette.tsx`: ir a pantallas, acciones y casos por orden, asociado o correo (máx. 8, cargados una vez); el foco vuelve a donde estaba al cerrar.

## Componentes (`client/src/`)

- `ui/` — `Select`, `Combobox` (react-aria-components), `StatCard`, `Sparkline`, `SegmentedBar`, `PlazoBar`, `CaseTimeline`, `TipoTag`, `ThemeToggle`, `options.ts`.
- `charts.tsx` (`useMotion`, `ChartTip`, `Meter`, `axisTick`), `metrics.ts` (`deltaPct`, `tasaCierre`), `palette.ts`, `theme.ts`, `useChartColors.ts`, `useMinWidth.ts`.
- `api.ts` — `getSummary`, `getCases`, `getCatalogs`, `createCase`, `closeCase`, `getProveedores`, `createProveedor`, `renameProveedor`, `getProviderTimeline`, `ApiError`. `format.ts` — `casosHref`, `plazoLabel`, `percent`, `promedioText`, `textOrDash`.

## Componentes compartidos (`src/`)

- `components/ui/` — shadcn: badge (incluye `destructive`), button, card, input, label, separator, sheet, skeleton, tabs, textarea, tooltip.
- `components/base/`, `components/foundations/` — Untitled UI (sin uso aparente en pantallas).

## Pruebas

`client/src/screens.test.tsx` (Casos), `panel.test.tsx`, `shell.test.tsx`, `commandPalette.test.tsx`, `proveedores.test.tsx`, `caseform.test.tsx`, `theme.test.tsx`, `palette.test.ts`, `metrics.test.ts`, `ui/*.test.tsx`.
