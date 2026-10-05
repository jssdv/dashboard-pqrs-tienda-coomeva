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

  it("maps the current twelve-column sheet and ignores dias", () => {
    const headers = mapHeaders([
      "FECHA INICIAL",
      "FECHA SOLUCION",
      "DIAS SOLUCION",
      "AREA",
      "ID ORDEN",
      "ASOCIADO",
      "CORREO",
      "FUENTE",
      "TIPO PQRs",
      "TEMA",
      "Motivo PQRs",
      "SOLUCIÓN",
    ]);
    expect(Object.values(headers).sort()).toEqual(
      [
        "area",
        "asociado",
        "correo",
        "fechaInicial",
        "fechaSolucion",
        "fuente",
        "idOrden",
        "motivo",
        "solucion",
        "tema",
        "tipo",
      ].sort(),
    );
    expect(headers["DIAS SOLUCION"]).toBeUndefined();
  });
});
