export function money(v: number, currency = "TWD"): string {
  const a = Math.abs(v);
  const s = v < 0 ? "−" : "";
  if (currency !== "TWD") return s + a.toLocaleString("zh-TW", { maximumFractionDigits: 2 }) + " " + currency;
  if (a >= 1e8) return s + (a / 1e8).toFixed(2) + " 億";
  if (a >= 1e4) return s + (a / 1e4).toFixed(a >= 1e6 ? 0 : 1) + " 萬";
  return s + Math.round(a).toLocaleString("zh-TW") + " 元";
}

export const signedPct = (v: number, d = 1) => (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(d) + "%";
export const pct = (v: number, d = 1) => (v * 100).toFixed(d) + "%";
export const price = (v: number) =>
  v.toLocaleString("zh-TW", { minimumFractionDigits: v < 1000 ? 2 : 0, maximumFractionDigits: 2 });
