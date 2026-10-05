import { describe, expect, it, vi } from "vitest";
import { Dictionary } from "../../src/domain/dictionary";
import {
  holidayDates,
  importLoadedCases,
  loadNationalHolidays,
  yearsToLoad,
} from "../../src/holidays/nationalHolidays";

function ok(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("holidayDates", () => {
  it("returns unique sorted ISO dates", () => {
    expect(
      holidayDates({
        holidays: [{ date: "2026-01-12" }, { date: "2026-01-01" }, { date: "2026-01-01" }],
      }),
    ).toEqual(["2026-01-01", "2026-01-12"]);
  });

  it("throws when holidays is missing", () => {
    expect(() => holidayDates({ year: 2026 })).toThrow(/holidays/);
  });
});

describe("loadNationalHolidays", () => {
  it("requests each surrounding year with the pqr-core user agent", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const year = url.match(/(\d{4})/)?.[1];
      return ok({ holidays: [{ date: `${year}-01-01` }] });
    }) as typeof fetch;

    const dates = await loadNationalHolidays(yearsToLoad([2026, 2025]), fetchImpl);

    expect(calls.map((call) => call.url)).toEqual([
      "https://calendariosnacionales.com/co/v1/2024/nacionales.json",
      "https://calendariosnacionales.com/co/v1/2025/nacionales.json",
      "https://calendariosnacionales.com/co/v1/2026/nacionales.json",
      "https://calendariosnacionales.com/co/v1/2027/nacionales.json",
    ]);
    expect(new Headers(calls[0].init?.headers).get("User-Agent")).toBe("pqr-core");
    expect(dates).toEqual(["2024-01-01", "2025-01-01", "2026-01-01", "2027-01-01"]);
  });

  it("throws with the year when the response is not 200", async () => {
    const fetchImpl = (async () => ({ ok: false, status: 500 }) as Response) as typeof fetch;
    await expect(loadNationalHolidays([2026], fetchImpl)).rejects.toThrow(/2026/);
  });
});

describe("importLoadedCases", () => {
  it("does not open the repository when the holiday request fails", async () => {
    const openRepository = vi.fn();
    const fetchImpl = (async () => ({ ok: false, status: 500 }) as Response) as typeof fetch;
    await expect(
      importLoadedCases({
        rows: [{ sheetYear: 2026, rowNumber: 2, cells: {} }],
        dictionary: new Dictionary(new Map()),
        dbPath: "./data/pqr.sqlite",
        fetchImpl,
        openRepository,
      }),
    ).rejects.toThrow(/holiday request failed/);
    expect(openRepository).not.toHaveBeenCalled();
  });

  it("stores the loaded holiday dates after replacing cases", async () => {
    const repository = {
      replaceAll: vi.fn(),
      addHolidays: vi.fn(),
      list: () => [],
      insert: vi.fn(),
      update: vi.fn(),
      listHolidays: () => [],
      listProveedores: () => [],
      addProveedor: vi.fn(),
      renameProveedor: vi.fn(),
    };
    const fetchImpl = (async (url: string) => {
      const year = String(url).match(/(\d{4})/)?.[1];
      return ok({ holidays: [{ date: `${year}-01-01` }] });
    }) as typeof fetch;
    await importLoadedCases({
      rows: [{ sheetYear: 2026, rowNumber: 2, cells: {} }],
      dictionary: new Dictionary(new Map()),
      dbPath: "./data/pqr.sqlite",
      fetchImpl,
      openRepository: () => repository,
    });
    expect(repository.addHolidays).toHaveBeenCalledWith(["2025-01-01", "2026-01-01", "2027-01-01"]);
  });
});
