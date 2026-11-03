export interface EnlaceRecord {
  id: number;
  creadoPor: string;
  expira: string | null;
  revocado: boolean;
}

export interface ShareRepository {
  listEnlaces(): EnlaceRecord[];
  // Stores only the hash of the token; the raw token is shown once, at creation.
  insertEnlace(tokenHash: string, creadoPor: number, expira: string | null): number;
  findEnlaceByHash(tokenHash: string): EnlaceRecord | null;
  revokeEnlace(id: number): boolean;
  getAjuste(clave: string): string | null;
  setAjuste(clave: string, valor: string): void;
}
