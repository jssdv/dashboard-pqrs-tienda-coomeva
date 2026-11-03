import { describe, expect, it, vi } from "vitest";
import { Dictionary } from "../../src/domain/dictionary";
import type { CaseRepository } from "../../src/store/repository";
import {
  holidayDates,
  importLoadedCases,
  loadNationalHolidays,
  parseHolidayCsv,
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

describe("parseHolidayCsv", () => {
  it("reads ISO dates, ignoring header, blanks and comments, sorted and unique", () => {
    expect(parseHolidayCsv("date\n# nota\n2024-01-08\n\n2024-01-01\n2024-01-08\n")).toEqual([
      "2024-01-01",
      "2024-01-08",
    ]);
  });

  it("throws on a line that is not an ISO date", () => {
    expect(() => parseHolidayCsv("date\n08/01/2024")).toThrow(/08\/01\/2024/);
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

  it("skips years the service does not have (404) and reports them", async () => {
    const fetchImpl = (async (url: string) => {
      const year = url.match(/(\d{4})/)?.[1];
      if (year === "2024") return { ok: false, status: 404 } as Response;
      return ok({ holidays: [{ date: `${year}-01-01` }] });
    }) as typeof fetch;
    const missing: number[] = [];

    const dates = await loadNationalHolidays([2024, 2025], fetchImpl, (year) => missing.push(year));

    expect(dates).toEqual(["2025-01-01"]);
    expect(missing).toEqual([2024]);
  });

  it("throws when the service has none of the requested years", async () => {
    const fetchImpl = (async () => ({ ok: false, status: 404 }) as Response) as typeof fetch;
    await expect(loadNationalHolidays([2024, 2025], fetchImpl)).rejects.toThrow(/no holidays/);
  });

  it("throws with the year when the response is not 200", async () => {
    const fetchImpl = (async () => ({ ok: false, status: 500 }) as Response) as typeof fetch;
    await expect(loadNationalHolidays([2026], fetchImpl)).rejects.toThrow(/2026/);
  });
});

describe("importLoadedCases", () => {
  it("does not replace cases when the holiday request fails", async () => {
    const repository = { replaceAll: vi.fn(), addHolidays: vi.fn() } as unknown as CaseRepository;
    const fetchImpl = (async () => ({ ok: false, status: 500 }) as Response) as typeof fetch;
    await expect(
      importLoadedCases({
        rows: [{ sheetYear: 2026, rowNumber: 2, cells: {} }],
        dictionary: new Dictionary(new Map()),
        repository,
        fetchImpl,
      }),
    ).rejects.toThrow(/holiday request failed/);
    expect(repository.replaceAll).not.toHaveBeenCalled();
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
      listProveedorInfo: () => [],
      addProveedor: vi.fn(),
      updateProveedor: vi.fn(),
      renameProveedor: vi.fn(),
      listBitacora: () => [],
      addBitacora: vi.fn(),
    };
    const fetchImpl = (async (url: string) => {
      const year = String(url).match(/(\d{4})/)?.[1];
      return ok({ holidays: [{ date: `${year}-01-01` }] });
    }) as typeof fetch;
    await importLoadedCases({
      rows: [{ sheetYear: 2026, rowNumber: 2, cells: {} }],
      dictionary: new Dictionary(new Map()),
      repository,
      fetchImpl,
    });
    expect(repository.addHolidays).toHaveBeenCalledWith(["2025-01-01", "2026-01-01", "2027-01-01"]);
  });

  it("uses extra holidays and does not request the years they cover", async () => {
    const repository = {
      replaceAll: vi.fn(),
      addHolidays: vi.fn(),
      list: () => [],
      insert: vi.fn(),
      update: vi.fn(),
      listHolidays: () => [],
      listProveedores: () => [],
      listProveedorInfo: () => [],
      addProveedor: vi.fn(),
      updateProveedor: vi.fn(),
      renameProveedor: vi.fn(),
      listBitacora: () => [],
      addBitacora: vi.fn(),
    };
    const requested: string[] = [];
    const fetchImpl = (async (url: string) => {
      const year = String(url).match(/(\d{4})/)?.[1] as string;
      requested.push(year);
      if (Number(year) < 2025) return { ok: false, status: 404 } as Response;
      return ok({ holidays: [{ date: `${year}-01-01` }] });
    }) as typeof fetch;
    const missing: number[] = [];
    await importLoadedCases({
      rows: [{ sheetYear: 2024, rowNumber: 2, cells: {} }, { sheetYear: 2025, rowNumber: 3, cells: {} }],
      dictionary: new Dictionary(new Map()),
      repository,
      fetchImpl,
      extraHolidays: ["2023-01-09", "2024-01-08"],
      onMissingYear: (year) => missing.push(year),
    });
    expect(requested).toEqual(["2025", "2026"]);
    expect(missing).toEqual([]);
    expect(repository.addHolidays).toHaveBeenCalledWith([
      "2023-01-09",
      "2024-01-08",
      "2025-01-01",
      "2026-01-01",
    ]);
  });
});
