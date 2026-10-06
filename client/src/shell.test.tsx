// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
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
  expect((await screen.findAllByLabelText("63 vencidos")).length).toBeGreaterThan(0);
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

it("renders a full sidebar from lg and an icon rail between md and lg", () => {
  stubSummary(null);
  renderShell();
  const asides = Array.from(document.querySelectorAll("aside"));
  expect(asides).toHaveLength(2);
  const full = asides.find((aside) => aside.className.includes("lg:flex")) as HTMLElement;
  const rail = asides.find((aside) => aside.className.includes("lg:hidden")) as HTMLElement;
  expect(full.className).toContain("hidden");
  expect(rail.className).toContain("md:flex");
  expect(full.textContent).toContain("Casos");
  expect(rail.textContent).toBe("");
});

it("names every rail link for assistive tech and keeps the overdue counter", async () => {
  stubSummary(63);
  renderShell();
  const rail = document.querySelector("aside.lg\\:hidden") as HTMLElement;
  for (const name of ["Panel", "Casos", "Proveedores", "Nuevo caso"]) {
    const link = Array.from(rail.querySelectorAll("a")).find((a) => a.getAttribute("aria-label")?.startsWith(name));
    expect(link, name).toBeTruthy();
    expect(link?.getAttribute("title")).toBeTruthy();
  }
  await screen.findAllByLabelText("63 vencidos");
  expect(within(rail).getByLabelText("63 vencidos")).toBeTruthy();
});
