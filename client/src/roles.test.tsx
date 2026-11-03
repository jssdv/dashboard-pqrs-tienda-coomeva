// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, type AuthState } from "./auth";
import type { AuthUser, Rol } from "./api";
import { Proveedores } from "./Proveedores";
import { Shell } from "./Shell";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        colaVencida: null,
        matrizProveedorTipo: [],
        proveedores: [{ nombre: "Tienda", casos: 3, abiertos: 2, vencidos: 1, diasPromedio: 4.5 }],
      }),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function withRole(rol: Rol, node: ReactNode) {
  const user: AuthUser = { id: 1, usuario: "ana", rol, activo: true, creadoEn: "2026-01-01T00:00:00.000Z" };
  const value: AuthState = { user, loading: false, setUser: () => {} };
  return <AuthContext.Provider value={value}>{node}</AuthContext.Provider>;
}

it("a viewer sees the providers without the add form or edit buttons", async () => {
  render(withRole("viewer", <MemoryRouter><Proveedores /></MemoryRouter>));
  await screen.findByRole("button", { name: "Tienda" });
  expect(screen.queryByRole("button", { name: "Agregar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Editar Tienda" })).toBeNull();
});

it("a user keeps the add form and edit buttons", async () => {
  render(withRole("user", <MemoryRouter><Proveedores /></MemoryRouter>));
  await screen.findByRole("button", { name: "Tienda" });
  expect(screen.getByRole("button", { name: "Agregar" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Editar Tienda" })).toBeTruthy();
});

it("only an admin gets the Administración link; a viewer gets no Nuevo caso either", () => {
  const renderShell = (rol: Rol) =>
    render(
      withRole(
        rol,
        <MemoryRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<p>contenido</p>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      ),
    );

  const viewer = renderShell("viewer");
  expect(screen.queryAllByRole("link", { name: "Nuevo caso" })).toHaveLength(0);
  expect(screen.queryAllByRole("link", { name: "Administración" })).toHaveLength(0);
  viewer.unmount();

  renderShell("admin");
  expect(screen.getAllByRole("link", { name: "Administración" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("link", { name: "Nuevo caso" }).length).toBeGreaterThan(0);
});
