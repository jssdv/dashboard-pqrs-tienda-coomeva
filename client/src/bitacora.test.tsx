// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Bitacora } from "./Bitacora";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ENTRY = { id: 1, caseId: "c1", fecha: "2026-01-12", texto: "Se llamó", creadoEn: "2026-01-12T10:00:00Z" };

function stub(post: { status: number; body: unknown }) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
    return init?.method === "POST" ? reply(post.status, post.body) : reply(200, { entries: [ENTRY] });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

it("lists entries and adds a new one without closing the case", async () => {
  const fetchMock = stub({
    status: 201,
    body: { id: 2, caseId: "c1", fecha: "2026-01-15", texto: "Respondió", creadoEn: "x" },
  });
  render(<Bitacora caseId="c1" />);
  expect(await screen.findByText("Se llamó")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Fecha del avance"), { target: { value: "2026-01-15" } });
  fireEvent.change(screen.getByLabelText("Avance"), { target: { value: "Respondió" } });
  fireEvent.click(screen.getByRole("button", { name: "Registrar avance" }));
  expect(await screen.findByText("Respondió")).toBeTruthy();
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
  expect(post?.[0]).toBe("/api/casos/c1/bitacora");
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/cerrar"))).toBe(false);
});

it("shows field errors from the server", async () => {
  stub({ status: 400, body: { errors: [{ field: "texto", message: "Texto es obligatorio" }] } });
  render(<Bitacora caseId="c1" />);
  await screen.findByText("Se llamó");
  fireEvent.click(screen.getByRole("button", { name: "Registrar avance" }));
  await waitFor(() => expect(screen.getByText("Texto es obligatorio")).toBeTruthy());
});
