import { describe, expect, it } from "vitest";
import { lookupKey } from "../../src/domain/normalize";

describe("lookupKey", () => {
  it("trims, collapses spaces, strips accents, and uppercases", () => {
    expect(lookupKey("  Educación   Coomeva ")).toBe("EDUCACION COOMEVA");
    expect(lookupKey("correo Tienda")).toBe("CORREO TIENDA");
    expect(lookupKey("DEVOLUCIÓN DE DINERO")).toBe("DEVOLUCION DE DINERO");
  });
});
