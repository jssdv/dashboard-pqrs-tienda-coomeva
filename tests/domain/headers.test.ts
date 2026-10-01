import { describe, expect, it } from "vitest";
import { mapHeaders } from "../../src/domain/headers.js";

describe("mapHeaders", () => {
  it("maps 2024 and 2025 motivo headers and ignores dias", () => {
    const headers = mapHeaders([
      "FECHA INICIAL",
      "DIAS SOLUCION",
      "PQRs",
      "SOLUCIÓN",
      "Motivo PQRs",
    ]);
    expect(headers["FECHA INICIAL"]).toBe("fechaInicial");
    expect(headers["PQRs"]).toBe("motivo");
    expect(headers["Motivo PQRs"]).toBe("motivo");
    expect(headers["SOLUCIÓN"]).toBe("solucion");
    expect(headers["DIAS SOLUCION"]).toBeUndefined();
  });
});
