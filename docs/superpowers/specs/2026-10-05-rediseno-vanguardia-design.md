# Rediseño de vanguardia — diseño

## Objetivo

Que la webapp se vea y se sienta como un producto de 2026 (calmada, densa donde importa, con jerarquía clara) para el equipo que gestiona PQRs de Tienda Coomeva: ver de un vistazo qué vence, qué cambia respecto al mes anterior y llegar a cualquier caso en segundos. No cambian datos ni reglas de negocio; solo se agregan las series mensuales que alimentan los mini gráficos.

## Decisiones tomadas con el usuario

- Dirección: **claro editorial + modo oscuro**, un solo acento verde Coomeva.
- Extras: **paleta de comandos ⌘K**, **mini gráficos con variación** en las cifras del Panel, **línea de tiempo del caso**. (Mapa de calor proveedor × tipo: fuera.)

## Referencias

- Pocas decoraciones, más densidad; la jerarquía sale del peso tipográfico y el espacio, el color queda para estado y significado. Las tablas lideran y los gráficos se usan donde una tendencia necesita forma ([AdminLTE](https://adminlte.io/blog/saas-dashboard-design-examples/), [925 Studios](https://www.925studios.co/blog/saas-dashboard-design-examples-2026)).
- Cada tarjeta de indicador lleva valor, variación contra el periodo anterior y un mini gráfico en línea (patrón de Stripe) ([SetProduct](https://www.setproduct.com/blog/dashboard-ui-design)).
- Tendencias 2026: diseño calmo, divulgación progresiva y paleta de comandos con atajo global ([SaaS UI Design](https://www.saasui.design/blog/7-saas-ui-design-trends-2026)).
- Gráficos tematizados con variables CSS y tooltips consistentes, como los de shadcn/ui sobre Recharts ([shadcn charts](https://ui.shadcn.com/docs/components/base/chart)).
- Sistema sugerido por la skill de UX para paneles operativos: estilo "Data-Dense Dashboard", densidad alta, acento ámbar para destacar, foco visible y `prefers-reduced-motion`.
- Reglas de la skill `dataviz`: un solo eje por gráfico, paleta categórica validada con `validate_palette.js`, hover en todo gráfico, leyenda siempre con ≥2 series, estado nunca solo por color.

## Sistema visual

| Elemento | Decisión |
|---|---|
| Tipografía | Geist (titulares y texto, 400–700) y Geist Mono (cifras y fechas, con `tabular-nums`) desde Google Fonts; reemplazan a Inter, Sora y JetBrains Mono. Escala: título de página 28/32 semibold con `tracking-tight`; sección 15/20 semibold; cuerpo 14; etiqueta 12 en mayúscula suave solo para encabezados de tabla. |
| Color | Tokens ya existentes en `client/src/index.css` (`:root` y `.dark`), afinados: fondo `#fafaf9`/`#0c1210`, acento verde `#00843d`/`#3dce7a`, ámbar para "por vencer", rojo para "vencido" (token nuevo `--danger`, distinto del ámbar actual). Estado = color + icono + texto. |
| Superficies | Tarjetas con borde de 1px y sin sombra; una sombra suave solo en menús y paneles flotantes. Radio 12px en tarjetas, 8px en controles. Fondo de página con un degradado radial verde muy sutil en la esquina superior (existe `app-canvas`). |
| Espacio | Escala de 4/8px; contenido máximo 76rem; separación de secciones 24px; tarjetas con `p-5`. |
| Movimiento | Entrada de 200ms en tarjetas (ya existe `rise-in`), números que cuentan hasta su valor en 600ms, todo desactivado con `prefers-reduced-motion`. |
| Modo oscuro | Interruptor claro / oscuro / sistema, guardado en `localStorage` (con `try/catch`), aplicado antes de pintar para evitar parpadeo. |

## Estructura de pantallas

### Marco (Shell)
- Barra superior fija con: título de la página con ruta (migas), botón de búsqueda "Buscar… ⌘K", interruptor de tema y botón primario "Nuevo caso". En móvil: título, botón de búsqueda y menú.
- Sidebar: marca (PQRS) y tres entradas con icono, contador de vencidos en Casos y, al pie, "Datos al <fecha de hoy>" y la versión. Se conservan los tres anchos actuales (completo, solo iconos, barra móvil).
- `PageHead` pasa a título + subtítulo con dato vivo + zona de acciones a la derecha.

### Panel
- Fila de 4 indicadores con mini gráfico y variación:
  - **Abiertos**: línea de pendientes a fin de mes (últimos 12 meses).
  - **Entrados este mes**: barras mensuales de los últimos 12 meses y variación contra el mes anterior.
  - **Tasa de cierre del mes**: cerrados ÷ entrados, con variación.
  - **Días promedio de solución**: línea mensual y variación.
  Vencidos y Sin fecha de inicio van en una **banda de alertas** debajo (tarjetas anchas con icono, número y enlace "Ver casos"), porque no tienen historial y necesitan acción, no tendencia.
- **Entrados y cerrados**: área (entrados) + línea (cerrados) a 12 o 33 meses con selector de rango (6 m / 12 m / Todo), tooltip con cursor vertical y marcas de mes con más de 1,5× la media.
- **Plazos de casos abiertos**: una sola barra horizontal segmentada (en plazo / por vencer / vencido / sin fecha) con leyenda y conteos; cada segmento enlaza a Casos filtrado.
- **Abiertos por proveedor** y **Temas abiertos**: barras horizontales (Recharts) top 8 con valor al final y enlace por barra.
- **Tasa de cierre por tipo**: tabla con barra en línea y color por umbral (≥90 % verde, 70–89 % ámbar, <70 % rojo, con texto).

### Casos
- Cabecera con título y "N casos". Barra de herramientas (buscador, Estado, Plazo, Filtros) en una tarjeta con borde.
- Tabla: columnas Fecha (mono), Proveedor, Tipo (etiqueta con punto de color por tipo), Tema, **Plazo con mini barra** (días hábiles sobre 10, con marca en 5 y 10) y estado en texto. Encabezado fijo, filas de 44px, resaltado al pasar, filas clicables.
- Panel de detalle con **línea de tiempo del caso**: inicio → hoy (o solución) sobre una escala de 0 a 10+ días hábiles con marcas en 5 y 10, y los datos agrupados en secciones (Caso, Persona, Texto).

### Proveedores
- Tabla con barra en línea para "Abiertos" y punto rojo cuando hay vencidos; detalle con desglose por tipo (barras) y línea de tiempo (área) con el mismo estilo del Panel.

### Paleta de comandos (⌘K / Ctrl+K)
- Diálogo con campo de búsqueda; resultados agrupados: **Ir a** (Panel, Casos, Proveedores), **Acciones** (Nuevo caso, cambiar tema) y **Casos** (por orden, asociado o correo, máx. 8, con la misma normalización de `matchesSearch`). Flechas, Enter y Escape; el foco vuelve al elemento previo. Los casos se cargan una vez al abrir.

### Formularios
- Mismo lenguaje: etiquetas de 13px, controles de 44px, errores bajo el campo, secciones con título ("Datos del caso", "Clasificación", "Detalle").

## Datos nuevos (API)
`DashboardSummary.serieMensual: Array<{ mes: string; entrados: number; cerrados: number; abiertosAlCierre: number; diasPromedio: number | null }>` calculada en `src/domain/` (función nueva `monthSeries(cases)`), sin cambiar el resto del resumen. `abiertosAlCierre` es el acumulado de entrados menos cerrados hasta ese mes.

## Gráficos
- Colores desde tokens mediante un hook `useChartColors()` que lee las variables CSS del tema activo (los atributos SVG no resuelven `var()`), de modo que gráficos y modo oscuro cambian juntos.
- Paleta categórica de tipos (SOLICITUD, RECLAMO, PREGUNTA, QUEJA, DEVOLUCION) validada con `scripts/validate_palette.js` en claro y oscuro antes de usarla; estados con colores reservados.
- Cada gráfico: título, leyenda cuando hay ≥2 series, tooltip, texto alternativo (`sr-only`) y vista en tabla ya existente donde aplica.

## Fuera de alcance
Exportar, mapa de calor, nuevos filtros, cambios de reglas de negocio, autenticación. Sin dependencias nuevas salvo las fuentes de Google (Geist).

## Verificación
`npm test`, `npm run build`, recorrido en el navegador en claro y oscuro a 320, 375, 768, 1024 y 1280px (sin desborde; contraste ≥4,5:1 en texto), y prueba de teclado de ⌘K y del detalle de caso.
