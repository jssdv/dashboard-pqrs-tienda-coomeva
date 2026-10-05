// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Casos } from "./Casos";
import { Resumen } from "./Resumen";
import { Shell } from "./Shell";
import type { DashboardSummary, PqrCase } from "./types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function summary(over: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    total: 0,
    abiertos: 0,
    cerrados: 0,
    fechasInvalidas: 0,
    porAnio: [],
    porArea: [],
    porFuente: [],
    porTipo: [],
    porTema: [],
    porMes: [],
    flujoPorMes: [],
    antiguedad: null,
    abiertosPorArea: [],
    abiertosPorTema: [],
    dias: { casos: 0, promedio: null },
    colaVencida: 4,
    colaError: null,
    cierrePorTipo: [],
    curvas: [],
    matrizProveedorTipo: [],
    ...over,
  };
}

it("shows Más de 10 días and links it to the overdue queue", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => summary() })),
  );
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Más de 10 días")).toBeTruthy();
  expect(screen.getByRole("link", { name: "4" }).getAttribute("href")).toBe("/casos?cola=vencida");
});

it("shows 20 cases and the page range", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        cases: Array.from({ length: 25 }, (_, index) => ({
          id: `2026-${index + 1}`,
          sheetYear: 2026,
          rowNumber: index + 2,
          fechaInicial: "2026-01-05",
          fechaSolucion: null,
          fechaInicialInvalida: false,
          fechaSolucionInvalida: false,
          diasSolucion: null,
          area: "Tienda",
          areaOriginal: "Tienda",
          idOrden: null,
          asociado: null,
          correo: null,
          fuente: null,
          fuenteOriginal: null,
          tipo: "RECLAMO",
          tipoOriginal: "RECLAMO",
          tema: "Cine",
          temaOriginal: "Cine",
          motivo: null,
          solucion: null,
        })),
      }),
    })),
  );
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("1–20 de 25")).toBeTruthy();
  expect(screen.getAllByRole("listitem")).toHaveLength(20);
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  expect(await screen.findByText("21–25 de 25")).toBeTruthy();
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
});

it("shows the empty filter message and Nuevo caso", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ cases: [] }) })),
  );
  render(
    <MemoryRouter initialEntries={["/casos?tipo=QUEJA"]}>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("No hay casos con ese filtro.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Nuevo caso" }).getAttribute("href")).toBe("/casos/nuevo");
});

it("links the headline counts into the case list", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => summary({ total: 3, abiertos: 2, cerrados: 1, colaVencida: 4 }),
    })),
  );
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  expect((await screen.findByRole("link", { name: "3" })).getAttribute("href")).toBe("/casos");
  expect(screen.getByRole("link", { name: "2" }).getAttribute("href")).toBe("/casos?estado=abiertos");
  expect(screen.getByRole("link", { name: "1" }).getAttribute("href")).toBe("/casos?estado=cerrados");
  expect(screen.getByRole("link", { name: "Ver cola" }).getAttribute("href")).toBe("/casos?cola=vencida");
  expect(screen.queryByRole("tab")).toBeNull();
});

it("renders close rate and monthly flow without the area module", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () =>
        summary({
          total: 2,
          abiertos: 1,
          cerrados: 1,
          cierrePorTipo: [{ tipo: "RECLAMO", entrados: 2, cerrados: 1, tasa: 0.5 }],
          flujoPorMes: [{ mes: "2026-01", entrados: 2, cerrados: 1 }],
          abiertosPorArea: [{ key: "Tienda", count: 1 }],
          abiertosPorTema: [{ key: "Cine", count: 1 }],
          antiguedad: [
            { key: "0-5", count: 0 },
            { key: "6-10", count: 0 },
            { key: "mas-10", count: 1 },
          ],
          curvas: [
            { area: "Tienda", series: [{ tipo: "RECLAMO", points: [{ mes: "2026-01", acumulado: 1 }] }] },
            { area: "Bodega", series: [{ tipo: "QUEJA", points: [{ mes: "2026-01", acumulado: 1 }] }] },
          ],
        }),
    })),
  );
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  expect((await screen.findAllByText("Cierre por tipo")).length).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: "Entrados y cerrados" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "2026-01" }).getAttribute("href")).toBe("/casos?mes=2026-01");
  expect(screen.getByRole("link", { name: "Tienda" }).getAttribute("href")).toBe(
    "/casos?estado=abiertos&area=Tienda",
  );
  expect(screen.getByRole("link", { name: "Cine" }).getAttribute("href")).toBe(
    "/casos?estado=abiertos&tema=Cine",
  );
  expect(screen.getByRole("link", { name: "Más de 10 días hábiles" }).getAttribute("href")).toBe(
    "/casos?cola=vencida",
  );
  expect(screen.queryByRole("heading", { name: "Bodega" })).toBeNull();
  expect(screen.queryByRole("tab")).toBeNull();
  const tipoLinks = screen.getAllByRole("link", { name: "RECLAMO" });
  expect(tipoLinks.some((link) => link.getAttribute("href") === "/casos?tipo=RECLAMO")).toBe(true);
  expect(document.querySelectorAll(".recharts-responsive-container").length).toBe(2);
});

it("expands a case and shows the person, order, and solution text", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        cases: [
          {
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
            idOrden: "ORD-9",
            asociado: "Ana Ruiz",
            correo: "ana@coomeva.com.co",
            fuente: "Correo",
            fuenteOriginal: "Correo",
            tipo: "RECLAMO",
            tipoOriginal: "RECLAMO",
            tema: "Cine",
            temaOriginal: "Cine",
            motivo: "El pedido no llegó",
            solucion: null,
          },
        ],
      }),
    })),
  );
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  expect((await screen.findAllByText("Abierto")).length).toBeGreaterThan(0);
  expect(screen.getByRole("link", { name: "Cerrar" }).getAttribute("href")).toBe("/casos/2026-2/cerrar");
  screen.getByText("Detalle").click();
  expect(screen.getByText("Ana Ruiz")).toBeTruthy();
  expect(screen.getByText("ORD-9")).toBeTruthy();
  expect(screen.getByText("El pedido no llegó")).toBeTruthy();
});

it("keeps scrolling inside the content pane", () => {
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<p>Inicio</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  const frame = document.querySelector("[data-app-frame]");
  const main = document.getElementById("contenido");
  expect(frame?.className).toContain("h-dvh");
  expect(frame?.className).toContain("overflow-hidden");
  expect(main?.className).toContain("overflow-y-auto");
  expect(main?.className).toContain("overflow-x-hidden");
  expect(main?.className).toContain("min-w-0");
  expect(main?.className).toContain("max-w-[80rem]");
  expect(screen.getByRole("button", { name: "Menú" })).toBeTruthy();
});

function caso(over: Partial<PqrCase> = {}): PqrCase {
  return {
    id: "2026-1",
    sheetYear: 2026,
    rowNumber: 2,
    fechaInicial: "2026-01-05",
    fechaSolucion: null,
    fechaInicialInvalida: false,
    fechaSolucionInvalida: false,
    diasSolucion: null,
    area: "Tienda",
    areaOriginal: "Tienda",
    idOrden: null,
    asociado: null,
    correo: null,
    fuente: null,
    fuenteOriginal: null,
    tipo: "RECLAMO",
    tipoOriginal: "RECLAMO",
    tema: "Cine",
    temaOriginal: "Cine",
    motivo: "no buscar aquí",
    solucion: null,
    ...over,
  };
}

function stubCases(cases: PqrCase[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ cases }) })),
  );
}

it("filters cards by name, email, and order from the search box", async () => {
  stubCases([
    caso({ id: "a", asociado: "Ana María" }),
    caso({ id: "b", correo: "ana@coomeva.com.co", asociado: "Otra" }),
    caso({ id: "c", asociado: "Luis" }),
    caso({ id: "d", asociado: "Boletería" }),
    caso({ id: "e", idOrden: "ORD-1234", asociado: "Nadie" }),
  ]);
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  const box = await screen.findByRole("textbox", { name: "Buscar" });
  expect(box.getAttribute("placeholder")).toBe("Orden, asociado o correo");

  fireEvent.change(box, { target: { value: "ana" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  for (const summary of screen.getAllByText("Detalle")) summary.click();
  expect(screen.getByText("Ana María")).toBeTruthy();
  expect(screen.getByText("ana@coomeva.com.co")).toBeTruthy();
  expect(screen.queryByText("Luis")).toBeNull();

  fireEvent.change(box, { target: { value: "boleteria" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  screen.getByText("Detalle").click();
  expect(screen.getByText("Boletería")).toBeTruthy();

  fireEvent.change(box, { target: { value: "123" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  screen.getByText("Detalle").click();
  expect(screen.getByText("ORD-1234")).toBeTruthy();
});

it("hides a closed match when estado is Abiertos", async () => {
  stubCases([
    caso({ id: "open", asociado: "Ana María" }),
    caso({ id: "closed", asociado: "Ana Cerrada", fechaSolucion: "2026-02-01", diasSolucion: 4 }),
  ]);
  render(
    <MemoryRouter initialEntries={["/casos?estado=abiertos"]}>
      <Casos />
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByRole("textbox", { name: "Buscar" }), {
    target: { value: "ana" },
  });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  screen.getByText("Detalle").click();
  expect(screen.getByText("Ana María")).toBeTruthy();
  expect(screen.queryByText("Ana Cerrada")).toBeNull();
});

it("filters the list by tema from the url", async () => {
  stubCases([
    caso({ id: "cine", tema: "Cine" }),
    caso({ id: "otro", tema: "Boletería" }),
  ]);
  render(
    <MemoryRouter initialEntries={["/casos?estado=abiertos&tema=Cine"]}>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("1–1 de 1")).toBeTruthy();
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Quitar filtros" }).getAttribute("href")).toBe("/casos");
});

it("shows the empty filter message when search matches nothing", async () => {
  stubCases([caso({ asociado: "Luis" })]);
  render(
    <MemoryRouter initialEntries={["/casos?q=ana"]}>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("No hay casos con ese filtro.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Quitar filtros" }).getAttribute("href")).toBe("/casos");
});

it("returns to page 1 when the search text changes", async () => {
  stubCases([
    caso({ id: "ana", asociado: "Ana María" }),
    ...Array.from({ length: 24 }, (_, index) => caso({ id: `x-${index}`, asociado: "Luis" })),
  ]);
  render(
    <MemoryRouter initialEntries={["/casos?pagina=2"]}>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("21–25 de 25")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar" }), { target: { value: "ana" } });
  expect(screen.getByText("1–1 de 1")).toBeTruthy();
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
});

function openCase(over: Partial<PqrCase> & { riesgo?: unknown } = {}) {
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
    idOrden: null,
    asociado: null,
    correo: null,
    fuente: null,
    fuenteOriginal: null,
    tipo: "RECLAMO",
    tipoOriginal: "RECLAMO",
    tema: "Cine",
    temaOriginal: "Cine",
    motivo: null,
    solucion: null,
    ...over,
  };
}

it("labels the plazo of each case and dashes the closed ones", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        cases: [
          openCase({ id: "a", riesgo: { diasAbiertos: 11, diasParaVencer: -1, estado: "vencido" } }),
          openCase({ id: "b", riesgo: { diasAbiertos: 10, diasParaVencer: 0, estado: "por-vencer" } }),
          openCase({ id: "c", riesgo: { diasAbiertos: 2, diasParaVencer: 8, estado: "en-plazo" } }),
          openCase({ id: "d", fechaSolucion: "2026-01-06", diasSolucion: 2 }),
        ],
      }),
    })),
  );
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Vencido · 1 día")).toBeTruthy();
  expect(screen.getByText("Vence hoy")).toBeTruthy();
  expect(screen.getByText("En plazo · faltan 8")).toBeTruthy();
  expect(screen.getAllByText(/^(Vencido ·|Vence hoy|En plazo ·|Por vencer ·)/)).toHaveLength(3);
});

it("sends plazo to the API when the Plazo filter changes", async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ cases: [] }) }));
  vi.stubGlobal("fetch", fetchMock);
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  await screen.findByText("No hay casos con ese filtro.");
  fireEvent.change(screen.getByLabelText("Plazo"), { target: { value: "por-vencer" } });
  await screen.findByText("No hay casos con ese filtro.");
  expect(fetchMock).toHaveBeenLastCalledWith("/api/casos?plazo=por-vencer");
});

it("links each provider by type cell to the filtered case list", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () =>
        summary({
          total: 3,
          matrizProveedorTipo: [
            {
              area: "Tienda",
              total: 3,
              abiertos: 2,
              celdas: [
                { tipo: "QUEJA", total: 0, abiertos: 0 },
                { tipo: "(sin valor)", total: 3, abiertos: 2 },
              ],
            },
          ],
        }),
    })),
  );
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  const link = await screen.findByRole("link", { name: /^3 · 2 abiertos/ });
  expect(link.getAttribute("href")).toBe("/casos?area=Tienda&tipo=%28sin+valor%29");
  expect(screen.getByRole("columnheader", { name: "QUEJA" })).toBeTruthy();
  expect(screen.getAllByText("—").length).toBeGreaterThan(0);
});

function timelineFetch(puntos: unknown, ok = true) {
  return vi.fn(async (url: string) => {
    if (url.includes("/linea")) {
      return { ok, status: ok ? 200 : 500, json: async () => (ok ? { puntos } : { error: "falló" }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () =>
        summary({
          total: 2,
          porArea: [
            { key: "Tienda", count: 1 },
            { key: "Educación / Coomeva", count: 1 },
          ],
        }),
    };
  });
}

it("loads the timeline of the first provider and reloads on change", async () => {
  const fetchMock = timelineFetch([{ mes: "2026-01", entrados: 1, cerrados: 0, diasPromedio: null }]);
  vi.stubGlobal("fetch", fetchMock);
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  const select = await screen.findByLabelText("Proveedor");
  expect(await screen.findByText(/2026-01: 1 entrados, 0 cerrados/)).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledWith("/api/proveedores/Tienda/linea");
  fireEvent.change(select, { target: { value: "Educación / Coomeva" } });
  await screen.findByText(/2026-01: 1 entrados/);
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/proveedores/${encodeURIComponent("Educación / Coomeva")}/linea`,
  );
});

it("shows an empty message when the provider has no valid months", async () => {
  vi.stubGlobal("fetch", timelineFetch([]));
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Este proveedor no tiene meses con fecha válida.")).toBeTruthy();
});

it("keeps the rest of the summary when the timeline request fails", async () => {
  vi.stubGlobal("fetch", timelineFetch(null, false));
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  expect(await screen.findByText("falló")).toBeTruthy();
  expect(screen.getByText("Total")).toBeTruthy();
});
