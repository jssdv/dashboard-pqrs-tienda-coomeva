// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "./auth";
import { Login } from "./Login";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubApi(login: { ok: boolean; status: number; body: unknown }) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/auth/estado") return { ok: true, status: 200, json: async () => ({ requiereSetup: false }) };
    return { ok: login.ok, status: login.status, json: async () => login.body };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderLogin(setUser = vi.fn()) {
  render(
    <AuthContext.Provider value={{ user: null, loading: false, setUser }}>
      <MemoryRouter initialEntries={["/login?next=/proveedores"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/proveedores" element={<p>destino</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return setUser;
}

function fillAndSubmit(usuario: string, password: string) {
  fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: usuario } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

it("shows the server message when the login is refused", async () => {
  stubApi({ ok: false, status: 401, body: { error: "Usuario o contraseña incorrectos" } });
  renderLogin();
  fillAndSubmit("ana", "mal");
  expect((await screen.findByRole("alert")).textContent).toBe("Usuario o contraseña incorrectos");
});

it("logs in and returns to the next path", async () => {
  const user = { id: 2, usuario: "ana", rol: "viewer", activo: true, creadoEn: "2026-01-01T00:00:00.000Z" };
  const fetchMock = stubApi({ ok: true, status: 200, body: { user } });
  const setUser = renderLogin();
  fillAndSubmit("ana", "clave-larga");
  expect(await screen.findByText("destino")).toBeTruthy();
  expect(setUser).toHaveBeenCalledWith(user);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/auth/login",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ usuario: "ana", password: "clave-larga" }) }),
  );
});
