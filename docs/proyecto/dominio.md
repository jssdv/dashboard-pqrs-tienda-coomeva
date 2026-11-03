# Dominio

## Caso (`PqrCase`)

| Campo | Notas |
|---|---|
| `id` | Importados: derivado de hoja/fila. Altas en app: `app-<uuid>` |
| `sheetYear`, `rowNumber` | Origen en el libro (`rowNumber` = 0 en altas) |
| `fechaInicial`, `fechaSolucion` | ISO `YYYY-MM-DD` o `null` |
| `fechaInicialInvalida`, `fechaSolucionInvalida` | Año < 2024 o > 2100 → inválida, no entra al cálculo |
| `diasSolucion` | Días hábiles, siempre recalculado (se ignora el del Excel) |
| `area` / `areaOriginal` | Proveedor. Oficial y texto original |
| `fuente`, `tipo`, `tema` (+ `*Original`) | Idem |
| `idOrden`, `asociado`, `correo`, `motivo`, `solucion` | Texto |

Ya no se leen: valor de devolución, mes de compra, tipo de devolución, fecha de solicitud, observaciones.

## Encabezados reconocidos (`headers.ts`)

FECHA INICIAL, FECHA SOLUCION, AREA, ID ORDEN, ASOCIADO, CORREO, FUENTE, TIPO PQRS, TEMA, PQRS / MOTIVO PQRS, SOLUCION (comparación sin tildes ni mayúsculas).

## Reglas

- **Hojas**: solo `PQRs` + año de 4 dígitos. `Festivos` se ignora.
- **Diccionario** `data/dictionary.csv` (`field,from,to`) para `area`, `fuente`, `tipo`, `tema`. Sin entrada → valor original recortado.
- **Días hábiles** (`businessDays`): sábado y domingo libres, festivos nacionales libres, ambos extremos cuentan. Rango invertido da negativo; menor a −5 se trunca a 0.
- **Cola vencida** (`openQueue`): sin fecha de solución, fecha inicial válida y más días hábiles hasta hoy que su plazo (15 por defecto, Ley 1755 de 2015 art. 14; propio por proveedor). Lanza error si no hay festivos.
- **Festivos**: se piden para los años de las hojas, el anterior y el siguiente (`yearsToLoad`). Fuente: `https://calendariosnacionales.com/co/v1/{año}/nacionales.json`.

## Resumen (`summarize`)

`DashboardSummary`: totales (total, abiertos, cerrados, fechas inválidas); `sinFechaValida` (abiertos sin fecha inicial utilizable); conteos por año, área, fuente, tipo, tema, mes; flujo mensual entrados/cerrados; antigüedad (`en-plazo`, `por-vencer`, `vencido`) de abiertos; abiertos por área y tema; promedio de días; `colaVencida` / `colaError`; tasa de cierre por tipo (`closeRates`); matriz proveedor × tipo (`providerTypeMatrix`); `serieMensual` (`monthSeries`): por mes, entrados, cerrados, pendientes al cierre (acumulado de entrados menos cerrados) y días promedio de solución, con meses contiguos.

## Riesgo de vencimiento (`risk.ts`)

`riskOf(caso, holidays, today, plazos?)` → `{diasAbiertos, diasParaVencer, estado, vence}` con plazo de 15 días hábiles por defecto (festivos de Colombia): `en-plazo` (hasta la mitad del plazo, 0–7), `por-vencer` (8–15), `vencido` (>15). Cerrados y casos sin fecha válida dan `null`; sin festivos lanza error. `providerTimeline(cases, area)` da entrados, cerrados y días promedio por mes de un proveedor. En agregados, los valores nulos se agrupan como `(sin valor)`.

## Alta de caso (`validateCreate` / `caseFromCreate`)

Obligatorios: fechaInicial, área, idOrden, asociado, correo (formato válido), fuente, tipo, tema, motivo. Área, fuente, tipo y tema deben coincidir con las listas que salen de la base cargada (`validateCreate(raw, catalogs)`; error "<Campo> no está en la lista"). Área/fuente/tipo/tema guardan original + valor oficial del diccionario. El proveedor se registra en `proveedores`.

## Cierre (`validateClose` / `applyClose`)

Pide fecha y texto de solución. La fecha no puede ser anterior a la inicial. Recalcula `diasSolucion`. Requiere festivos cargados.

## Proveedores

Tabla propia. Renombrar actualiza `cases.area` y la lista.
