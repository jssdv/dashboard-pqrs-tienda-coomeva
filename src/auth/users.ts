import { hashPassword, verifyPassword } from "./password.js";
import type { AuthRepository, Rol, UserRecord } from "./repository.js";

export const ROLES: readonly Rol[] = ["admin", "user", "viewer"];
export const MIN_PASSWORD_LENGTH = 8;

export interface AuthUser {
  id: number;
  usuario: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

export function publicUser({ id, usuario, rol, activo, creadoEn }: UserRecord): AuthUser {
  return { id, usuario, rol, activo, creadoEn };
}

export function isRol(value: string): value is Rol {
  return (ROLES as readonly string[]).includes(value);
}

export function validateUsuario(usuario: string): string | null {
  return /^[\p{L}\p{N}._@-]{3,80}$/u.test(usuario)
    ? null
    : "El usuario debe tener entre 3 y 80 caracteres: letras, números, punto, guion, guion bajo o @";
}

export function validatePassword(password: string): string | null {
  return password.length >= MIN_PASSWORD_LENGTH
    ? null
    : `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
}

// Returns null when the usuario is already taken.
export async function createUser(
  auth: AuthRepository,
  usuario: string,
  password: string,
  rol: Rol,
): Promise<AuthUser | null> {
  const passwordHash = await hashPassword(password);
  if (auth.findUserByUsuario(usuario)) return null;
  return publicUser(auth.insertUser({ usuario, passwordHash, rol, activo: true, creadoEn: new Date().toISOString() }));
}

export async function authenticate(
  auth: AuthRepository,
  usuario: string,
  password: string,
): Promise<UserRecord | null> {
  const user = auth.findUserByUsuario(usuario);
  if (!user || !user.activo) return null;
  return (await verifyPassword(password, user.passwordHash)) ? user : null;
}
