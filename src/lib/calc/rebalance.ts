import type { Weights } from "./simulate";

export interface RebalanceRow {
  current: number;
  currentPct: number;
  targetPct: number;
  /** positive = buy, negative = sell */
  action: number;
  afterPct: number;
}

export interface RebalanceResult {
  rows: [RebalanceRow, RebalanceRow, RebalanceRow];
  total: number;
  /** largest remaining deviation from target after the action, 0–1 */
  maxDeviation: number;
}

/**
 * @param current market value per class (stock, bond, cash), same currency
 * @param target  percentages summing to 100
 * @param newMoney cash being added now
 * @param noSell  only direct new money into underweight classes
 */
export function rebalance(current: Weights, target: Weights, newMoney: number, noSell: boolean): RebalanceResult {
  const w = target.map((x) => x / 100);
  const before = current.reduce((a, b) => a + b, 0);
  const total = before + newMoney;
  const goal = w.map((x) => x * total);
  let action: number[];
  if (noSell) {
    const deficit = goal.map((g, i) => Math.max(0, g - current[i]));
    const sum = deficit.reduce((a, b) => a + b, 0);
    action = sum > 0 ? deficit.map((d) => (newMoney * d) / sum) : w.map((x) => x * newMoney);
  } else {
    action = goal.map((g, i) => g - current[i]);
  }
  const after = current.map((c, i) => c + action[i]);
  const rows = current.map((c, i) => ({
    current: c,
    currentPct: before ? c / before : 0,
    targetPct: w[i],
    action: action[i],
    afterPct: total ? after[i] / total : 0,
  })) as RebalanceResult["rows"];
  const maxDeviation = Math.max(...rows.map((r) => Math.abs(r.afterPct - r.targetPct)));
  return { rows, total, maxDeviation };
}
