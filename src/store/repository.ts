import type { PqrCase } from "../domain/types.js";

export interface CaseRepository {
  replaceAll(cases: PqrCase[]): void;
  list(): PqrCase[];
}
