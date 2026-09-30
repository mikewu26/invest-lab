import { gaussian, mulberry32 } from "./random";

export type Weights = [stock: number, bond: number, cash: number];

export interface Assumptions {
  /** annual expected return, e.g. 0.07 */
  mu: Weights;
  /** annual volatility, e.g. 0.16 */
  sigma: Weights;
  /** stock–bond correlation */
  rho: number;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  mu: [0.07, 0.03, 0.015],
  sigma: [0.16, 0.06, 0.005],
  rho: 0.2,
};

export interface SimInput {
  initial: number;
  monthly: number;
  years: number;
  /** percentages summing to 100 */
  weights: Weights;
  assumptions?: Assumptions;
  runs?: number;
  seed?: number;
}

export interface SimResult {
  principal: number[];
  p10: number[];
  p50: number[];
  p90: number[];
  /** share of runs ending below principal */
  belowPrincipal: number;
  /** 10th-percentile of each run's worst calendar-year return */
  badYear: number;
}

function quantile(sorted: Float64Array | number[], p: number) {
  return sorted[Math.floor(p * (sorted.length - 1))];
}

/** Monthly Monte Carlo with monthly rebalancing to target weights. */
export function simulate(input: SimInput): SimResult {
  const { initial, monthly, years } = input;
  const runs = input.runs ?? 1000;
  const a = input.assumptions ?? DEFAULT_ASSUMPTIONS;
  const w = input.weights.map((x) => x / 100);
  const mm = a.mu.map((m) => m / 12);
  const ms = a.sigma.map((s) => s / Math.sqrt(12));
  const k = Math.sqrt(1 - a.rho * a.rho);
  const gs = gaussian(mulberry32(input.seed ?? 42));

  const byYear = Array.from({ length: years + 1 }, () => new Float64Array(runs));
  const worst = new Float64Array(runs);

  for (let j = 0; j < runs; j++) {
    let v = initial;
    let yr = 1;
    let worstYr = Infinity;
    byYear[0][j] = v;
    for (let m = 1; m <= years * 12; m++) {
      v += monthly;
      const z1 = gs();
      const z2 = a.rho * z1 + k * gs();
      const z3 = gs();
      const r = w[0] * (mm[0] + ms[0] * z1) + w[1] * (mm[1] + ms[1] * z2) + w[2] * (mm[2] + ms[2] * z3);
      yr *= 1 + r;
      v = Math.max(0, v * (1 + r));
      if (m % 12 === 0) {
        byYear[m / 12][j] = v;
        worstYr = Math.min(worstYr, yr - 1);
        yr = 1;
      }
    }
    worst[j] = worstYr === Infinity ? 0 : worstYr;
  }

  const principal: number[] = [];
  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];
  for (let y = 0; y <= years; y++) {
    const s = byYear[y].slice().sort();
    p10.push(quantile(s, 0.1));
    p50.push(quantile(s, 0.5));
    p90.push(quantile(s, 0.9));
    principal.push(initial + monthly * 12 * y);
  }
  const P = principal[years];
  let below = 0;
  byYear[years].forEach((v) => {
    if (v < P) below++;
  });
  return { principal, p10, p50, p90, belowPrincipal: below / runs, badYear: quantile(worst.slice().sort(), 0.1) };
}
