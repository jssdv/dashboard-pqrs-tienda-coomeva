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
- `GET /api/casos` lista los casos completos y filtra por `cola`, `area`, `tipo` y `mes`. `POST /api/casos` da de alta y `POST /api/casos/:id/cerrar` cierra. `GET/POST /api/casos/:id/bitacora` lista y registra avances sin cerrar el caso (la importación no los borra). La validación responde 400 con la lista de campos. Si faltan festivos al cerrar o al pedir la cola vencida, responde 503.
- Webapp en `client/` (Vite, React, React Router, Tailwind CSS 4 y Recharts). Panel, Casos y Proveedores viven en esa interfaz; Casos filtra por plazo (en plazo, por vencer, vencido) y muestra el detalle de cada caso en un panel. `npm run dev` abre Vite en el puerto 5173 y proxea `/summary` y `/api` al servidor en el 3000. `npm run build` escribe `client/dist`. `npm run serve` sirve ese directorio en `/` y conserva la API.
- Un caso nuevo exige fecha inicial, área, ID de orden, asociado, correo, fuente, tipo, tema y motivo. El id es `app-` más un UUID. Área, fuente, tipo y tema guardan el texto escrito y el valor oficial del diccionario. El cierre pide fecha y texto de solución, y recalcula los días hábiles. Si falta el año de esa fecha, lo pide al mismo servicio de festivos.

## Uso: aplicación para macOS y Windows

No hace falta instalar nada. Descarga el `.zip` de la última versión en la pestaña **Releases** del repositorio (`pqr-macos-arm64` o `pqr-windows-x64`) y:

1. Descomprime el zip. Queda una carpeta `pqr-<sistema>-<arquitectura>/` con `pqr` (o `pqr.exe`), `data/` y `LEEME.txt`.
2. Haz doble clic en `pqr` (macOS) o `pqr.exe` (Windows). Se abre el navegador en http://localhost:3000.
3. La primera vez no hay usuarios: crea el administrador en `/setup`. Esa pantalla se cierra después.

Puntos a tener en cuenta:

- **Mantén la carpeta completa junta.** El ejecutable y `data/` van en la misma carpeta. La app no usa AppData, Application Support ni la carpeta del usuario: todo lo que escribe (SQLite, csv) queda en `data/`. Puedes mover la carpeta entera a otro sitio o a un USB.
- **Respaldo:** con la app cerrada, copia `data/pqr.sqlite`. Para restaurar, reemplaza ese archivo.
- **Ventana de consola:** en macOS se abre una ventana de Terminal y en Windows una consola. Mientras uses la app, no la cierres: cerrarla detiene el servidor.
- **Puerto ocupado:** si 3000 está en uso, la app lo dice. Abre la app desde una terminal con `PORT=3001` para cambiarlo.

### Roles

- `admin`: todo, incluido crear usuarios y enlaces para compartir.
- `user`: consulta y registra o cierra casos.
- `viewer`: solo lectura.

### Compartir con un enlace

Como administrador, en la pantalla **Compartir** crea un enlace. La app muestra una dirección `/ver/<token>` con la IP de la red local. Quien lo abra debe iniciar sesión y verá el tablero en vivo; los cambios aparecen sin recargar. Puedes poner fecha de caducidad y revocar el enlace en cualquier momento.

Si publicas la app con un túnel propio (por ejemplo, con una URL HTTPS), escribe esa dirección en **URL pública** de ajustes para que los enlaces la usen. La app no incluye túnel.

> **Aviso:** en la red local la conexión es HTTP sin cifrar; contraseñas y sesiones viajan sin TLS. Úsala solo en redes de confianza. Para acceso desde fuera de la oficina, pon delante HTTPS (túnel o proxy).

### Avisos del sistema operativo

- **macOS (Gatekeeper):** el ejecutable no está firmado con una cuenta de Apple, así que la primera vez el sistema lo bloquea. Opciones: clic derecho sobre `pqr` > **Abrir** > **Abrir**; o en Terminal, `xattr -dr com.apple.quarantine "<ruta de la carpeta>"`.
- **Windows (SmartScreen):** aparece "Windows protegió su PC". Pulsa **Más información** > **Ejecutar de todas formas**.

### Desarrollo

Para trabajar en el código, usa las órdenes de la sección **Arranque** (`npm install`, `npm run dev`, `npm test`). Para generar los binarios en tu sistema, `npm run build:bin` escribe `dist-bin/pqr-<sistema>-<arquitectura>/`. Los binarios para las tres plataformas los compila GitHub Actions al crear una etiqueta `v*` (ver `.github/workflows/build.yml`).

## Arranque

Requiere Node.js 22.13+ (`node:sqlite` sin bandera).

```bash
npm install
npm start
```

`npm start` compila la webapp y la sirve con `data/pqr.sqlite` en http://localhost:3000.

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
