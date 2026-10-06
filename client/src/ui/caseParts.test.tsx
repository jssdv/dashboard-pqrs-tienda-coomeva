// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { CaseTimeline } from "./CaseTimeline";
import { PlazoBar } from "./PlazoBar";
import type { PqrCase } from "../types";

afterEach(cleanup);

function caso(over: Partial<PqrCase> = {}): PqrCase {
  return {
    id: "2026-2",
    sheetYear: 2026,
    rowNumber: 2,
    fechaInicial: "2026-01-05",
    fechaSolucion: null,
    fechaInicialInvalida: false,
    fechaSolucionInvalida: false,
    diasSolucion: null,
    area: "Tienda",
    areaOriginal: "Tienda",
    idOrden: "1",
    asociado: "Ana",
    correo: "a@b.co",
    fuente: "Correo",
    fuenteOriginal: "Correo",
    tipo: "RECLAMO",
    tipoOriginal: "RECLAMO",
    tema: "Cine",
    temaOriginal: "Cine",
    motivo: "x",
    solucion: null,
    ...over,
  };
}

const fill = () => (document.querySelector("[data-fill]") as HTMLElement).style.width;

it("PlazoBar fills in proportion to the days over 10", () => {
  render(<PlazoBar dias={4} estado="en-plazo" />);
  expect(screen.getByRole("img", { name: "4 días hábiles de 10" })).toBeTruthy();
  expect(fill()).toBe("40%");
});

it("PlazoBar caps at 100% beyond 10 days and keeps the real number in the label", () => {
  render(<PlazoBar dias={681} estado="vencido" />);
  expect(fill()).toBe("100%");
  expect(screen.getByRole("img", { name: "681 días hábiles de 10" })).toBeTruthy();
});

it("PlazoBar without days says Sin fecha de inicio", () => {
  render(<PlazoBar dias={null} estado={null} />);
  expect(screen.getByText("Sin fecha de inicio")).toBeTruthy();
});

it("PlazoBar marks 5 and 10 days", () => {
  render(<PlazoBar dias={2} estado="en-plazo" />);
  expect(document.querySelectorAll("[data-tick]")).toHaveLength(2);
});

it("CaseTimeline for an open case shows start, today and the business days elapsed", () => {
  render(
    <CaseTimeline caso={caso({ riesgo: { diasAbiertos: 6, diasParaVencer: 4, estado: "por-vencer" } })} />,
  );
  const region = screen.getByRole("region", { name: "Línea de tiempo" });
  expect(region.textContent).toContain("Inicio");
  expect(region.textContent).toContain("2026-01-05");
  expect(region.textContent).toContain("Hoy");
  expect(region.textContent).toContain("6 días hábiles");
  expect(fill()).toBe("60%");
});

it("CaseTimeline for a closed case shows the solution date and days", () => {
  render(<CaseTimeline caso={caso({ fechaSolucion: "2026-01-12", diasSolucion: 6 })} />);
  const region = screen.getByRole("region", { name: "Línea de tiempo" });
  expect(region.textContent).toContain("Solución");
  expect(region.textContent).toContain("2026-01-12");
  expect(region.textContent).toContain("6 días hábiles");
});

it("CaseTimeline caps the marker beyond 10 days but keeps the real number", () => {
  render(<CaseTimeline caso={caso({ riesgo: { diasAbiertos: 40, diasParaVencer: -30, estado: "vencido" } })} />);
  expect(fill()).toBe("100%");
  expect(screen.getByRole("region", { name: "Línea de tiempo" }).textContent).toContain("40 días hábiles");
});

it("CaseTimeline without a valid start date says so", () => {
  render(<CaseTimeline caso={caso({ fechaInicial: null })} />);
  expect(within(screen.getByRole("region", { name: "Línea de tiempo" })).getByText("Sin fecha de inicio")).toBeTruthy();
  render(<CaseTimeline caso={caso({ fechaInicialInvalida: true })} />);
  expect(screen.getAllByText("Sin fecha de inicio").length).toBe(2);
});

it("CaseTimeline for an open case without holidays shows dates only", () => {
  render(<CaseTimeline caso={caso()} />);
  const region = screen.getByRole("region", { name: "Línea de tiempo" });
  expect(region.textContent).toContain("2026-01-05");
  expect(region.textContent).not.toMatch(/NaN|undefined|null/);
});
