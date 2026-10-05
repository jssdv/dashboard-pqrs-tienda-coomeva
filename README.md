# Dashboard PQRS Tienda Coomeva

Núcleo local que lee el libro de PQRs de Tienda Coomeva, lo normaliza a un solo esquema de caso y lo guarda en SQLite. El libro de Excel es la entrada; la base local es la copia de trabajo. Hay una API de resumen y una webapp en `/`.

Rama de trabajo: `feature/pqr-core`.

## Qué ya está

- Tipos de caso (`PqrCase`) con las columnas actuales del libro: fecha inicial, fecha de solución, área, ID de orden, asociado, correo, fuente, tipo, tema, motivo y solución. El texto original y el oficial se guardan para área, fuente, tipo y tema. Días de solución se recalculan; valor de devolución, mes de compra, tipo de devolución, fecha de solicitud y observaciones ya no vienen en el archivo.
- Clave de catálogo: recorte, espacios colapsados, sin tildes, mayúsculas.
- Fechas Excel (época 1899-12-30). Un año menor a 2024 o mayor a 2100 queda marcado como inválido y no entra al cálculo de días.
- Días hábiles al estilo `NETWORKDAYS.INTL` (sábado y domingo libres, ambos extremos cuentan). El resultado del Excel se ignora y se recalcula.
- Hojas cuyo nombre es `PQRs` más un año de cuatro dígitos. Las hojas `Festivos` no se leen.
- Diccionario CSV `field,from,to` para `area`, `fuente`, `tipo` y `tema`. Si no hay entrada, el valor oficial es el original recortado.
- `data/dictionary.csv` ya trae el mapeo oficial (boletería, pines, devoluciones, fuentes y áreas).
- Repositorio SQLite que reemplaza todos los casos en cada importación. `npm run import` borra las altas y los cierres hechos en la app. Los festivos nacionales quedan en la tabla `holidays` y se vuelven a completar en la misma importación.
- CLI de importación. Antes de escribir SQLite pide los festivos nacionales de Colombia (`/co/v1/{año}/nacionales.json`) para los años de las hojas, más el anterior y el siguiente. Si esa petición falla, no reemplaza los casos.
- Resumen de agregados (`summarize`) sobre los casos ya importados: totales, catálogos, año, mes, días promedio, cola de más de 10 días hábiles, cierre por tipo, `sinFechaValida` y matriz proveedor × tipo. La cola usa `businessDays` contra la fecha de hoy en `America/Bogota` y los festivos guardados. Sin festivos cargados no inventa un conteo.
- API local `GET /summary` que devuelve ese resumen. No lista casos: nombre, correo y texto libre no salen por HTTP.
- `GET /api/casos` lista los casos completos y filtra por `cola`, `area`, `tipo` y `mes`. `POST /api/casos` da de alta y `POST /api/casos/:id/cerrar` cierra. La validación responde 400 con la lista de campos. Si faltan festivos al cerrar o al pedir la cola vencida, responde 503.
- Webapp en `client/` (Vite, React, React Router, Tailwind CSS 4 y Recharts). Resumen, Casos y Proveedores viven en esa interfaz; Casos filtra por plazo (en plazo, por vencer, vencido) y muestra el detalle de cada caso en un panel. `npm run dev` abre Vite en el puerto 5173 y proxea `/summary` y `/api` al servidor en el 3000. `npm run build` escribe `client/dist`. `npm run serve` sirve ese directorio en `/` y conserva la API.
- Un caso nuevo exige fecha inicial, área, ID de orden, asociado, correo, fuente, tipo, tema y motivo. El id es `app-` más un UUID. Área, fuente, tipo y tema guardan el texto escrito y el valor oficial del diccionario. El cierre pide fecha y texto de solución, y recalcula los días hábiles. Si falta el año de esa fecha, lo pide al mismo servicio de festivos.

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

Servir la API y, si ya existe `client/dist`, la webapp. Escucha en `0.0.0.0` y en `PORT`, o en el puerto 3000. `GET /summary` sigue devolviendo el JSON, sin personas ni texto libre.

```bash
npm run build
npm run serve -- ./data/pqr.sqlite
```

El segundo argumento opcional es el diccionario. Si se omite, usa `./data/dictionary.csv`.

Durante el desarrollo, deja el servidor en el 3000 y abre la interfaz con Vite:

```bash
npm run dev
```

Vite usa el puerto 5173 y reenvía `/summary` y `/api` a `http://127.0.0.1:3000`.

La importación imprime una línea JSON:

```json
{"imported": 0, "skipped": 0, "invalidDates": 0, "holidays": 0}
```

`*.sqlite` está en `.gitignore`. Nombres, correos y texto libre se quedan en ese archivo local.

## Diseño

Las funciones de dominio no tocan el disco. `readWorkbook` devuelve filas crudas, `importCases` aplica encabezados y diccionario, y `CaseRepository` escribe. SQLite es la primera implementación; la API puede usar la misma interfaz.

El plan de este núcleo está en `docs/superpowers/plans/2026-10-01-pqr-core.md`. La mesa de casos está en `docs/superpowers/plans/2026-10-01-pqr-casos.md`. La interfaz es la webapp de `client/`.
