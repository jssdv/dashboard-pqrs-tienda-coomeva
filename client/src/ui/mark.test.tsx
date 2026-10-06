// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Mark } from "./Mark";

afterEach(cleanup);

it.each(["chevron", "cross", "arrow"] as const)("%s is a decorative, square-capped stroke drawing", (name) => {
  const { container } = render(<Mark name={name} />);
  const svg = container.querySelector("svg") as SVGElement;
  expect(svg.getAttribute("aria-hidden")).toBe("true");
  expect(svg.getAttribute("focusable")).toBe("false");
  expect(svg.getAttribute("stroke-linecap")).toBe("square");
  expect(svg.getAttribute("fill")).toBe("none");
  expect(svg.querySelector("path")?.getAttribute("d")).toBeTruthy();
});

it("takes its color from the text and accepts a class for size", () => {
  const { container } = render(<Mark name="chevron" className="size-4" />);
  const svg = container.querySelector("svg") as SVGElement;
  expect(svg.getAttribute("stroke")).toBe("currentColor");
  expect(svg.getAttribute("class")).toContain("size-4");
});
