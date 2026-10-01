# Dashboard PQRS Tienda Coomeva

Núcleo local que lee el libro de PQRs de Tienda Coomeva, lo normaliza a un solo esquema de caso y lo guarda en SQLite. El libro de Excel es la entrada; la base local es la copia de trabajo. Hay una API de resumen y una pantalla en `/`.

Rama de trabajo: `feature/pqr-core`.

## Qué ya está

- Tipos de caso (`PqrCase`) con texto original y texto oficial de área, fuente, tipo y tema.
- Clave de catálogo: recorte, espacios colapsados, sin tildes, mayúsculas.
- Fechas Excel (época 1899-12-30). Un año menor a 2024 o mayor a 2100 queda marcado como inválido y no entra al cálculo de días.
- Días hábiles al estilo `NETWORKDAYS.INTL` (sábado y domingo libres, ambos extremos cuentan). El resultado del Excel se ignora y se recalcula.
- Hojas cuyo nombre es `PQRs` más un año de cuatro dígitos. Las hojas `Festivos` no se leen.
- Diccionario CSV `field,from,to` para `area`, `fuente`, `tipo` y `tema`. Si no hay entrada, el valor oficial es el original recortado.
- `data/dictionary.csv` ya trae el mapeo oficial (boletería, pines, devoluciones, fuentes y áreas).
- Repositorio SQLite que reemplaza todos los casos en cada importación.
- CLI de importación. Antes de escribir SQLite pide los festivos nacionales de Colombia (`/co/v1/{año}/nacionales.json`) para los años de las hojas, más el anterior y el siguiente. Si esa petición falla, no reemplaza los casos.
- Resumen de agregados (`summarize`) sobre los casos ya importados: totales, catálogos, año, mes y días promedio.
- API local `GET /summary` que devuelve ese resumen. No lista casos: nombre, correo y texto libre no salen por HTTP.
- Pantalla en `GET /` con los mismos totales, meses, tipo, área, fuente, tema y año. Tampoco muestra nombre, correo ni texto libre.

## Arranque

Requiere Node.js 20+.

```bash
npm install
npm test
```

Importar un libro (el `.xlsx` no se versiona):

```bash
npm run import -- ./ruta/al/libro.xlsx ./data/dictionary.csv ./data/pqr.sqlite
```

Servir el tablero (escucha en `0.0.0.0` y en `PORT`, o en el puerto 3000). Abre `/` en el navegador. `GET /summary` sigue devolviendo el JSON.

```bash
npm run serve -- ./data/pqr.sqlite
```

Imprime una línea JSON:

```json
{"imported": 0, "skipped": 0, "invalidDates": 0, "holidays": 0}
```

`*.sqlite` está en `.gitignore`. Nombres, correos y texto libre se quedan en ese archivo local.

## Diseño

Las funciones de dominio no tocan el disco. `readWorkbook` devuelve filas crudas, `importCases` aplica encabezados y diccionario, y `CaseRepository` escribe. SQLite es la primera implementación; la API puede usar la misma interfaz.

El plan de este núcleo está en `docs/superpowers/plans/2026-10-01-pqr-core.md`.
