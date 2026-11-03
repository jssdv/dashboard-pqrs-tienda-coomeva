# Operación

Requiere Node.js 22.13+ (`node:sqlite` sin bandera).

```bash
npm install
npm test            # vitest run
```

## Arranque

```bash
npm install
npm start           # vite build + servidor en PORT o 3000, con data/pqr.sqlite
npm test            # vitest run
```

## Importar libro

Desde la app, **Administración > Importar libro** (solo `admin`), o `POST /api/admin/importar` con el `.xlsx` como cuerpo binario (máximo 20 MB). Pide festivos antes de escribir. Responde `{"imported","skipped","invalidDates","holidays"}`. **Reemplaza todos los casos**, incluidas altas y cierres hechos en la app; la bitácora se conserva.

## Ejecutable portable

```bash
npm run build:bin   # dist-bin/pqr-<so>-<arch>/ con pqr y data/
```

## Desarrollo

Servidor en 3000 + `npm run dev` (Vite en 5173, con proxy).

## Notas

- `.gitignore`: `node_modules`, `dist`, `*.sqlite`, `*.xlsx`, `.DS_Store`, `.superpowers`. Datos personales viven solo en el SQLite local.
- Dependencia externa en ejecución: calendariosnacionales.com (festivos).
- Eliminados en la limpieza del modo portable: CLI `npm run import` / `npm run serve`, `src/components/base` y `foundations` (Untitled UI sin uso) y sus dependencias.
