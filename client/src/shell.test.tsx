// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PageHead, Shell } from "./Shell";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderShell() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<p>contenido</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function stubSummary(colaVencida: number | null, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status: ok ? 200 : 500,
      json: async () => (ok ? { colaVencida } : { error: "falló" }),
    })),
  );
}

it("puts the Nuevo caso action in the sidebar and drops the brand block", () => {
  stubSummary(null);
  renderShell();
  const aside = document.querySelector("aside") as HTMLElement;
  const link = Array.from(aside.querySelectorAll("a")).find((a) => a.textContent === "Nuevo caso");
  expect(link?.getAttribute("href")).toBe("/casos/nuevo");
  expect(aside.textContent).not.toContain("Tienda Coomeva");
});

it("shows the overdue count next to Casos when there are overdue cases", async () => {
  stubSummary(63);
  renderShell();
  expect(await screen.findByLabelText("63 vencidos")).toBeTruthy();
});

it("shows no counter when the summary fails or has no holidays", async () => {
  stubSummary(null, false);
  renderShell();
  await screen.findByText("contenido");
  expect(screen.queryByLabelText(/vencidos/)).toBeNull();
  cleanup();
  stubSummary(null);
  renderShell();
  await screen.findByText("contenido");
  expect(screen.queryByLabelText(/vencidos/)).toBeNull();
  expect(screen.getAllByRole("link", { name: "Casos" }).length).toBeGreaterThan(0);
});

it("has no Cerrar menú button and PageHead has no eyebrow", () => {
  stubSummary(null);
  renderShell();
  expect(screen.queryByRole("button", { name: "Cerrar menú" })).toBeNull();
  cleanup();
  render(<PageHead title="Casos" lede="Una línea" />);
  expect(screen.queryByText("Tienda Coomeva")).toBeNull();
  expect(screen.getByRole("heading", { name: "Casos" })).toBeTruthy();
});
