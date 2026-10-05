# API HTTP

Servidor en `src/api/summaryServer.ts`. Escucha en `0.0.0.0`, puerto `PORT` o 3000. JSON en todas las respuestas de API.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/summary` | `DashboardSummary`. Sin personas ni texto libre |
| GET | `/api/casos` | Lista casos completos. Query: `cola`, `area`, `tipo`, `mes`. 503 si falta festivos para `cola` |
| POST | `/api/casos` | Alta. 201 + caso. 400 `{errors:[{field,message}]}`. 503 si falla carga de festivos |
| POST | `/api/casos/:id/cerrar` | Cierre `{fechaSolucion, solucion}`. 200 + caso; 400, 404, 503 |
| GET | `/api/proveedores` | `{proveedores:[{nombre,casos}]}` |
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

`replaceAll` (importación) borra todo caso previo, incluidas altas y cierres hechos en la app.
