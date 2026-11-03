import { expect, it } from "vitest";
import { providerScorecard } from "../../src/domain/providerScorecard";
import type { PqrCase } from "../../src/domain/types";

const caso = (over: Partial<PqrCase>): PqrCase =>
  ({
    fechaSolucion: null,
    fechaSolucionInvalida: false,
    diasSolucion: null,
    asociado: "Ana",
    tema: "ENVIO",
    causaRaiz: null,
    ...over,
  }) as PqrCase;

it("counts late closures, repeat complaints and causes", () => {
  const card = providerScorecard(
    [
      caso({ fechaSolucion: "2026-01-12", diasSolucion: 4, causaRaiz: "Logística" }),
      caso({ fechaSolucion: "2026-01-20", diasSolucion: 12, causaRaiz: "Logística" }),
      caso({ asociado: "Luis" }),
    ],
    10,
  );
  expect(card).toEqual({
    cerrados: 2,
    fueraDePlazoPct: 50,
    reincidentes: 1,
    causas: [{ key: "Logística", count: 2 }],
  });
  expect(providerScorecard([], 10).fueraDePlazoPct).toBeNull();
});
