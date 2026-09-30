import type { PricePoint } from "./types";

/** 證交所回應的純解析函式（可單元測試，不發網路請求）。 */

export interface StockDayResponse {
  stat: string;
  title?: string;
  fields?: string[];
  data?: string[][];
}

/** "115/09/01" → "2026-09-01" */
export function rocToIso(roc: string): string | null {
  const m = roc.trim().match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]) + 1911;
  return `${y}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** "1150924" → "2026-09-24" */
export function rocCompactToIso(s: string): string | null {
  const m = s.trim().match(/^(\d{3})(\d{2})(\d{2})$/);
  if (!m) return null;
  return `${Number(m[1]) + 1911}-${m[2]}-${m[3]}`;
}

export function parseNumber(s: string): number | null {
  const n = Number(s.replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse one STOCK_DAY month response. Returns [] when the month has no data. */
export function parseStockDay(json: StockDayResponse): { name: string | null; points: PricePoint[] } {
  if (json.stat !== "OK" || !json.data || !json.fields) return { name: null, points: [] };
  const di = json.fields.indexOf("日期");
  const ci = json.fields.indexOf("收盤價");
  if (di < 0 || ci < 0) return { name: null, points: [] };
  const points: PricePoint[] = [];
  for (const row of json.data) {
    const date = rocToIso(row[di] ?? "");
    const close = parseNumber(row[ci] ?? "");
    if (date && close) points.push({ date, close });
  }
  // title: "115年09月 0050 元大台灣50           各日成交資訊"
  const name = json.title?.match(/\d{2,3}年\d{2}月\s+\S+\s+(.+?)\s+各日成交資訊/)?.[1]?.trim() ?? null;
  return { name, points };
}
