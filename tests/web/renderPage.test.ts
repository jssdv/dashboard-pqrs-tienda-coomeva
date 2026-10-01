import { describe, expect, it } from "vitest";
import type { DashboardSummary } from "../../src/domain/summary";
import { renderPage } from "../../src/web/renderPage";

function summary(over: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    total: 0,
    abiertos: 0,
    cerrados: 0,
    fechasInvalidas: 0,
    porAnio: [],
    porArea: [],
    porFuente: [],
    porTipo: [],
    porTema: [],
    porMes: [],
    dias: { casos: 0, promedio: null },
    ...over,
  };
}

describe("renderPage totals", () => {
  it("shows one open case and the invalid-date line", () => {
    const html = renderPage(
      summary({ total: 1, abiertos: 1, cerrados: 0, fechasInvalidas: 2, dias: { casos: 0, promedio: null } }),
    );
    expect(html).toContain('data-kpi="total">1');
    expect(html).toContain('data-kpi="abiertos">1');
    expect(html).toContain('data-kpi="cerrados">0');
    expect(html).toContain('data-kpi="promedio">—');
    expect(html).toContain("Fechas inválidas: 2");
  });

  it("shows the empty import message when there are no cases", () => {
    const html = renderPage(summary());
    expect(html).toContain("Todavía no hay casos importados");
    expect(html).toContain("npm run import");
  });
});

describe("renderPage charts", () => {
  it("renders two months as labeled bars", () => {
    const html = renderPage(
      summary({
        total: 3,
        cerrados: 3,
        porMes: [
          { key: "2026-01", count: 2 },
          { key: "2026-02", count: 1 },
        ],
      }),
    );
    expect(html).toContain('data-month="2026-01"');
    expect(html).toContain('data-month="2026-02"');
    expect(html).toContain("2026-01");
    expect(html).toContain(">2<");
  });

  it("uses a list instead of a donut when there are six types", () => {
    const porTipo = ["A", "B", "C", "D", "E", "F"].map((key, index) => ({
      key,
      count: index + 1,
    }));
    const html = renderPage(summary({ total: 21, cerrados: 21, porTipo }));
    expect(html).not.toContain('class="donut"');
    expect(html).toContain('data-chart="tipo"');
    expect(html).toContain("<table>");
    expect(html).toContain(">F<");
  });

  it("renders a donut and a table for three types", () => {
    const html = renderPage(
      summary({
        total: 6,
        cerrados: 6,
        porTipo: [
          { key: "RECLAMO", count: 3 },
          { key: "QUEJA", count: 2 },
          { key: "PETICION", count: 1 },
        ],
      }),
    );
    expect(html).toContain('class="donut"');
    expect(html).toContain("<table>");
    expect(html).toContain("RECLAMO");
    expect(html).toContain(">3<");
  });
});
