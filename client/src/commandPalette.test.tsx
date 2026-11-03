// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Shell } from "./Shell";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const CASES = Array.from({ length: 10 }, (_, index) => ({
  id: `2026-${index + 2}`,
  sheetYear: 2026,
  rowNumber: index + 2,
  fechaInicial: "2026-01-05",
  fechaSolucion: null,
  fechaInicialInvalida: false,
  fechaSolucionInvalida: false,
  diasSolucion: null,
  area: "Tienda",
  areaOriginal: "Tienda",
  idOrden: `ORD-${1000 + index}`,
  asociado: "Ana Ruiz",
  correo: "ana@coomeva.com.co",
  fuente: "Correo",
  fuenteOriginal: "Correo",
  tipo: "RECLAMO",
  tipoOriginal: "RECLAMO",
  tema: "Cine",
  temaOriginal: "Cine",
  motivo: "x",
  solucion: null,
}));

function stubApi() {
  const fetchMock = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => (url.startsWith("/api/casos") ? { cases: CASES } : { colaVencida: null }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="*" element={<Where />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const dialog = () => screen.findByRole("dialog", { name: "Buscar" });

it("opens with Ctrl+K and Meta+K and closes with Escape", async () => {
  stubApi();
  renderApp();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(await dialog()).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.keyDown(document, { key: "K", metaKey: true });
  expect(await dialog()).toBeTruthy();
});

it("returns focus to the search button when closed", async () => {
  stubApi();
  renderApp();
  const trigger = screen.getByRole("button", { name: /Buscar/ });
  fireEvent.click(trigger);
  await dialog();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it("filters go-to and action entries as you type", async () => {
  stubApi();
  renderApp();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = await screen.findByRole("combobox", { name: "Buscar" });
  fireEvent.change(input, { target: { value: "prove" } });
  const options = within(screen.getByRole("listbox")).getAllByRole("option");
  expect(options.map((option) => option.textContent?.replace("↵", ""))).toEqual(["Proveedores"]);
  fireEvent.change(input, { target: { value: "nuevo" } });
  expect(within(screen.getByRole("listbox")).getAllByRole("option")[0].textContent).toContain("Nuevo caso");
});

it("lists at most 8 matching cases, loaded once, and Enter opens the list filtered by order", async () => {
  const fetchMock = stubApi();
  renderApp();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = await screen.findByRole("combobox", { name: "Buscar" });
  fireEvent.change(input, { target: { value: "ana" } });
  await waitFor(() => expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(8));
  fireEvent.change(input, { target: { value: "ORD-1003" } });
  await waitFor(() => expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1));
  expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/casos"))).toHaveLength(1);
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/casos?q=ORD-1003"));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("moves with the arrow keys and runs the Nuevo caso action", async () => {
  stubApi();
  renderApp();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = await screen.findByRole("combobox", { name: "Buscar" });
  fireEvent.change(input, { target: { value: "nuevo" } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "ArrowUp" });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/casos/nuevo"));
});

it("says Sin resultados when nothing matches", async () => {
  stubApi();
  renderApp();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = await screen.findByRole("combobox", { name: "Buscar" });
  fireEvent.change(input, { target: { value: "zzzzzz" } });
  expect(await screen.findByText("Sin resultados")).toBeTruthy();
});

it("has no icons in the palette and marks the active row with a text Enter hint", async () => {
  stubApi();
  renderApp();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = await screen.findByRole("combobox", { name: "Buscar" });
  const dialog = screen.getByRole("dialog");
  expect(dialog.querySelector("svg")).toBeNull();
  const active = within(screen.getByRole("listbox")).getAllByRole("option")[0];
  expect(active.textContent).toContain("↵");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(within(screen.getByRole("listbox")).getAllByRole("option")[1].textContent).toContain("↵");
});

it("labels the groups in mono small caps", async () => {
  stubApi();
  renderApp();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  await screen.findByRole("combobox", { name: "Buscar" });
  const group = screen.getByRole("group", { name: "Ir a" });
  expect(group.querySelector("p")?.className).toContain("font-mono");
  expect(group.querySelector("p")?.className).toContain("uppercase");
});
