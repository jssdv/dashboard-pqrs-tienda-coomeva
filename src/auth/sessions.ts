import { createHash, randomBytes } from "node:crypto";
import type { AuthRepository } from "./repository.js";
import { publicUser, type AuthUser } from "./users.js";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_S = SESSION_MS / 1000;

// Only the hash is stored, so a copy of the database cannot be replayed as live cookies.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function createSession(auth: AuthRepository, userId: number): string {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  auth.insertSession(hashToken(token), userId, new Date(now.getTime() + SESSION_MS).toISOString(), now.toISOString());
  return token;
}

export function userForSession(auth: AuthRepository, token: string | undefined): AuthUser | null {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = auth.findSession(tokenHash);
  if (!session) return null;
  if (session.expiraEn <= new Date().toISOString()) {
    auth.deleteSession(tokenHash);
    return null;
  }
  const user = auth.findUserById(session.userId);
  return user?.activo ? publicUser(user) : null;
}

export function endSession(auth: AuthRepository, token: string): void {
  auth.deleteSession(hashToken(token));
}
