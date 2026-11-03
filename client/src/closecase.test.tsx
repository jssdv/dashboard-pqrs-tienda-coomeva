// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { CerrarCaso } from "./CaseForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const CASO = {
  id: "2026-2",
  sheetYear: 2026,
  rowNumber: 2,
  fechaInicial: "2026-01-05",
  fechaSolucion: null,
  fechaInicialInvalida: false,
  fechaSolucionInvalida: false,
  diasSolucion: null,
  area: "Tienda Coomeva",
  areaOriginal: "Tienda Coomeva",
  idOrden: "ORD-9",
  asociado: "Ana Ruiz",
  correo: "ana@coomeva.com.co",
  fuente: "Llamada",
  fuenteOriginal: "Llamada",
  tipo: "RECLAMO",
  tipoOriginal: "RECLAMO",
  tema: "BOLETERIA",
  temaOriginal: "BOLETERIA",
  motivo: "No llegó",
  solucion: null,
  riesgo: { diasAbiertos: 6, diasParaVencer: 4, estado: "por-vencer" },
};

function stubApi(opts: { cases?: unknown[]; post?: { status: number; body: unknown } } = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
    if (url === "/api/casos") return reply(200, { cases: opts.cases ?? [CASO] });
    if (url.endsWith("/cerrar") && init?.method === "POST") {
      return opts.post ? reply(opts.post.status, opts.post.body) : reply(200, { ...CASO, fechaSolucion: "2026-01-12" });
    }
    return reply(404, {});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
}

function renderClose(reload = vi.fn()) {
  function Parent() {
    return (
      <>
        <Where />
        <Outlet context={{ reload }} />
      </>
    );
  }
  render(
    <MemoryRouter initialEntries={["/casos/2026-2/cerrar"]}>
      <Routes>
        <Route path="/casos" element={<Parent />}>
          <Route path=":id/cerrar" element={<CerrarCaso />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return reload;
}

it("shows a summary of the case being closed", async () => {
  stubApi();
  renderClose();
  const dialog = await screen.findByRole("dialog", { name: "Cerrar caso" });
  await within(dialog).findByText("ORD-9");
  expect(within(dialog).getByText("Ana Ruiz")).toBeTruthy();
  expect(within(dialog).getByText("Tienda Coomeva")).toBeTruthy();
  expect(within(dialog).getByText("RECLAMO")).toBeTruthy();
  expect(within(dialog).getByRole("img", { name: "6 días hábiles de 10" })).toBeTruthy();
});

it("starts with today's Bogotá date as the solution date", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-12T15:00:00Z"));
  stubApi();
  renderClose();
  const input = (await screen.findByLabelText(/Fecha de solución/)) as HTMLInputElement;
  expect(input.value).toBe("2026-01-12");
});

it("sends the date and text, asks the list to reload and goes back", async () => {
  const fetchMock = stubApi();
  const reload = renderClose();
  await screen.findByText("ORD-9");
  fireEvent.change(screen.getByLabelText(/Fecha de solución/), { target: { value: "2026-01-12" } });
  fireEvent.change(screen.getByLabelText(/Texto de solución/), { target: { value: "Se reenvió el pin" } });
  fireEvent.click(screen.getByRole("button", { name: "Cerrar caso" }));
  await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  const post = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/cerrar"));
  expect(post?.[0]).toBe("/api/casos/2026-2/cerrar");
  expect(JSON.parse(String(post?.[1]?.body))).toEqual({ fechaSolucion: "2026-01-12", solucion: "Se reenvió el pin" });
  await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/casos"));
});

it("saves with Ctrl+Enter", async () => {
  const fetchMock = stubApi();
  renderClose();
  await screen.findByText("ORD-9");
  fireEvent.change(screen.getByLabelText(/Fecha de solución/), { target: { value: "2026-01-12" } });
  fireEvent.change(screen.getByLabelText(/Texto de solución/), { target: { value: "ok" } });
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Enter", metaKey: true });
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/cerrar"))).toBe(true));
});

it("shows the server errors under the fields and in the linked summary", async () => {
  stubApi({
    post: {
      status: 400,
      body: { errors: [{ field: "solucion", message: "Texto de solución es obligatorio" }] },
    },
  });
  renderClose();
  await screen.findByText("ORD-9");
  fireEvent.click(screen.getByRole("button", { name: "Cerrar caso" }));
  const alert = await screen.findByRole("alert");
  expect(within(alert).getByRole("link", { name: "Texto de solución es obligatorio" }).getAttribute("href")).toBe("#solucion");
  expect(screen.getAllByText("Texto de solución es obligatorio").length).toBeGreaterThan(1);
});

it("says the case was not found and disables saving", async () => {
  stubApi({ cases: [] });
  renderClose();
  expect(await screen.findByText("No se encontró el caso.")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Cerrar caso" }) as HTMLButtonElement).disabled).toBe(true);
});

it("closes with Cancelar back to the list", async () => {
  stubApi();
  renderClose();
  await screen.findByText("ORD-9");
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/casos"));
});
