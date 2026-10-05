# Responsive, selectores y nombres — diseño

## Objetivo

Que la interfaz se use bien de 320px a 1280px, que las listas desplegables sean cómodas (búsqueda en las largas) y que nombres y encabezados digan lo que significan. Sin cambios de datos ni de reglas.

## Referencias consultadas

- Listas con ~15 opciones o más llevan búsqueda dentro ([Eleken](https://www.eleken.co/blog-posts/dropdown-menu-ui)). Aquí: Proveedor (34) y Tema (83) la necesitan; Estado y Plazo (3) no.
- En móvil los filtros van en un panel plegable con contador de filtros activos y la lista en tarjetas ([toktickit](https://github.com/lephirada/toktickit/pull/36)).
- Tablas de tickets: encabezado fijo con fondo propio dentro de un contenedor con scroll ([Shadcnblocks](https://www.shadcnblocks.com/block/data-table5)).
- shadcn separa `Select` (lista corta) de `Combobox` (con búsqueda) y usa un cajón en móvil ([Select](https://ui.shadcn.com/docs/components/select), [Combobox](https://ui.shadcn.com/docs/components/combobox), [Drawer](https://ui.shadcn.com/docs/components/drawer)). Su Combobox y su Drawer ya dependen de Base UI, que no está instalado.
- React Aria ofrece `Select` y `ComboBox` accesibles con teclado, y la opción "todos" como un ítem de id vacío ([Select](https://react-aria.adobe.com/Select), [ComboBox](https://react-aria.adobe.com/ComboBox)).

## Decisión de componentes (sin dependencias nuevas)

| Necesidad | Componente | Origen |
|---|---|---|
| Lista corta (Estado, Plazo) | `Select` propio | `react-aria-components` (ya instalado) con estilos del tema |
| Lista larga con búsqueda (Proveedor, Tipo, Tema, selector de la línea de tiempo) | `Combobox` propio | `react-aria-components` `ComboBox`, filtro sin tildes ni mayúsculas |
| Panel de filtros en móvil | `Sheet` con `side="bottom"` | ya existe en `src/components/ui/sheet.tsx` (Radix) |
| Tablas | `<table>` actual con encabezado fijo | sin TanStack Table: no se pidió ordenar ni paginar en cliente |
| Iconos | `lucide-react` | ya instalado |

No se usa `src/components/base/select`: sus tokens (`bg-primary`, `ring-brand`) son los de Untitled UI y chocan con los de este tema.

## Cambios

### Controles (`client/src/ui/`)
- `Select({ label, value, onChange, options })` y `Combobox({ label, value, onChange, options, emptyText })`. Opción inicial "Todos" con valor `""`. Alto mínimo 44px, anillo de foco visible, lista con scroll y máximo `min(20rem, 50dvh)`.

### Filtros de Casos
- Escritorio: fila con buscador, Estado y Plazo; botón "Filtros" (con contador) despliega Proveedor, Tipo y Tema como `Combobox`. Los filtros activos siguen como chips.
- Móvil (<768px): buscador y botón "Filtros (N)" que abre un `Sheet` inferior con los cinco controles y un botón "Listo". Los cambios se aplican al instante.

### Responsive
- Sidebar: ≥1024px completo; 768–1023px columna de iconos de 4rem con `aria-label` y `title`; <768px barra superior con menú (como hoy).
- Tablas de Casos y Proveedores con encabezado fijo y columnas numéricas alineadas a la derecha; sin scroll horizontal de página desde 320px.
- Proveedores en <768px: filas como tarjetas (nombre, y debajo casos, abiertos, vencidos, días).

### Nombres y encabezados
| Hoy | Nuevo |
|---|---|
| Resumen (ruta, menú y título) | Panel |
| Sin fecha válida | Sin fecha de inicio |
| Plazos de abiertos | Plazos de casos abiertos |
| Cierre por tipo | Tasa de cierre por tipo |
| Más filtros | Filtros |
| Ver (botón) | Abrir (`aria-label` "Ver detalle" se mantiene) |

Cada página lleva título y una línea con dato vivo: Panel "245 abiertos · 63 vencidos"; Casos "N casos" según los filtros; Proveedores "N proveedores".

## Fuera de alcance
Ordenar columnas, exportar, modo oscuro, dependencias nuevas.

## Verificación
`npm test`, `npm run build`, y recorrido en el navegador a 320, 375, 768, 1024 y 1280px de Panel, Casos (con panel de filtros), Proveedores y formulario de caso.
