// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    sinFechaValida: 0,
    matrizProveedorTipo: [],
    ...over,
  };
}

it("shows Vencidos and links it to the overdue plazo", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => summary() })),
  );
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Vencidos")).toBeTruthy();
  expect(screen.getByRole("link", { name: "4" }).getAttribute("href")).toBe("/casos?plazo=vencido");
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

it("links the four headline figures into the case list", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () =>
        summary({ total: 9, abiertos: 7, cerrados: 2, colaVencida: 4, sinFechaValida: 3, dias: { casos: 2, promedio: 13.1 } }),
    })),
  );
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  expect((await screen.findByRole("link", { name: "7" })).getAttribute("href")).toBe("/casos?estado=abiertos");
  expect(screen.getByRole("link", { name: "4" }).getAttribute("href")).toBe("/casos?plazo=vencido");
  expect(screen.getByRole("link", { name: "3" }).getAttribute("href")).toBe(
    "/casos?estado=abiertos&fecha=invalida",
  );
  expect(screen.getByText("13.1")).toBeTruthy();
  expect(screen.queryByText("Total")).toBeNull();
  expect(screen.queryByText("Cerrados")).toBeNull();
});

it("keeps the sin fecha válida link even when the count is 0", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => summary({ total: 1, abiertos: 0, sinFechaValida: 0 }) })),
  );
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  await screen.findByText("Sin fecha de inicio");
  const link = document.querySelector('[data-kpi="sin-fecha"] a');
  expect(link?.textContent).toBe("0");
  expect(link?.getAttribute("href")).toBe("/casos?estado=abiertos&fecha=invalida");
});

it("renders close rate, monthly flow and plazos", async () => {
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
        }),
    })),
  );
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  expect((await screen.findAllByText("Tasa de cierre por tipo")).length).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: "Entrados y cerrados" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Tienda" }).getAttribute("href")).toBe(
    "/casos?estado=abiertos&area=Tienda",
  );
  expect(screen.getByRole("link", { name: "Cine" }).getAttribute("href")).toBe(
    "/casos?estado=abiertos&tema=Cine",
  );
  expect(screen.getByRole("link", { name: /Vencido/ }).getAttribute("href")).toBe("/casos?plazo=vencido");
  expect(screen.queryByRole("tab")).toBeNull();
  const tipoLinks = screen.getAllByRole("link", { name: "RECLAMO" });
  expect(tipoLinks.some((link) => link.getAttribute("href") === "/casos?tipo=RECLAMO")).toBe(true);
  expect(document.querySelectorAll(".recharts-responsive-container").length).toBe(1);
});

it("opens a detail panel with the person, order and solution text", async () => {
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
  await screen.findByRole("button", { name: "Ver detalle" });
  expect(screen.queryByText("Ana Ruiz")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
  const panel = await screen.findByRole("dialog");
  expect(within(panel).getByText("Ana Ruiz")).toBeTruthy();
  expect(within(panel).getByText("ORD-9")).toBeTruthy();
  expect(within(panel).getByText("El pedido no llegó")).toBeTruthy();
  expect(within(panel).getByRole("link", { name: "Cerrar caso" }).getAttribute("href")).toBe(
    "/casos/2026-2/cerrar",
  );
  fireEvent.keyDown(panel, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
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
  expect(main?.className).toContain("max-w-[72rem]");
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

  fireEvent.change(box, { target: { value: "boleteria" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
  expect(within(await screen.findByRole("dialog")).getByText("Boletería")).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

  fireEvent.change(box, { target: { value: "123" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
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
  fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
  expect(within(await screen.findByRole("dialog")).getByText("Ana María")).toBeTruthy();
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

it("shows hidden filters from the url as removable chips", async () => {
  stubCases([caso({ id: "a", area: "Tienda", fechaSolucion: "2026-02-01", diasSolucion: 2 })]);
  render(
    <MemoryRouter initialEntries={["/casos?area=Tienda&fecha=invalida"]}>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Proveedor Tienda")).toBeTruthy();
  expect(screen.getByText("Sin fecha de inicio")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Quitar filtro Proveedor Tienda" }));
  await waitFor(() => expect(screen.queryByText("Proveedor Tienda")).toBeNull());
  expect(screen.getByText("Sin fecha de inicio")).toBeTruthy();
});

it("shows the days of closed cases and no Asociado column in the table", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
  );
  stubCases([caso({ id: "c", fechaSolucion: "2026-02-01", diasSolucion: 4 })]);
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("columnheader", { name: "Plazo" })).toBeTruthy();
  expect(screen.queryByRole("columnheader", { name: "Asociado" })).toBeNull();
  expect(screen.getByText("4 días")).toBeTruthy();
});

function setViewport(wide: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: wide, addEventListener: () => {}, removeEventListener: () => {} })),
  );
}

function recordingFetch(cases: PqrCase[]) {
  const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ cases }) }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const choose = (button: HTMLElement, option: string) => {
  fireEvent.click(button);
  fireEvent.click(within(screen.getByRole("listbox", { hidden: true })).getByRole("option", { name: option, hidden: true }));
};

it("filters by plazo with the inline Plazo select on wide screens", async () => {
  setViewport(true);
  const fetchMock = recordingFetch([caso({ id: "a" })]);
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  await screen.findByRole("textbox", { name: "Buscar" });
  choose(screen.getByRole("button", { name: /Plazo/ }), "Por vencer");
  await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/casos?plazo=por-vencer"));
});

it("opens Filtros on wide screens and filters by provider with the searchable combobox", async () => {
  setViewport(true);
  const fetchMock = recordingFetch([
    caso({ id: "a", area: "Tienda" }),
    caso({ id: "b", area: "Educación / Coomeva" }),
  ]);
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  await screen.findByRole("textbox", { name: "Buscar" });
  expect(screen.queryByRole("combobox", { name: "Proveedor" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
  const input = screen.getByRole("combobox", { name: "Proveedor" });
  act(() => input.focus());
  fireEvent.change(input, { target: { value: "educacion" } });
  fireEvent.click(within(screen.getByRole("listbox", { hidden: true })).getByRole("option", { name: "Educación / Coomeva", hidden: true }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/casos?area=${encodeURIComponent("Educación / Coomeva").replace(/%20/g, "+")}`),
  );
  expect(screen.getByText("Proveedor Educación / Coomeva")).toBeTruthy();
});

it("shows the active filter count and a bottom sheet with all controls on narrow screens", async () => {
  setViewport(false);
  recordingFetch([caso({ id: "a", area: "Tienda" })]);
  render(
    <MemoryRouter initialEntries={["/casos?plazo=vencido&area=Tienda"]}>
      <Casos />
    </MemoryRouter>,
  );
  const button = await screen.findByRole("button", { name: "Filtros (2)" });
  expect(screen.queryByRole("combobox", { name: "Proveedor" })).toBeNull();
  fireEvent.click(button);
  const dialog = await screen.findByRole("dialog");
  for (const name of ["Estado", "Plazo"]) {
    expect(within(dialog).getByRole("button", { name: new RegExp(name) })).toBeTruthy();
  }
  for (const name of ["Proveedor", "Tipo", "Tema"]) {
    expect(within(dialog).getByRole("combobox", { name })).toBeTruthy();
  }
  fireEvent.click(within(dialog).getByRole("button", { name: "Listo" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("keeps a url provider that is not in the list selected and lets you clear it", async () => {
  setViewport(true);
  const fetchMock = recordingFetch([caso({ id: "a", area: "Tienda" })]);
  render(
    <MemoryRouter initialEntries={["/casos?area=Inexistente"]}>
      <Casos />
    </MemoryRouter>,
  );
  await screen.findByRole("textbox", { name: "Buscar" });
  fireEvent.click(screen.getByRole("button", { name: "Filtros (1)" }));
  const input = screen.getByRole("combobox", { name: "Proveedor" }) as HTMLInputElement;
  expect(input.value).toBe("Inexistente");
  fireEvent.click(screen.getByRole("button", { name: "Limpiar Proveedor" }));
  await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/casos"));
  expect(screen.queryByText("Proveedor Inexistente")).toBeNull();
});

it("titles the home page Panel with a live subtitle", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => summary({ total: 9, abiertos: 245, colaVencida: 63 }) })),
  );
  render(
    <MemoryRouter>
      <Resumen />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: "Panel" })).toBeTruthy();
  expect(screen.getByText("245 abiertos · 63 vencidos")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Plazos de casos abiertos" })).toBeTruthy();
  expect(screen.getByText("Sin fecha de inicio", { selector: "h3" })).toBeTruthy();
});

it("names the case count in the Casos subtitle and labels the open button Abrir", async () => {
  stubCases([caso({ id: "a" }), caso({ id: "b" })]);
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("2 casos")).toBeTruthy();
  const open = screen.getAllByRole("button", { name: "Ver detalle" })[0];
  expect(open.textContent).toBe("Abrir");
});

it("uses the singular in the Casos subtitle", async () => {
  stubCases([caso({ id: "a" })]);
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  expect(await screen.findByText("1 caso")).toBeTruthy();
});

it("right-aligns numeric table headers and keeps dates on one line", async () => {
  setViewport(true);
  stubCases([caso({ id: "a" })]);
  render(
    <MemoryRouter>
      <Casos />
    </MemoryRouter>,
  );
  const fecha = await screen.findByRole("columnheader", { name: "Fecha" });
  const row = fecha.closest("table")?.querySelector("tbody td") as HTMLElement;
  expect(row.className).toContain("whitespace-nowrap");
  expect(fecha.closest("thead")?.className).toContain("sticky");
});
