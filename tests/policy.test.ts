import { describe, expect, it } from "vitest";
import { compareDividendTax, dividendLines } from "@/lib/calc/dividends";
import { buckets, fiNumber, monthsUntil, runChecks } from "@/lib/calc/policy";
import { classTotals, exposures, monthsToCap, valueHoldings } from "@/lib/calc/portfolio";
import { migrate } from "@/lib/storage/migrate";
import { DEFAULT_DATA, type UserData } from "@/lib/storage/types";

const NOW = new Date(2026, 9, 7); // 2026-10-07

const base = (p: Partial<UserData> = {}): UserData => ({ ...DEFAULT_DATA, ...p });

describe("portfolio valuation & look-through", () => {
  const holdings = [
    { id: "a", symbol: "2330", name: "台積電", assetClass: "stock" as const, quantity: 100, cost: 150000 },
    { id: "b", symbol: "0050", name: "元大台灣50", assetClass: "stock" as const, quantity: 1000 },
    { id: "c", symbol: "VT", name: "VT", assetClass: "stock" as const, quantity: 10 },
    { id: "d", symbol: "", name: "現金", assetClass: "cash" as const, quantity: 50000 },
  ];
  const prices = { "2330": { price: 2000, fxToTwd: 1 }, "0050": { price: 100, fxToTwd: 1 }, VT: { price: 100, fxToTwd: 30 } };
  const rows = valueHoldings(holdings, prices);

  it("values holdings in TWD and computes gain", () => {
    expect(rows.map((r) => r.value)).toEqual([200000, 100000, 30000, 50000]);
    expect(rows[0].gain).toBe(50000);
    expect(rows[1].gain).toBeNull();
    expect(classTotals(rows)).toEqual([330000, 0, 50000]);
  });

  it("adds ETF look-through to direct holdings and ignores broad funds", () => {
    const ex = exposures(rows);
    expect(ex).toHaveLength(1);
    expect(ex[0].company).toBe("2330");
    expect(ex[0].direct).toBe(200000);
    expect(ex[0].viaEtf).toBeCloseTo(60000);
    expect(ex[0].share).toBeCloseTo(260000 / 380000);
  });

  it("missing prices give null value", () => {
    expect(valueHoldings(holdings.slice(0, 1), {})[0].value).toBeNull();
  });
});

describe("monthsToCap", () => {
  it("matches the lesson table", () => {
    expect(monthsToCap(350000, 500000, 0.3, 0, 15000)).toBe(45);
    expect(monthsToCap(350000, 500000, 0.3, 7500, 7500)).toBeNull();
    expect(monthsToCap(350000, 500000, 0.3, 15000, 0)).toBeNull();
    expect(monthsToCap(350000, 1000000, 0.3, 0, 15000)).toBe(12);
    expect(monthsToCap(100000, 1000000, 0.3, 15000, 0)).toBe(0);
  });
});

describe("buckets & checks", () => {
  const d = base({
    finances: { cash: 1000000, monthlyExpense: 40000, annualTakeHome: 1200000, marginalTaxRate: 0.12 },
    house: { enabled: true, target: 1500000, targetDate: "2028-10" },
  });

  it("fills emergency first, then house", () => {
    const b = buckets(d, NOW);
    expect(b.emergencyNeed).toBe(240000);
    expect(b.emergencyHave).toBe(240000);
    expect(b.houseHave).toBe(760000);
    expect(b.houseMonths).toBe(24);
    expect(b.houseMonthly).toBeCloseTo((1500000 - 760000) / 24);
    expect(b.spareCash).toBe(0);
  });

  it("flags near-term house shortfall and concentration", () => {
    const rows = valueHoldings(
      [
        { id: "a", symbol: "2330", name: "台積電", assetClass: "stock", quantity: 100 },
        { id: "b", symbol: "00697B", name: "美債", assetClass: "bond", quantity: 1000 },
      ],
      { "2330": { price: 2000, fxToTwd: 1 }, "00697B": { price: 30, fxToTwd: 1 } },
    );
    const checks = runChecks(d, rows, NOW);
    const by = Object.fromEntries(checks.map((c) => [c.id, c]));
    expect(by.emergency.status).toBe("ok");
    expect(by.house.status).toBe("warn");
    expect(by.concentration.status).toBe("warn");
    expect(by.concentration.title).toContain("台積電");
    expect(by.review.status).toBe("todo");
  });

  it("asks for missing inputs instead of guessing", () => {
    const checks = runChecks(base({ house: { enabled: true, target: 0, targetDate: "" } }), [], NOW);
    expect(checks.find((c) => c.id === "emergency")?.status).toBe("todo");
    expect(checks.find((c) => c.id === "house")?.status).toBe("todo");
  });

  it("review becomes due after the interval", () => {
    const d2 = base({ policy: { ...DEFAULT_DATA.policy, lastReviewed: "2026-06-01", reviewEveryMonths: 3 } });
    expect(runChecks(d2, [], NOW).find((c) => c.id === "review")?.status).toBe("warn");
  });

  it("helpers", () => {
    expect(monthsUntil("2026-12", NOW)).toBe(2);
    expect(monthsUntil("bad", NOW)).toBeNull();
    expect(fiNumber(50000)).toBe(15000000);
  });
});

describe("dividends", () => {
  it("applies NHI surcharge only when a single payment reaches the threshold", () => {
    const [small, big, us] = dividendLines([
      { symbol: "A", annual: 60000, paymentsPerYear: 4, domestic: true },
      { symbol: "B", annual: 60000, paymentsPerYear: 1, domestic: true },
      { symbol: "VT", annual: 60000, paymentsPerYear: 1, domestic: false },
    ]);
    expect(small.nhi).toBe(0);
    expect(big.nhi).toBeCloseTo(60000 * 0.0211);
    expect(us.nhi).toBe(0);
  });

  it("compares combined vs separate taxation", () => {
    expect(compareDividendTax(100000, 0.12).combined).toBeCloseTo(3500);
    expect(compareDividendTax(100000, 0.05).combined).toBeCloseTo(-3500);
    expect(compareDividendTax(100000, 0.4).better).toBe("separate");
    // credit cap 80,000
    expect(compareDividendTax(2000000, 0.3).combined).toBeCloseTo(600000 - 80000);
  });
});

describe("migrate", () => {
  it("upgrades v1 data", () => {
    const v1 = { version: 1, plan: { target: [60, 30, 10], riskAnswers: [1, 1, 1, 1, 1], age: 40, initial: 1, monthly: 5000, years: 10 }, holdings: [], watchlist: ["0050"] };
    const d = migrate(v1);
    expect(d.version).toBe(2);
    expect(d.policy.target).toEqual([60, 30, 10]);
    expect(d.policy.monthlyContribution).toBe(5000);
    expect(d.age).toBe(40);
    expect(d.lessonsDone).toEqual([]);
  });
  it("fills missing v2 fields and rejects junk", () => {
    expect(migrate({ version: 2, finances: { cash: 5 } }).finances.monthlyExpense).toBe(0);
    expect(migrate({ version: 2, finances: { cash: 5 } }).finances.cash).toBe(5);
    expect(migrate("nope")).toBe(DEFAULT_DATA);
  });
});
