# UI minimalista — diseño

## Objetivo

Interfaz simple, legible y útil para el equipo que gestiona PQRs: ver qué vence, qué proveedor concentra lo abierto y cerrar casos rápido. Sin cambiar datos ni reglas de negocio.

## Hallazgo que guía el diseño

De 245 casos abiertos, 173 no tienen fecha inicial válida: los indicadores de plazo solo cubren 72. Ese número debe verse en la franja principal.

## Cambios

### Sidebar y encabezados
- Sidebar de 13rem sin bloque de marca. Arriba botón primario "Nuevo caso" (`/casos/nuevo`); debajo Resumen, Casos, Proveedores. Casos muestra contador de vencidos (`colaVencida` de `/summary`) cuando es mayor que 0.
- Móvil: barra superior con el nombre y botón de menú; el panel no lleva botón "Cerrar menú" (se cierra al navegar o con el control del propio panel).
- `PageHead` queda en título y una línea opcional. Se elimina el eyebrow "Tienda Coomeva".

### Resumen
- Franja de 4 cifras clicables: **Abiertos**, **Vencidos** (>10 días hábiles, enlaza a `?plazo=vencido`), **Sin fecha válida** (abiertos sin `fechaInicial` utilizable, enlaza a `?estado=abiertos&fecha=invalida`), **Días promedio**.
- Bloques: Entrados y cerrados (sin tabla de meses); Plazos (en plazo / por vencer / vencido / sin fecha); Abiertos por proveedor y Temas abiertos (top 5); Cierre por tipo como tabla de 5 filas con barra en línea.
- Se quita de Resumen: KPIs Total y Cerrados, gráfica y tabla duplicadas de cierre, matriz proveedor×tipo, línea de tiempo.

### Proveedores
- Tabla: proveedor, casos, abiertos, vencidos, días promedio. Al elegir una fila se abre su detalle: desglose por tipo (la fila de la matriz), línea de tiempo mensual (entrados/cerrados como dos líneas; sin eje secundario) y renombrar. "Nuevo proveedor" pasa a un campo en línea sobre la tabla.

### Casos
- Visibles: buscador, Estado y Plazo; Proveedor, Tipo y Tema bajo "Más filtros".
- Columnas: Fecha, Proveedor, Tipo, Tema, Plazo (texto que une días y estado; cerrados muestran "N días"), sin Asociado. Clic en la fila abre un panel lateral con el detalle completo y "Cerrar caso".
- Móvil: tarjetas compactas con las mismas cuatro líneas y el mismo panel.

### Espacio y tema
- Escala de 8px: gaps de 16/24px, tarjetas con `p-5`, contenido máximo 72rem.
- Colores de gráficas desde tokens del tema (`--primary`, `--warning`, `--muted-foreground`), no hex sueltos.
- Se elimina el cálculo `curvas`/`areaCurves`, que la UI no usa.

## Fuera de alcance
Nuevos datos, exportar, edición de casos, modo oscuro.

## Datos nuevos
- `DashboardSummary.sinFechaValida: number` (abiertos sin fecha inicial utilizable).
- `GET /api/proveedores` agrega por proveedor `abiertos`, `vencidos` (`null` sin festivos) y `diasPromedio` (`null` sin cierres).
- `GET /api/casos` acepta `fecha=invalida` (casos sin fecha inicial utilizable).

## Verificación
`npm test`, `npm run build`, y revisión en el navegador a 375px y 1280px de las cuatro pantallas (Resumen, Casos, Proveedores, formulario de caso).
