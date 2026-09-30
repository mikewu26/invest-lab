import { describe, expect, it } from "vitest";
import { analyze, movingAverage } from "@/lib/calc/trend";
import { rebalance } from "@/lib/calc/rebalance";
import { simulate } from "@/lib/calc/simulate";
import { ageRule, scoreRisk } from "@/lib/calc/risk";

describe("trend", () => {
  it("moving average", () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
  it("drawdown and total return", () => {
    const m = analyze([100, 120, 60, 90]);
    expect(m.totalReturn).toBeCloseTo(-0.1);
    expect(m.maxDrawdown).toBeCloseTo(-0.5);
    expect(m.currentDrawdown).toBeCloseTo(-0.25);
    expect(m.cagr).toBeNull(); // < half a year
  });
  it("detects uptrend alignment", () => {
    const up = Array.from({ length: 120 }, (_, i) => 100 + i);
    expect(analyze(up).signal).toBe("up");
    expect(analyze(up.slice().reverse()).signal).toBe("down");
  });
});

describe("rebalance", () => {
  it("full rebalance hits target exactly", () => {
    const r = rebalance([180000, 40000, 30000], [60, 30, 10], 20000, false);
    expect(r.total).toBe(270000);
    expect(r.rows[0].action).toBeCloseTo(162000 - 180000);
    expect(r.maxDeviation).toBeCloseTo(0);
  });
  it("no-sell never sells and spends exactly the new money", () => {
    const r = rebalance([180000, 40000, 30000], [60, 30, 10], 20000, true);
    r.rows.forEach((row) => expect(row.action).toBeGreaterThanOrEqual(0));
    expect(r.rows.reduce((s, row) => s + row.action, 0)).toBeCloseTo(20000);
    expect(r.rows[1].action).toBeCloseTo(20000); // only bonds are underweight
  });
});

describe("simulate", () => {
  it("is deterministic and ordered", () => {
    const a = simulate({ initial: 100000, monthly: 10000, years: 10, weights: [60, 30, 10] });
    const b = simulate({ initial: 100000, monthly: 10000, years: 10, weights: [60, 30, 10] });
    expect(a.p50).toEqual(b.p50);
    expect(a.principal[10]).toBe(100000 + 10000 * 120);
    for (let y = 1; y <= 10; y++) {
      expect(a.p10[y]).toBeLessThanOrEqual(a.p50[y]);
      expect(a.p50[y]).toBeLessThanOrEqual(a.p90[y]);
    }
  });
  it("all-cash with zero volatility grows by the cash rate", () => {
    const r = simulate({
      initial: 1000, monthly: 0, years: 1, weights: [0, 0, 100], runs: 10,
      assumptions: { mu: [0, 0, 0.12], sigma: [0, 0, 0], rho: 0 },
    });
    expect(r.p50[1]).toBeCloseTo(1000 * Math.pow(1.01, 12), 6);
  });
});

describe("risk", () => {
  it("scores profiles", () => {
    expect(scoreRisk([0, 0, 0, 0, 0]).profile).toBe("保守");
    expect(scoreRisk([2, 2, 1, 2, 2]).profile).toBe("穩健");
    expect(scoreRisk([3, 3, 3, 3, 3]).profile).toBe("積極");
    expect(scoreRisk([3, 3, 3, 3, 1]).lowEmergencyFund).toBe(true);
  });
  it("age rule sums to 100", () => {
    for (const age of [20, 35, 50, 70]) expect(ageRule(age).reduce((a, b) => a + b, 0)).toBe(100);
    expect(ageRule(35)[0]).toBe(75);
  });
});
