# Plazos y comportamiento por proveedor — diseño

## Objetivo

Ayudar al equipo de la tienda a cumplir plazos y a ver cómo se comporta cada proveedor, usando solo los datos que ya existen en `PqrCase` y la tabla `holidays`.

## Alcance

1. Riesgo de vencimiento por caso abierto.
2. Matriz proveedor × tipo.
3. Línea de tiempo mensual por proveedor.

Fuera de alcance: exportar, reincidencia, edición o reapertura, correos, reimportación no destructiva.

## Decisiones (supuestos explícitos)

- **Proveedor** = campo `area` tal cual (valor oficial del diccionario).
- **Límite** = 10 días hábiles para todos los tipos, igual que `openQueue`. Se centraliza en una constante `PLAZO_DIAS = 10` en `src/domain/`. Plazos por tipo quedan para después.
- **Hoy** = `bogotaToday()`. Sin festivos cargados no se calcula (mismo comportamiento que hoy: `null` / 503).
- Casos con fecha inicial inválida o nula no entran al riesgo ni a las líneas de tiempo.

## 1. Riesgo de vencimiento

Nuevo `src/domain/risk.ts`:

- `riskOf(caso, holidays, today)` → `{ diasAbiertos, diasParaVencer, estado }` o `null` si el caso está cerrado o sin fecha válida.
- `diasAbiertos = businessDays(fechaInicial, today, holidays)`; `diasParaVencer = PLAZO_DIAS - diasAbiertos`.
- Estado: `en-plazo` (0–5), `por-vencer` (6–10), `vencido` (>10). Coincide con los buckets de `agingBuckets` en `summary.ts`, que pasa a reutilizar `riskOf`.

API: `GET /api/casos` acepta `plazo=en-plazo|por-vencer|vencido` (junto a `cola`, `area`, `tipo`, `mes`) y cada caso abierto devuelve `riesgo`. El parámetro se llama `plazo` porque `estado` ya lo usa `Casos.tsx` (abiertos/cerrados). `cola` sigue igual. 503 si faltan festivos.

UI (`client/src/Casos.tsx`): columna "Plazo" con insignia (texto + color) y filtro `plazo`.

## 2. Matriz proveedor × tipo

Nuevo `src/domain/providerTypeMatrix.ts`: `providerTypeMatrix(cases)` → filas por proveedor con celdas por tipo `{ total, abiertos }`. Nulos como `(sin valor)`. Orden: proveedores por total descendente.

`summarize` agrega `matrizProveedorTipo`. UI: tabla en `Resumen.tsx`; clic en una celda navega a `/casos?area=…&tipo=…` (API y `Casos.tsx` ya leen esos parámetros; `casosHref` en `client/src/format.ts` arma el enlace).

## 3. Línea de tiempo por proveedor

Nuevo `src/domain/providerTimeline.ts`: `providerTimeline(cases, area)` → por mes `{ mes, entrados, cerrados, diasPromedio }`. `diasPromedio` usa `diasSolucion` de los casos cerrados ese mes (por fecha de solución); `null` si no hay cierres.

API: `GET /api/proveedores/:nombre/linea` → `{ puntos: [...] }`. No expone texto libre ni datos personales.

UI: selector de proveedor en `Resumen.tsx` con gráfica Recharts (barras entrados/cerrados, línea de días promedio). Sin ruta nueva en esta etapa.

## Pruebas

- `tests/domain/risk.test.ts`, `providerTypeMatrix.test.ts`, `providerTimeline.test.ts` (patrón de `openQueue.test.ts`): bordes 5/6 y 10/11 días, fines de semana y festivos, casos cerrados, fechas inválidas, `(sin valor)`.
- `tests/api/summaryServer.test.ts`: filtro `estado`, 503 sin festivos, endpoint de línea de tiempo, proveedor inexistente → lista vacía.
- `client/src/screens.test.tsx`: columna de riesgo, clic en matriz que filtra, selector de proveedor.

## Verificación manual

`npm test`, `npm run build`, `npm run serve -- ./data/pqr.sqlite`; revisar `/` y `/casos` con datos reales.
