export function movingAverage(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  values.forEach((v, i) => {
    sum += v;
    if (i >= n) sum -= values[i - n];
    out.push(i >= n - 1 ? sum / n : null);
  });
  return out;
}

export interface TrendMetrics {
  days: number;
  totalReturn: number;
  /** null when the series is shorter than half a year — annualising would mislead */
  cagr: number | null;
  volatility: number;
  maxDrawdown: number;
  currentDrawdown: number;
  drawdown: number[];
  ma20: (number | null)[];
  ma60: (number | null)[];
  signal: "up" | "down" | "range" | "short";
}

const TRADING_DAYS = 252;

export function analyze(closes: number[]): TrendMetrics {
  const n = closes.length;
  if (n < 2) throw new Error("至少需要 2 筆價格");
  const logRets: number[] = [];
  for (let i = 1; i < n; i++) logRets.push(Math.log(closes[i] / closes[i - 1]));
  const mean = logRets.reduce((a, b) => a + b, 0) / logRets.length;
  const variance = logRets.length > 1 ? logRets.reduce((a, b) => a + (b - mean) ** 2, 0) / (logRets.length - 1) : 0;
  const years = (n - 1) / TRADING_DAYS;
  let peak = closes[0];
  let maxDrawdown = 0;
  const drawdown = closes.map((v) => {
    peak = Math.max(peak, v);
    const d = v / peak - 1;
    maxDrawdown = Math.min(maxDrawdown, d);
    return d;
  });
  const ma20 = movingAverage(closes, 20);
  const ma60 = movingAverage(closes, 60);
  const last = closes[n - 1];
  const a = ma20[n - 1];
  const b = ma60[n - 1];
  const signal = a == null || b == null ? "short" : last > a && a > b ? "up" : last < a && a < b ? "down" : "range";
  return {
    days: n,
    totalReturn: last / closes[0] - 1,
    cagr: years < 0.5 ? null : Math.pow(last / closes[0], 1 / years) - 1,
    volatility: Math.sqrt(variance * TRADING_DAYS),
    maxDrawdown,
    currentDrawdown: drawdown[n - 1],
    drawdown,
    ma20,
    ma60,
    signal,
  };
}
