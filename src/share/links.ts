import { createHash, randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import type { ShareRepository } from "./repository.js";

export const URL_PUBLICA = "url_publica";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function enlaceValido(share: ShareRepository, token: string, now: Date = new Date()): boolean {
  const enlace = share.findEnlaceByHash(hashToken(token));
  if (!enlace || enlace.revocado) return false;
  return enlace.expira === null || enlace.expira > now.toISOString();
}

// Vencimiento al final del día en Bogotá (UTC-5, sin horario de verano).
// null = sin vencimiento; undefined = fecha mal formada o ya pasada.
export function expiraDe(fecha: string, now: Date = new Date()): string | null | undefined {
  if (!fecha) return null;
  if (!DATE.test(fecha)) return undefined;
  const expira = new Date(`${fecha}T23:59:59-05:00`);
  if (Number.isNaN(expira.getTime()) || expira <= now) return undefined;
  return expira.toISOString();
}

export function lanBases(port: number): string[] {
  return Object.values(networkInterfaces())
    .flatMap((addresses) => addresses ?? [])
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => `http://${address.address}:${port}`);
}

// Accepts only http(s) so a pasted value cannot become a javascript: link.
export function urlPublicaValida(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
