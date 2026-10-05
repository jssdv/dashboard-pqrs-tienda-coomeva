# Documentación del proyecto — Dashboard PQRS Tienda Coomeva

Paquete `pqr-core`. App local para gestionar PQRs (peticiones, quejas, reclamos, sugerencias) de Tienda Coomeva.

Flujo: libro Excel → normalización → SQLite → API HTTP → webapp React.

## Índice

- [arquitectura.md](arquitectura.md) — capas, flujo de datos, estructura de carpetas
- [dominio.md](dominio.md) — modelo de caso, reglas de negocio, métricas
- [api.md](api.md) — endpoints HTTP
- [cliente.md](cliente.md) — webapp (`client/`) y componentes UI
- [operacion.md](operacion.md) — instalación, comandos, importación, pruebas

## Stack

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript (ESM), Node 20+ |
| Lectura Excel | exceljs |
| Persistencia | SQLite (better-sqlite3) |
| Servidor | `node:http` (sin framework) |
| Frontend | React 19, React Router 7, Tailwind CSS 4, Recharts, Radix / shadcn, react-aria |
| Build / dev | Vite 7, tsx |
| Pruebas | Vitest, Testing Library, jsdom |

## Estado

Rama `feature/pqr-core`. Planes de diseño históricos en `docs/superpowers/plans/` y `docs/superpowers/specs/`.
