export type Rol = "admin" | "user" | "viewer";

export interface UserRecord {
  id: number;
  usuario: string;
  passwordHash: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

export interface SessionRecord {
  userId: number;
  expiraEn: string;
}

export interface AuthRepository {
  countUsers(): number;
  listUsers(): UserRecord[];
  findUserById(id: number): UserRecord | null;
  findUserByUsuario(usuario: string): UserRecord | null;
  insertUser(user: Omit<UserRecord, "id">): UserRecord;
  updateUser(user: UserRecord): void;
  insertSession(tokenHash: string, userId: number, expiraEn: string, creadoEn: string): void;
  findSession(tokenHash: string): SessionRecord | null;
  deleteSession(tokenHash: string): void;
  deleteSessionsOfUser(userId: number): void;
}
