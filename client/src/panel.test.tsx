// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Resumen } from "./Resumen";
import type { DashboardSummary, MonthPoint } from "./types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function summary(over: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    total: 10,
    abiertos: 245,
    cerrados: 5,
    fechasInvalidas: 0,
    porAnio: [],
    porArea: [],
    porFuente: [],
    porTipo: [],
    porTema: [],
    porMes: [],
    flujoPorMes: [],
    antiguedad: [
      { key: "0-5", count: 1 },
      { key: "6-10", count: 0 },
      { key: "mas-10", count: 63 },
    ],
    abiertosPorArea: [],
    abiertosPorTema: [],
    dias: { casos: 4, promedio: 13.1 },
    colaVencida: 63,
    colaError: null,
    cierrePorTipo: [],
    sinFechaValida: 173,
    serieMensual: [],
    matrizProveedorTipo: [],
    ...over,
  };
}

const SERIE: MonthPoint[] = [
  { mes: "2026-07", entrados: 10, cerrados: 8, abiertosAlCierre: 50, diasPromedio: 12 },
  { mes: "2026-08", entrados: 12, cerrados: 9, abiertosAlCierre: 53, diasPromedio: 10 },
];

function show(over: Partial<DashboardSummary> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => summary(over) })),
  );
  return render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
}

const card = (name: string) => screen.getByRole("heading", { name, level: 3 }).closest("[data-stat]") as HTMLElement;

it("titles the page Panel with a live subtitle", async () => {
  show({ serieMensual: SERIE });
  expect(await screen.findByRole("heading", { level: 1, name: "Panel" })).toBeTruthy();
  expect(screen.getByText("245 abiertos · 63 vencidos")).toBeTruthy();
});

it("shows four stat cards with the latest month and the change against the previous one", async () => {
  show({ serieMensual: SERIE });
  await screen.findByRole("heading", { level: 1, name: "Panel" });
  expect(within(card("Abiertos")).getByRole("link", { name: "245" }).getAttribute("href")).toBe("/casos?estado=abiertos");
  expect(card("Abiertos").textContent).toContain("6 % vs mes anterior");
  expect(card("Abiertos").querySelector("[data-tone='bad']")).toBeTruthy();
  expect(card("Entrados").textContent).toContain("12");
  expect(card("Entrados").textContent).toContain("20 % vs mes anterior");
  expect(card("Tasa de cierre").textContent).toContain("75%");
  expect(card("Tasa de cierre").textContent).toContain("6 % vs mes anterior");
  expect(card("Días promedio").textContent).toContain("13.1");
  expect(card("Días promedio").textContent).toContain("17 % vs mes anterior");
  expect(card("Días promedio").querySelector("[data-tone='good']")).toBeTruthy();
});

it("shows a dash instead of a change when there is no previous month", async () => {
  show({ serieMensual: [SERIE[1]] });
  await screen.findByRole("heading", { level: 1, name: "Panel" });
  expect(card("Entrados").textContent).toContain("— vs mes anterior");
  expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

it("works without a monthly series", async () => {
  show({ serieMensual: [] });
  await screen.findByRole("heading", { level: 1, name: "Panel" });
  expect(card("Entrados").textContent).toContain("—");
});

it("puts Vencidos and Sin fecha de inicio in an alert band with links", async () => {
  show({ serieMensual: SERIE });
  const band = within(await screen.findByRole("region", { name: "Alertas" }));
  const vencidos = band.getByRole("link", { name: /Vencidos/ });
  expect(vencidos.getAttribute("href")).toBe("/casos?plazo=vencido");
  expect(vencidos.textContent).toContain("63");
  const sin = band.getByRole("link", { name: /Sin fecha de inicio/ });
  expect(sin.getAttribute("href")).toBe("/casos?estado=abiertos&fecha=invalida");
  expect(sin.textContent).toContain("173");
});

it("does not invent a number for Vencidos without holidays", async () => {
  show({ colaVencida: null, colaError: "no holidays loaded", antiguedad: null });
  await screen.findByRole("heading", { level: 1, name: "Panel" });
  expect(within(screen.getByRole("region", { name: "Alertas" })).queryByRole("link", { name: /Vencidos/ })).toBeNull();
  expect(screen.getAllByText("Sin festivos").length).toBeGreaterThan(0);
});

function longSerie(count: number): MonthPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const month = ((index + 1) % 12) + 1;
    const year = 2024 + Math.floor((index + 1) / 12);
    return {
      mes: `${year}-${String(month).padStart(2, "0")}`,
      entrados: 10 + index,
      cerrados: 8 + index,
      abiertosAlCierre: 20 + index,
      diasPromedio: 10,
    };
  });
}

const monthsListed = () => (document.body.textContent?.match(/\d{4}-\d{2}: \d+ entrados/g) ?? []).length;

it("limits the flow chart with the range selector", async () => {
  show({ serieMensual: longSerie(20) });
  await screen.findByRole("heading", { level: 2, name: "Entrados y cerrados" });
  expect(monthsListed()).toBe(12);
  fireEvent.click(screen.getByRole("radio", { name: "6 m" }));
  expect(monthsListed()).toBe(6);
  fireEvent.click(screen.getByRole("radio", { name: "Todo" }));
  expect(monthsListed()).toBe(20);
});

it("shows plazos as one segmented bar with a link per segment", async () => {
  show();
  await screen.findByRole("heading", { level: 2, name: "Plazos de casos abiertos" });
  const bar = screen.getByRole("img", { name: /Vencido \(más de 10\) 63/ });
  expect(bar.querySelectorAll("[data-segment]")).toHaveLength(3);
  const card = bar.closest("[data-slot='card']") as HTMLElement;
  expect(within(card).getByRole("link", { name: /Vencido/ }).getAttribute("href")).toBe("/casos?plazo=vencido");
  expect(within(card).getByRole("link", { name: /Sin fecha de inicio/ }).getAttribute("href")).toBe(
    "/casos?estado=abiertos&fecha=invalida",
  );
});

it("lists the top 8 open providers and topics with a link each", async () => {
  const buckets = Array.from({ length: 10 }, (_, index) => ({ key: `Prov ${index + 1}`, count: 20 - index }));
  show({ abiertosPorArea: buckets, abiertosPorTema: [{ key: "Cine", count: 4 }] });
  await screen.findByRole("heading", { level: 2, name: "Abiertos por proveedor" });
  const section = screen.getByRole("heading", { level: 2, name: "Abiertos por proveedor" }).closest("[data-slot='card']") as HTMLElement;
  expect(within(section).getAllByRole("link")).toHaveLength(8);
  expect(within(section).getByText("Otras 2")).toBeTruthy();
  expect(within(section).getByRole("link", { name: "Prov 1" }).getAttribute("href")).toBe("/casos?estado=abiertos&area=Prov+1");
  expect(screen.getByRole("link", { name: "Cine" }).getAttribute("href")).toBe("/casos?estado=abiertos&tema=Cine");
});

it("labels the close rate by threshold in text, not only color", async () => {
  show({
    cierrePorTipo: [
      { tipo: "RECLAMO", entrados: 100, cerrados: 95, tasa: 0.95 },
      { tipo: "QUEJA", entrados: 100, cerrados: 75, tasa: 0.75 },
      { tipo: "PREGUNTA", entrados: 100, cerrados: 50, tasa: 0.5 },
    ],
  });
  await screen.findByRole("heading", { level: 2, name: "Tasa de cierre por tipo" });
  const rows = screen.getAllByRole("row").slice(1);
  expect(rows[0].textContent).toContain("Alta");
  expect(rows[1].textContent).toContain("Media");
  expect(rows[2].textContent).toContain("Baja");
  expect(within(rows[0]).getByRole("link", { name: "RECLAMO" }).getAttribute("href")).toBe("/casos?tipo=RECLAMO");
});

it("shows the import hint when there are no cases", async () => {
  show({ total: 0, abiertos: 0 });
  expect(await screen.findByText(/Todavía no hay casos importados/)).toBeTruthy();
});
