import "server-only";
import { getTwseHistory, getTwseQuote, searchTwse } from "./twse";
import { getFxToTwd, getYahooHistory, getYahooQuote } from "./yahoo";
import { isTaiwanCode, MarketError, normalizeSymbol, RANGE_MONTHS, type PriceSeries, type Quote, type Range } from "./types";

/**
 * 行情資料的唯一入口。頁面與 API 只呼叫這裡，不直接碰資料源。
 * 路由規則：台股代號 → 證交所；查不到 → Yahoo .TWO（上櫃）→ Yahoo .TW；其他代號 → Yahoo。
 */

export async function getHistory(raw: string, range: Range): Promise<PriceSeries> {
  const symbol = normalizeSymbol(raw);
  if (!symbol) throw new MarketError("請輸入代號", "bad_input");
  const months = RANGE_MONTHS[range];

  if (isTaiwanCode(symbol)) {
    const twse = await getTwseHistory(symbol, months).catch(() => null);
    if (twse) return twse;
    for (const suffix of [".TWO", ".TW"]) {
      const y = await getYahooHistory(symbol + suffix, months).catch(() => null);
      if (y) return { ...y, symbol };
    }
    throw new MarketError(`找不到 ${symbol} 的資料`, "not_found");
  }

  const y = await getYahooHistory(symbol, months);
  if (!y) throw new MarketError(`找不到 ${symbol} 的資料`, "not_found");
  return y;
}

export async function getQuote(raw: string): Promise<Quote & { fxToTwd: number | null }> {
  const symbol = normalizeSymbol(raw);
  let q: Quote | null = null;
  if (isTaiwanCode(symbol)) {
    q = await getTwseQuote(symbol).catch(() => null);
    for (const suffix of [".TWO", ".TW"]) {
      if (q) break;
      const y = await getYahooQuote(symbol + suffix).catch(() => null);
      if (y) q = { ...y, symbol };
    }
  } else {
    q = await getYahooQuote(symbol);
  }
  if (!q) throw new MarketError(`找不到 ${symbol} 的報價`, "not_found");
  const fxToTwd = await getFxToTwd(q.currency).catch(() => null);
  return { ...q, fxToTwd };
}

export async function search(q: string) {
  return searchTwse(q);
}

export { MarketError };
