// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NuevoCaso } from "./CaseForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const CATALOGS = {
  area: ["Educación Coomeva", "Tienda Coomeva"],
  fuente: ["Correo Tienda", "Llamada"],
  tipo: ["QUEJA", "RECLAMO"],
  tema: ["BOLETERIA", "GARANTIA DE PRODUCTO"],
};

function stubApi(opts: { catalogs?: unknown; catalogsOk?: boolean; post?: { status: number; body: unknown } } = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
    if (url === "/api/catalogos") {
      return opts.catalogsOk === false ? reply(500, { error: "falló" }) : reply(200, opts.catalogs ?? CATALOGS);
    }
    if (url === "/api/casos" && init?.method === "POST") {
      return opts.post ? reply(opts.post.status, opts.post.body) : reply(201, { id: "app-1" });
    }
    return reply(404, {});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={["/casos/nuevo"]}>
      <Routes>
        <Route path="/casos/nuevo" element={<NuevoCaso />} />
        <Route path="/casos" element={<p>lista de casos</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const listbox = () => screen.getByRole("listbox", { hidden: true });

function pickSelect(label: RegExp, option: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
  fireEvent.click(within(listbox()).getByRole("option", { name: option, hidden: true }));
}

function pickCombo(label: RegExp, typed: string, option: string) {
  const input = screen.getByRole("combobox", { name: label });
  act(() => input.focus());
  fireEvent.change(input, { target: { value: typed } });
  fireEvent.click(within(listbox()).getByRole("option", { name: option, hidden: true }));
}

async function fillAll() {
  await screen.findByRole("combobox", { name: /Proveedor/ });
  fireEvent.change(screen.getByLabelText(/Fecha inicial/), { target: { value: "2026-01-05" } });
  fireEvent.change(screen.getByLabelText(/ID de orden/), { target: { value: "ORD-1" } });
  fireEvent.change(screen.getByLabelText(/Asociado/), { target: { value: "Ana Ruiz" } });
  fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: "ana@coomeva.com.co" } });
  fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "No llegó" } });
  pickCombo(/Proveedor/, "tienda", "Tienda Coomeva");
  pickSelect(/Fuente/, "Llamada");
  pickSelect(/Tipo/, "RECLAMO");
  pickCombo(/Tema/, "garantia", "GARANTIA DE PRODUCTO");
}

it("offers Fuente and Tipo as lists and Proveedor and Tema as searchable lists without Todos", async () => {
  stubApi();
  renderForm();
  await screen.findByRole("combobox", { name: /Proveedor/ });
  expect(screen.getByRole("combobox", { name: /Tema/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Fuente/ }));
  expect(within(listbox()).getAllByRole("option", { hidden: true }).map((o) => o.textContent)).toEqual([
    "Correo Tienda",
    "Llamada",
  ]);
  fireEvent.keyDown(listbox(), { key: "Escape" });
  expect(screen.queryByText("Todos")).toBeNull();
});

it("sends the picked list values and goes back to the list on success", async () => {
  const fetchMock = stubApi();
  renderForm();
  await fillAll();
  fireEvent.click(screen.getByRole("button", { name: "Guardar caso" }));
  await screen.findByText("lista de casos");
  const post = fetchMock.mock.calls.find(([url, init]) => url === "/api/casos" && init?.method === "POST");
  expect(JSON.parse(String(post?.[1]?.body))).toEqual({
    fechaInicial: "2026-01-05",
    area: "Tienda Coomeva",
    idOrden: "ORD-1",
    asociado: "Ana Ruiz",
    correo: "ana@coomeva.com.co",
    fuente: "Llamada",
    tipo: "RECLAMO",
    tema: "GARANTIA DE PRODUCTO",
    motivo: "No llegó",
  });
});

it("shows the server error under the list and in the linked summary", async () => {
  stubApi({
    post: { status: 400, body: { errors: [{ field: "fuente", message: "Fuente no está en la lista" }] } },
  });
  renderForm();
  await fillAll();
  fireEvent.click(screen.getByRole("button", { name: "Guardar caso" }));
  const alert = await screen.findByRole("alert");
  expect(within(alert).getByRole("link", { name: "Fuente no está en la lista" }).getAttribute("href")).toBe("#fuente");
  expect(document.getElementById("fuente")).toBeTruthy();
  expect(screen.getAllByText("Fuente no está en la lista").length).toBeGreaterThan(1);
});

it("warns and disables Guardar when no data has been loaded", async () => {
  stubApi({ catalogs: { area: [], fuente: [], tipo: [], tema: [] } });
  renderForm();
  expect(await screen.findByText(/Todavía no hay datos cargados/)).toBeTruthy();
  expect((screen.getByRole("button", { name: "Guardar caso" }) as HTMLButtonElement).disabled).toBe(true);
});

it("explains when the lists cannot be loaded", async () => {
  stubApi({ catalogsOk: false });
  renderForm();
  expect(await screen.findByText("No se pudieron cargar las listas")).toBeTruthy();
  await waitFor(() =>
    expect((screen.getByRole("button", { name: "Guardar caso" }) as HTMLButtonElement).disabled).toBe(true),
  );
});
