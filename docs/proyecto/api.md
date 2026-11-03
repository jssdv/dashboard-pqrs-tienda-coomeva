# API HTTP

Servidor en `src/api/summaryServer.ts`. Escucha en `0.0.0.0`, puerto `PORT` o 3000. JSON en todas las respuestas de API.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/summary` | `DashboardSummary` (incluye `serieMensual`). Sin personas ni texto libre |
| GET | `/api/casos` | Lista casos completos; los abiertos con fecha válida traen `riesgo` (`diasAbiertos`, `diasParaVencer`, `estado`) si hay festivos. Query: `cola`, `area`, `tipo`, `mes`, `plazo` (`en-plazo`, `por-vencer`, `vencido`), `fecha=invalida`, `estado` (`abiertos`, `cerrados`), `tema`, `q` (orden, asociado o correo, sin tildes). 503 si faltan festivos para `cola` o `plazo` |
| GET | `/api/casos/exportar` | Excel (`.xlsx`) con los casos que dejan los mismos filtros que `/api/casos`. Hoja `Casos` (14 columnas, fechas reales, encabezado fijo con filtros) y hoja `Filtros` (fecha, cantidad y filtros aplicados). Nombre `casos-AAAA-MM-DD.xlsx`. 503 en JSON si falta festivos para `plazo` o `cola` |
| GET | `/api/catalogos` | `{area,fuente,tipo,tema}`: listas ordenadas de valores oficiales que ya están en la base (`area` incluye los proveedores guardados) |
| POST | `/api/casos` | Alta. Proveedor, Fuente, Tipo y Tema deben estar en `/api/catalogos` (se comparan sin tildes ni mayúsculas y se guarda el valor de la lista); si una lista está vacía ese campo no se valida. 201 + caso. 400 `{errors:[{field,message}]}`. 503 si falla carga de festivos |
| POST | `/api/casos/:id/cerrar` | Cierre `{fechaSolucion, solucion}`. 200 + caso; 400, 404, 503 |
| GET | `/api/casos/:id/bitacora` | `{entries:[{id,caseId,fecha,texto,creadoEn}]}`, más reciente primero. 404 si el caso no existe |
| POST | `/api/casos/:id/bitacora` | Avance `{fecha, texto}` (fecha no futura); no cierra el caso y sirve también en casos cerrados. 201 + entrada; 400 `{errors}`, 404 |
| GET | `/api/proveedores` | `{proveedores:[{nombre,casos,abiertos,vencidos,diasPromedio}]}`; `vencidos` es `null` sin festivos y `diasPromedio` `null` sin cierres |
| GET | `/api/proveedores/:nombre/linea` | `{puntos:[{mes,entrados,cerrados,diasPromedio}]}` (nombre codificado; proveedor sin casos devuelve `[]`) |
| POST | `/api/proveedores` | `{nombre}` → 201 |
| POST | `/api/proveedores/renombrar` | `{desde,hacia}` → 200 |
| GET/HEAD | `/`, `/casos`, `/casos/nuevo`, `/casos/:id/cerrar`, `/proveedores` | SPA desde `client/dist` |
| GET/HEAD | otros estáticos | Archivos de `client/dist` |

Otros casos: 400 si el cuerpo no es JSON; 404 `{error:"not found"}`; 500 con mensaje.

Al crear o cerrar, el servidor completa festivos faltantes de los años implicados (`ensureHolidayYears`), consultando el servicio externo.

## Persistencia (SQLite)

- `cases` — una columna por campo de `PqrCase` (booleanos como 0/1).
- `holidays(date PK)`.
- `proveedores(nombre PK)`.
- `bitacora(id, caseId, fecha, texto, creadoEn)` — sin FK a `cases`: `replaceAll` no la toca y las entradas de casos importados se conservan por su id estable (`AAAA-fila`).

`replaceAll` (importación) borra todo caso previo, incluidas altas y cierres hechos en la app.
