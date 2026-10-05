# Cliente web (`client/`)

Vite (root `client/`), React 19, React Router, Tailwind 4, Recharts. Dev en 5173 con proxy de `/summary` y `/api` a `127.0.0.1:3000`. Build en `client/dist`.

## Rutas (`App.tsx`)

| Ruta | Componente | Función |
|---|---|---|
| `/` | `Resumen` | Dashboard de agregados y gráficas |
| `/casos` | `Casos` | Lista con filtros y búsqueda (`matchesSearch.ts`) |
| `/casos/nuevo` | `NuevoCaso` (`CaseForm.tsx`) | Alta |
| `/casos/:id/cerrar` | `CerrarCaso` (`CaseForm.tsx`) | Cierre |
| `/proveedores` | `Proveedores` | Alta y renombrado |

`Shell.tsx` da el layout y la navegación (`PageHead`). `api.ts` envuelve fetch (`getSummary`, `getCases`, `createCase`, `closeCase`, `getProveedores`, `createProveedor`, `renameProveedor`, `ApiError`). `format.ts` formatea valores.

## Componentes compartidos (`src/`)

- `components/ui/` — shadcn: badge, button, card, input, label, separator, sheet, skeleton, tabs, textarea, tooltip.
- `components/base/` — Untitled UI sobre react-aria: avatar, input, select, tags, checkbox, tooltip, botones.
- `components/foundations/` — iconos de pago y de marca (sin uso aparente en pantallas).
- `styles/` — `globals.css`, `theme.css`, `typography.css`. `lib/utils.ts` y `utils/cx.ts` — merge de clases.

## Pruebas

`client/src/screens.test.tsx`, `client/src/matchesSearch.test.ts`.
