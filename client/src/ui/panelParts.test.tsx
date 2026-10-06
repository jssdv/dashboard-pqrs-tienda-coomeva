// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Sparkline } from "./Sparkline";
import { SegmentedBar } from "./SegmentedBar";
import { StatCard } from "./StatCard";
import { TipoTag } from "./TipoTag";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const wrap = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

it("Sparkline survives empty and single-point series and always has a label", () => {
  const { rerender } = render(<Sparkline values={[]} label="Sin datos" />);
  expect(screen.getByRole("img", { name: "Sin datos" })).toBeTruthy();
  rerender(<Sparkline values={[4]} label="Un punto" />);
  expect(screen.getByRole("img", { name: "Un punto" }).querySelector("circle")).toBeTruthy();
  rerender(<Sparkline values={[1, null, 3]} label="Con hueco" />);
  expect(screen.getByRole("img", { name: "Con hueco" })).toBeTruthy();
});

it("Sparkline bars draw one rect per value", () => {
  render(<Sparkline values={[1, 2, 3]} label="Barras" kind="bar" />);
  expect(screen.getByRole("img", { name: "Barras" }).querySelectorAll("rect")).toHaveLength(3);
});

it("StatCard shows label, value and a delta with icon and text", () => {
  wrap(<StatCard label="Abiertos" value="245" delta={{ pct: 12.4, good: "down" }} />);
  const card = screen.getByRole("heading", { name: "Abiertos" }).closest("[data-stat]") as HTMLElement;
  expect(within(card).getByText("245")).toBeTruthy();
  expect(card.textContent).toContain("12 % vs mes anterior");
  expect(card.textContent).toContain("sube");
  expect(card.querySelector("[data-tone='bad']")).toBeTruthy();
});

it("StatCard tones the delta by whether the direction is good", () => {
  wrap(<StatCard label="Días" value="10" delta={{ pct: -17, good: "down" }} />);
  const card = screen.getByRole("heading", { name: "Días" }).closest("[data-stat]") as HTMLElement;
  expect(card.textContent).toContain("baja");
  expect(card.querySelector("[data-tone='good']")).toBeTruthy();
});

it("StatCard shows a dash when the delta cannot be computed", () => {
  wrap(<StatCard label="Entrados" value="3" delta={{ pct: null, good: "up" }} />);
  const card = screen.getByRole("heading", { name: "Entrados" }).closest("[data-stat]") as HTMLElement;
  expect(card.textContent).toContain("—");
  expect(card.textContent).not.toMatch(/NaN|Infinity|null/);
});

it("StatCard links the value when href is given", () => {
  wrap(<StatCard label="Abiertos" value="245" href="/casos?estado=abiertos" />);
  expect(screen.getByRole("link", { name: "245" }).getAttribute("href")).toBe("/casos?estado=abiertos");
});

it("SegmentedBar sizes segments by count, skips zeros and lists counts in a legend", () => {
  wrap(
    <SegmentedBar
      segments={[
        { key: "a", label: "En plazo", count: 1, tone: "ok", href: "/casos?plazo=en-plazo" },
        { key: "b", label: "Por vencer", count: 0, tone: "warn" },
        { key: "c", label: "Vencido", count: 3, tone: "danger", href: "/casos?plazo=vencido" },
      ]}
    />,
  );
  const bar = screen.getByRole("img", { name: /En plazo 1, Vencido 3/ });
  const segments = bar.querySelectorAll("[data-segment]");
  expect(segments).toHaveLength(2);
  expect((segments[1] as HTMLElement).style.flexGrow).toBe("3");
  const legend = screen.getByRole("list");
  expect(within(legend).getByRole("link", { name: /Vencido/ }).getAttribute("href")).toBe("/casos?plazo=vencido");
  expect(legend.textContent).toContain("Por vencer");
});

it("TipoTag shows the text next to its color dot and a neutral dot for unknown types", () => {
  const { rerender } = render(<TipoTag tipo="RECLAMO" />);
  expect(screen.getByText("RECLAMO")).toBeTruthy();
  expect((document.querySelector("[data-dot]") as HTMLElement).style.backgroundColor).toBe("rgb(235, 104, 52)");
  rerender(<TipoTag tipo={null} />);
  expect(screen.getByText("—")).toBeTruthy();
});

it("StatCard staggers its entrance by index", () => {
  wrap(<StatCard label="Abiertos" value="245" index={2} />);
  const card = screen.getByRole("heading", { name: "Abiertos" }).closest("[data-stat]") as HTMLElement;
  expect(card.className).toContain("fade-up");
  expect(card.style.getPropertyValue("--i")).toBe("2");
});

it("StatCard counts up to its value when motion is allowed", () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
  );
  wrap(<StatCard label="Tasa" value="89.6%" />);
  const card = screen.getByRole("heading", { name: "Tasa" }).closest("[data-stat]") as HTMLElement;
  expect(within(card).getByText("0.0%")).toBeTruthy();
  act(() => {
    vi.advanceTimersByTime(800);
  });
  expect(within(card).getByText("89.6%")).toBeTruthy();
});

it("StatCard shows non-numeric values as they are", () => {
  wrap(<StatCard label="Entrados" value="—" />);
  expect(screen.getByText("—")).toBeTruthy();
});

it("Sparkline reveals its line and staggers its bars", () => {
  const { rerender } = render(<Sparkline values={[1, 2, 3]} label="Línea" />);
  expect(screen.getByRole("img", { name: "Línea" }).querySelector("g.reveal-x")).toBeTruthy();
  rerender(<Sparkline values={[1, 2, 3]} label="Barras" kind="bar" />);
  const rects = Array.from(screen.getByRole("img", { name: "Barras" }).querySelectorAll("rect"));
  expect(rects.map((rect) => rect.getAttribute("style") ?? "")).toEqual(
    expect.arrayContaining([expect.stringContaining("--i")]),
  );
  expect(rects[0].getAttribute("class")).toContain("fade-up");
});

it("SegmentedBar segments and PlazoBar fill grow from the left", async () => {
  wrap(<SegmentedBar segments={[{ key: "a", label: "A", count: 2, tone: "ok" }]} />);
  expect(document.querySelector("[data-segment]")?.className).toContain("grow-x");
  cleanup();
  const { PlazoBar } = await import("./PlazoBar");
  render(<PlazoBar dias={4} estado="en-plazo" />);
  expect((document.querySelector("[data-fill]") as HTMLElement).className).toContain("grow-x");
});
