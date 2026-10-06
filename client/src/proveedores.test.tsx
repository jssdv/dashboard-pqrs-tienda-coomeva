// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Proveedores } from "./Proveedores";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PROVEEDORES = [
  { nombre: "Tienda", casos: 3, abiertos: 2, vencidos: 1, diasPromedio: 4.5 },
  { nombre: "Educación / Coomeva", casos: 1, abiertos: 0, vencidos: null, diasPromedio: null },
];

const MATRIZ = [
  {
    area: "Tienda",
    total: 3,
    abiertos: 2,
    celdas: [
      { tipo: "QUEJA", total: 0, abiertos: 0 },
      { tipo: "RECLAMO", total: 3, abiertos: 2 },
    ],
  },
];

function stubApi(over: { proveedores?: unknown; fail?: boolean } = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });
    if (over.fail) return json({ error: "No se pudieron cargar los proveedores" }, false);
    if (url.endsWith("/linea")) {
      return json({ puntos: [{ mes: "2026-01", entrados: 1, cerrados: 1, diasPromedio: 4 }] });
    }
    if (url === "/summary") return json({ matrizProveedorTipo: MATRIZ });
    if (url === "/api/proveedores" && init?.method === "POST") return json({ nombre: "x" });
    if (url === "/api/proveedores/renombrar") return json({ nombre: "y" });
    return json({ proveedores: over.proveedores ?? PROVEEDORES });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Proveedores />
    </MemoryRouter>,
  );
}

it("lists providers with abiertos, vencidos and días promedio, dashing nulls", async () => {
  stubApi();
  renderPage();
  const row = (await screen.findByRole("button", { name: "Tienda" })).closest("tr") as HTMLElement;
  expect(row.textContent).toContain("3");
  expect(row.textContent).toContain("4.5");
  const other = screen.getByRole("button", { name: "Educación / Coomeva" }).closest("tr") as HTMLElement;
  expect(other.textContent).toContain("—");
  expect(screen.getByRole("columnheader", { name: "Vencidos" })).toBeTruthy();
});

it("opens the detail with type links and the timeline request", async () => {
  const fetchMock = stubApi();
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Tienda" }));
  const link = await screen.findByRole("link", { name: /^3 · 2 abiertos/ });
  expect(link.getAttribute("href")).toBe("/casos?area=Tienda&tipo=RECLAMO");
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/proveedores/Tienda/linea"));
  expect(screen.getByRole("button", { name: "Tienda" }).getAttribute("aria-expanded")).toBe("true");
});

it("encodes provider names with a slash", async () => {
  const fetchMock = stubApi();
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Educación / Coomeva" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(`/api/proveedores/${encodeURIComponent("Educación / Coomeva")}/linea`),
  );
});

it("renames a provider from the detail and reloads", async () => {
  const fetchMock = stubApi();
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Tienda" }));
  fireEvent.change(await screen.findByLabelText("Nombre del proveedor"), { target: { value: "Tienda Nueva" } });
  fireEvent.click(screen.getByRole("button", { name: "Renombrar" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/proveedores/renombrar",
      expect.objectContaining({ body: JSON.stringify({ desde: "Tienda", hacia: "Tienda Nueva" }) }),
    ),
  );
});

it("creates a provider from the inline field", async () => {
  const fetchMock = stubApi();
  renderPage();
  await screen.findByRole("button", { name: "Tienda" });
  fireEvent.change(screen.getByLabelText("Nuevo proveedor"), { target: { value: "Nuevo" } });
  fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/proveedores",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ nombre: "Nuevo" }) }),
    ),
  );
});

it("shows an alert when providers cannot be loaded", async () => {
  stubApi({ fail: true });
  renderPage();
  expect((await screen.findByRole("alert")).textContent).toContain("No se pudieron cargar");
});

it("shows the provider count as subtitle", async () => {
  stubApi();
  renderPage();
  expect(await screen.findByText("2 proveedores")).toBeTruthy();
});

it("renders each provider as a card on narrow screens, dashing nulls", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
  );
  stubApi();
  renderPage();
  const card = (await screen.findByRole("button", { name: "Educación / Coomeva" })).closest("li") as HTMLElement;
  expect(card).toBeTruthy();
  expect(card.textContent).toContain("Vencidos");
  expect(card.textContent).toContain("—");
  expect(card.textContent).not.toContain("null");
  expect(document.querySelector("table")).toBeNull();
});

it("draws a bar for Abiertos proportional to the largest provider", async () => {
  stubApi({
    proveedores: [
      { nombre: "Grande", casos: 20, abiertos: 10, vencidos: 3, diasPromedio: 5 },
      { nombre: "Chico", casos: 8, abiertos: 5, vencidos: 0, diasPromedio: 4 },
    ],
  });
  renderPage();
  const big = (await screen.findByRole("button", { name: "Grande" })).closest("tr") as HTMLElement;
  const small = screen.getByRole("button", { name: "Chico" }).closest("tr") as HTMLElement;
  expect((big.querySelector("[data-bar]") as HTMLElement).style.width).toBe("100%");
  expect((small.querySelector("[data-bar]") as HTMLElement).style.width).toBe("50%");
});

it("flags providers with overdue cases with an accessible alert link", async () => {
  stubApi({
    proveedores: [
      { nombre: "Grande", casos: 20, abiertos: 10, vencidos: 3, diasPromedio: 5 },
      { nombre: "Chico", casos: 8, abiertos: 5, vencidos: 0, diasPromedio: 4 },
    ],
  });
  renderPage();
  await screen.findByRole("button", { name: "Grande" });
  const link = screen.getByRole("link", { name: "3 vencidos" });
  expect(link.getAttribute("href")).toBe("/casos?area=Grande&plazo=vencido");
  expect(screen.queryByRole("link", { name: "0 vencidos" })).toBeNull();
});

it("shows the type breakdown in the detail with type tags and bars", async () => {
  stubApi();
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Tienda" }));
  const section = await screen.findByRole("region", { name: "Por tipo" });
  expect(within(section).getByText("RECLAMO")).toBeTruthy();
  expect(section.querySelector("[data-dot]")).toBeTruthy();
  expect(section.querySelector("[data-bar]")).toBeTruthy();
});

it("sets the provider table headers in mono small caps and marks overdue with a square", async () => {
  stubApi();
  renderPage();
  await screen.findByRole("button", { name: "Tienda" });
  const header = screen.getByRole("columnheader", { name: "Vencidos" });
  expect(header.closest("tr")?.className).toContain("font-mono");
  expect(header.closest("tr")?.className).toContain("uppercase");
  const mark = screen.getByRole("link", { name: "1 vencidos" }).querySelector("span");
  expect(mark?.className).not.toContain("rounded");
});
