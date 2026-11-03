# Cliente web (`client/`)

Vite (root `client/`), React 19, React Router, Tailwind 4, Recharts. Dev en 5173 con proxy de `/summary` y `/api` a `127.0.0.1:3000`. Build en `client/dist`. `index.css` declara `@source "../../src"` para que Tailwind genere las clases de `src/components`.

## Sistema visual

- **Dirección "editorial técnico"**: esquinas rectas (tarjetas, tablas, ventanas, barras y etiquetas a 0 px; controles y teclas a 2 px, vía `--radius-*` en `index.css`), filetes finos, sin sombras salvo en menús y ventanas flotantes, fondo plano y foco con anillo nítido de 2 px con separación. **Sin librería de iconos** (`lucide-react` se quitó): navegación con numerales mono (`01 Panel`), variaciones con signo (`+20 %`), botones de texto, y `ui/Mark.tsx` (`src/components/ui/mark.tsx`) con 3 marcas dibujadas a medida (chevron, cruz, flecha) de trazo con extremos rectos. Encabezados de página con etiqueta mono (`PANEL · fecha`) y filete inferior; encabezados de tabla en versalitas mono; tarjetas con filete superior de 2 px; alertas con barra izquierda gruesa. `client/src/style.test.ts` vigila que no vuelvan píldoras, sombras suaves, halos, blur ni iconos de librería.
- **Tipografía**: Geist y Geist Mono (Google Fonts); las cifras usan `tabular-nums`.
- **Tema**: solo claro. Tokens en `index.css` (`:root`); `--destructive` es el rojo de peligro.
- **Gráficos**: `useChartColors()` lee las variables CSS del tema activo (los atributos SVG no resuelven `var()`); `palette.ts` asigna un color fijo a cada tipo (validado con `validate_palette.js`; en claro, aqua, amarillo y magenta tienen contraste <3:1, por eso siempre van con texto, ver `ui/TipoTag.tsx`).
- **Movimiento** (`index.css`, variables `--ease-out`, `--dur-fast/base/slow` = 150/220/320 ms; solo `opacity` y `transform`): entrada escalonada `fade-up` (variable `--i`, tope 300 ms) en filas, tarjetas y chips; `grow-x` en barras; `reveal-x` en líneas pequeñas; esqueleto con brillo (`shimmer`); al recargar Casos las filas viejas se atenúan (`is-reloading`, `aria-busy`) en vez de desaparecer; cifras que cuentan hasta su valor (`useCountUp`, solo si hay `matchMedia` y no hay `prefers-reduced-motion`); fundido entre pantallas con View Transitions (`createBrowserRouter` + `viewTransition`, Chromium) y presión/elevación sutil en controles y tarjetas. Todo se apaga con `prefers-reduced-motion`.

## Pantallas (`App.tsx`)

| Ruta | Componente | Función |
|---|---|---|
| `/` | `Resumen` (título "Panel") | 4 indicadores (`StatCard`) con mini gráfico y variación contra el mes anterior (solo meses completos: el mes en curso, en hora de Bogotá, se ignora): Abiertos, Entrados, Tasa de cierre y Días promedio; banda de alertas (Vencidos, Sin fecha de inicio); Entrados y cerrados con selector 6 m / 12 m / Todo; Plazos de casos abiertos (`SegmentedBar`); Abiertos por proveedor y Temas abiertos (top 8); Tasa de cierre por tipo |
| `/casos` | `Casos` | Botón "Exportar Excel" en el encabezado (descarga lo filtrado con `exportCases` de `api.ts`; deshabilitado sin resultados). `CaseFilters` en una tarjeta (buscador, Estado y Plazo, "Filtros"; en móvil un panel inferior); chips de filtros de la URL; tabla (Fecha, Proveedor, Tipo con `TipoTag`, Tema, Plazo con `PlazoBar`) con encabezado fijo, o tarjetas en móvil; "Abrir" muestra `CaseDetail` con `CaseTimeline` y la sección Bitácora (`Bitacora.tsx`: avances con fecha, alta en línea, casos abiertos o cerrados) |
| `/casos/nuevo`, `/casos/:id/cerrar` | `NuevoCaso`, `CerrarCaso` (`CaseForm.tsx`) | Rutas hijas de `/casos`: ventanas modales (`ui/FormDialog.tsx`) sobre la lista, que sigue montada. Nuevo caso: Datos del caso y Clasificación en filas de 4 columnas y Motivo (unos 540 px, sin scroll en escritorio; listas de `/api/catalogos`). Cerrar caso: resumen del caso con barra de plazo, fecha de solución (hoy en hora de Bogotá) y texto. Ctrl/⌘ + Enter guarda, Esc o Cancelar vuelven a la lista; al guardar, la lista se recarga (`reload` por contexto del `Outlet`). En móvil ocupan toda la pantalla con pie fijo |
| `/proveedores` | `Proveedores` | Tabla con barra de abiertos y alerta de vencidos (tarjetas en móvil); fila expandible con `ProveedorDetalle` (desglose por tipo, línea de tiempo, renombrar) |

## Marco (`Shell.tsx`)

Barra superior con migas, búsqueda (⌘K / Ctrl K), interruptor de tema y "Nuevo caso". Sidebar completo (≥1024px), columna de iconos (768–1023px) o menú móvil (<768px), con contador de vencidos (`useVencidos.ts`) y "Datos al <fecha>". `CommandPalette.tsx`: ir a pantallas, acciones y casos por orden, asociado o correo (máx. 8, cargados una vez); el foco vuelve a donde estaba al cerrar.

## Componentes (`client/src/`)

- `ui/` — `FormDialog`, `Select`, `Combobox` (react-aria-components; sus popovers llevan `pointer-events-auto` porque un diálogo modal de Radix deja el `body` sin eventos, y dentro de `FormDialog` y del panel de filtros se dibujan dentro de la propia ventana con `UNSAFE_PortalProvider`, para que el bloqueo de scroll del modal no impida desplazar listas largas; con una lista abierta, Esc cierra solo la lista), `StatCard`, `Sparkline`, `SegmentedBar`, `PlazoBar`, `CaseTimeline`, `TipoTag`, `options.ts`.
- `charts.tsx` (`useMotion`, `ChartTip`, `Meter`, `axisTick`), `metrics.ts` (`deltaPct`, `tasaCierre`), `palette.ts`, `theme.ts`, `useChartColors.ts`, `useMinWidth.ts`.
- `api.ts` — `getSummary`, `getCases`, `getCatalogs`, `createCase`, `closeCase`, `getProveedores`, `createProveedor`, `renameProveedor`, `getProviderTimeline`, `ApiError`. `format.ts` — `casosHref`, `plazoLabel`, `percent`, `promedioText`, `textOrDash`.

## Componentes compartidos (`src/`)

- `components/ui/` — shadcn: `mark`, badge (incluye `destructive`; etiquetas rectas con borde), button, card, input, label, separator, sheet, skeleton, tabs, textarea, tooltip.

## Pruebas

`client/src/screens.test.tsx` (Casos), `panel.test.tsx`, `shell.test.tsx`, `commandPalette.test.tsx`, `proveedores.test.tsx`, `caseform.test.tsx`, `closecase.test.tsx`, `theme.test.tsx`, `palette.test.ts`, `metrics.test.ts`, `ui/*.test.tsx`.
