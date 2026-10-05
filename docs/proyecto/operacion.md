# Operación

Requiere Node.js 20+.

```bash
npm install
npm test            # vitest run
```

## Importar libro

```bash
npm run import -- ./libro.xlsx ./data/dictionary.csv ./data/pqr.sqlite
```

Pide festivos antes de escribir. Imprime `{"imported","skipped","invalidDates","holidays"}`. **Reemplaza todos los casos**, incluidas altas y cierres hechos en la app.

## Servir

```bash
npm run build
npm run serve -- ./data/pqr.sqlite [./data/dictionary.csv]
```

## Desarrollo

Servidor en 3000 + `npm run dev` (Vite en 5173, con proxy).

## Notas

- `.gitignore`: `node_modules`, `dist`, `*.sqlite`, `*.xlsx`, `.DS_Store`, `.superpowers`. Datos personales viven solo en el SQLite local.
- Se borraron `public/dashboard.css` y `src/web/renderPage.ts` (reemplazados por la webapp).
- Dependencia externa en ejecución: calendariosnacionales.com (festivos).
- Cambios sin commit en la rama al momento de este documento.

## Puntos a revisar

- `components/foundations/payment-icons` pesa mucho y no parece usarse.
- README menciona `docs/superpowers/plans/2026-10-01-pqr-core.md`; los planes viven en `docs/superpowers/`.
- Dependencias duplicadas de UI (lucide, @untitledui/icons, radix, react-aria).
