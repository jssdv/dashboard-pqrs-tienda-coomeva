# Arquitectura

## Flujo de datos

```
libro .xlsx ──readWorkbook──▶ RawRow[] ──importCases(headers+diccionario)──▶ PqrCase[]
                                                                               │
festivos (calendariosnacionales.com) ──────────────────────────────┐           ▼
                                                                    └──▶ CaseRepository (SQLite)
                                                                               │
                                          summaryServer (HTTP) ◀───────────────┘
                                                │
                                   /summary  /api/*  y estáticos client/dist
                                                │
                                         webapp React (client/)
```

El Excel es solo entrada. La base SQLite es la copia de trabajo.

## Capas

| Capa | Carpeta | Rol |
|---|---|---|
| Dominio | `src/domain/` | Funciones puras, sin disco ni red |
| Importación | `src/import/` | Lee hojas `PQRs<año>`, mapea filas a casos |
| Festivos | `src/holidays/` | Descarga festivos nacionales, orquesta importación |
| Almacén | `src/store/` | Interfaz `CaseRepository` + implementación SQLite |
| API | `src/api/summaryServer.ts` | Servidor HTTP, JSON y archivos estáticos |
| Arranque | `src/cli/` | `main.ts` (ejecutable portable y `npm start`), `appFolder.ts` |
| UI base | `src/components/ui/` | Componentes shadcn usados por la webapp |
| Webapp | `client/src/` | Pantallas y cliente de API |
| Datos | `data/dictionary.csv` | Diccionario oficial de catálogos |
| Pruebas | `tests/`, `client/src/*.test.*` | Vitest |

## Archivos clave

- `src/domain/types.ts` — `PqrCase`, `RawRow`
- `src/domain/headers.ts` — etiquetas del Excel → campos canónicos
- `src/domain/normalize.ts` — clave de catálogo (recorte, espacios, sin tildes, mayúsculas)
- `src/domain/dates.ts` — fechas Excel (época 1899-12-30), año válido 2024–2100
- `src/domain/businessDays.ts` — días hábiles tipo `NETWORKDAYS.INTL`
- `src/domain/dictionary.ts` — parse y resolución del diccionario
- `src/domain/summary.ts` — `summarize()`
- `src/domain/openQueue.ts`, `closeRate.ts`, `areaCurves.ts` — agregados
- `src/domain/caseForm.ts` — validación y construcción de altas/cierres
- `src/store/sqliteRepository.ts` — tablas `cases`, `holidays`, `proveedores`
- `src/holidays/nationalHolidays.ts` — `loadNationalHolidays`, `importLoadedCases`, `ensureHolidayYears`

## Decisiones de diseño

- Dominio sin I/O; el repositorio es una interfaz, SQLite es la primera implementación.
- Servidor sin framework, `node:http`.
- Si la descarga de festivos falla, la importación no reemplaza los casos.
- Sin festivos no se inventan conteos de días hábiles (error / 503).
- `/summary` no expone nombres, correos ni texto libre.
- Zona horaria de "hoy": `America/Bogota`.
- Alias `@` → `src/` (Vite y tsconfig).
