# Cliente web (`client/`)

Vite (root `client/`), React 19, React Router, Tailwind 4, Recharts. Dev en 5173 con proxy de `/summary` y `/api` a `127.0.0.1:3000`. Build en `client/dist`. `index.css` declara `@source "../../src"` para que Tailwind genere las clases de `src/components`.

## Pantallas (`App.tsx`)

| Ruta | Componente | Función |
|---|---|---|
| `/` | `Resumen` | 4 cifras clicables (Abiertos, Vencidos, Sin fecha válida, Días promedio); Entrados y cerrados; Plazos de abiertos; Abiertos por proveedor y Temas abiertos (top 5); Cierre por tipo |
| `/casos` | `Casos` | Buscador, Estado y Plazo visibles; Proveedor, Tipo y Tema en "Más filtros"; filtros de la URL como chips; tabla (Fecha, Proveedor, Tipo, Tema, Plazo) o tarjetas en móvil; "Ver" abre `CaseDetail` |
| `/casos/nuevo`, `/casos/:id/cerrar` | `NuevoCaso`, `CerrarCaso` (`CaseForm.tsx`) | Alta y cierre |
| `/proveedores` | `Proveedores` | Tabla con casos, abiertos, vencidos y días promedio; fila expandible con `ProveedorDetalle` (desglose por tipo, línea de tiempo, renombrar); alta en línea |

## Archivos

- `Shell.tsx` — sidebar de 13rem con "Nuevo caso" y contador de vencidos (`useVencidos.ts`); en móvil, barra superior con "Menú". `PageHead` (título y línea opcional) y `Card`.
- `CaseDetail.tsx` — panel lateral con todos los campos y "Cerrar caso" (solo abiertos).
- `charts.tsx` — `useMotion`, `ChartTip`, `Meter` y colores de gráficas (hex espejo de los tokens, porque los atributos SVG no resuelven `var()`).
- `api.ts` — fetch (`getSummary`, `getCases`, `createCase`, `closeCase`, `getProveedores`, `createProveedor`, `renameProveedor`, `getProviderTimeline`, `ApiError`). `format.ts` — `casosHref`, `plazoLabel`, `percent`, `promedioText`, `textOrDash`.

## Componentes compartidos (`src/`)

- `components/ui/` — shadcn: badge (incluye `destructive`), button, card, input, label, separator, sheet, skeleton, tabs, textarea, tooltip.
- `components/base/`, `components/foundations/` — Untitled UI sobre react-aria e iconos (sin uso aparente en pantallas).
- `styles/`, `lib/utils.ts`, `utils/cx.ts` — tema y utilidades.

## Pruebas

`client/src/screens.test.tsx`, `shell.test.tsx`, `proveedores.test.tsx`, `matchesSearch.test.ts`.
