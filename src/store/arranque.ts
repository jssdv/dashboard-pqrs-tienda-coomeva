import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";

// Error con mensaje listo para mostrar al usuario en español. main.ts lo imprime y sale con código 1.
export class ErrorArranque extends Error {}

export const MANTENER_RESPALDOS = 10;
const PATRON_RESPALDO = /^pqr_\d{8}_\d{6}(_\d+)?\.sqlite$/;

// Más reciente primero: el sello de fecha va en orden lexicográfico.
export function listarRespaldos(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((nombre) => PATRON_RESPALDO.test(nombre))
    .sort()
    .reverse()
    .map((nombre) => join(dir, nombre));
}

function sello(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}_${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`;
}

// Copia consistente con VACUUM INTO (no hace falta cerrar la base). Nunca sobrescribe un respaldo
// existente y poda los más antiguos de la carpeta, solo los que tienen el nombre de respaldo.
export function crearRespaldo(db: DatabaseSync, dir: string): string {
  mkdirSync(dir, { recursive: true });
  const base = `pqr_${sello(new Date())}`;
  let ruta = join(dir, `${base}.sqlite`);
  for (let n = 1; existsSync(ruta); n++) ruta = join(dir, `${base}_${n}.sqlite`);
  db.prepare("VACUUM INTO ?").run(ruta);
  for (const viejo of listarRespaldos(dir).slice(MANTENER_RESPALDOS)) rmSync(viejo);
  return ruta;
}

// Corrupción: no borramos ni sobrescribimos nada; solo indicamos dónde está el último respaldo.
export function mensajeCorrupto(dbPath: string, respaldos: string, detalle: string): ErrorArranque {
  const ultimo = listarRespaldos(respaldos)[0];
  return new ErrorArranque(
    `La base de datos ${dbPath} está dañada o no es de PQR (${detalle}). No se borró ni se modificó nada. ` +
      (ultimo ? `Respaldo más reciente: ${ultimo}. ` : `No hay respaldos en ${respaldos}. `) +
      "Para restaurar: cierra PQR, renombra el archivo dañado (por ejemplo a pqr.dañado.sqlite) y copia el respaldo como data/pqr.sqlite.",
  );
}

// Códigos de node:sqlite (errcode): 11 y 26 corrupto/no es base; 5 y 6 bloqueada; 8, 10 y 14 sin escritura o sin abrir.
const CORRUPTA = [11, 26];
const BLOQUEADA = [5, 6];
const SIN_ESCRITURA = [8, 10, 14];
const ERRNO_SIN_PERMISO = ["EACCES", "EPERM", "EROFS"];

export function clasificarErrorSqlite(error: unknown, ctx: { dbPath: string; respaldos: string }): Error {
  if (error instanceof ErrorArranque) return error;
  const { errcode, code } = error as { errcode?: number; code?: string };
  const detalle = error instanceof Error ? error.message : String(error);
  if (errcode !== undefined && CORRUPTA.includes(errcode)) return mensajeCorrupto(ctx.dbPath, ctx.respaldos, detalle);
  if (errcode !== undefined && BLOQUEADA.includes(errcode)) {
    return new ErrorArranque(
      `La base ${ctx.dbPath} está bloqueada por otra copia de PQR u otro programa (esperamos 10 s). Cierra la otra copia y vuelve a abrir.`,
    );
  }
  if ((errcode !== undefined && SIN_ESCRITURA.includes(errcode)) || ERRNO_SIN_PERMISO.includes(code ?? "")) {
    return new ErrorArranque(
      `No se puede escribir en ${ctx.dbPath}. Revisa que la carpeta de la aplicación tenga permiso de escritura y no sea de solo lectura (Program Files, volumen protegido o copia en cuarentena).`,
    );
  }
  return error instanceof Error ? error : new Error(detalle);
}
