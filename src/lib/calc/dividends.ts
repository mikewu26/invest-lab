/** 台灣股利相關稅費（個人投資者）。規則與門檻可能隨法規調整，數值集中在這裡。 */
export const TAX_RULES = {
  /** 二代健保補充保費費率 */
  nhiRate: 0.0211,
  /** 單次給付達此金額才扣補充保費 */
  nhiThreshold: 20000,
  /** 合併計稅：股利可抵減稅額比例 */
  creditRate: 0.085,
  /** 合併計稅：每戶可抵減上限 */
  creditCap: 80000,
  /** 分開計稅單一稅率 */
  separateRate: 0.28,
  /** 美國對非居民的股利預扣稅（台美無租稅協定） */
  usWithholding: 0.3,
  asOf: "2026",
};

export interface DividendLine {
  symbol: string;
  annual: number;
  perPayment: number;
  /** 補充保費（每年合計） */
  nhi: number;
  domestic: boolean;
}

export function dividendLines(
  items: { symbol: string; annual: number; paymentsPerYear: number; domestic: boolean }[],
): DividendLine[] {
  return items.map((i) => {
    const perPayment = i.paymentsPerYear > 0 ? i.annual / i.paymentsPerYear : i.annual;
    const nhi = i.domestic && perPayment >= TAX_RULES.nhiThreshold ? perPayment * TAX_RULES.nhiRate * i.paymentsPerYear : 0;
    return { symbol: i.symbol, annual: i.annual, perPayment, nhi, domestic: i.domestic };
  });
}

/**
 * 國內股利的兩種課稅方式，回傳各自「因股利增加的稅額」（可能為負＝退稅）。
 * 簡化：假設股利不會讓你跳到下一個稅率級距；全戶只有這些股利。
 */
export function compareDividendTax(domesticDividend: number, marginalRate: number) {
  const combined = domesticDividend * marginalRate - Math.min(domesticDividend * TAX_RULES.creditRate, TAX_RULES.creditCap);
  const separate = domesticDividend * TAX_RULES.separateRate;
  return { combined, separate, better: combined <= separate ? ("combined" as const) : ("separate" as const) };
}
