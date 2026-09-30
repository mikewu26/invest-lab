import "server-only";
import { MarketError, type PricePoint, type PriceSeries, type Quote } from "./types";

/**
 * Yahoo Finance chart API（非官方、無需金鑰）。
 * 用於美股、海外 ETF、指數、匯率，以及證交所查不到的上櫃股票（.TWO）。
 * 非官方介面可能變動或限流，所以只當備援，且集中在這個檔案，方便日後替換成付費資料源。
 */

interface ChartResponse {
  chart: {
    result?: {
      meta: { symbol: string; currency?: string; longName?: string; shortName?: string };
      timestamp?: number[];
      indicators: { quote: { close?: (number | null)[] }[] };
    }[];
    error?: { code: string; description: string } | null;
  };
}

const RANGE: Record<number, string> = { 6: "6mo", 12: "1y", 24: "2y" };

function toIsoDate(ts: number): string {
  // 交易所時區差異不影響「哪一天」的判斷到可接受程度；以 UTC+8 表示方便台灣使用者閱讀
  return new Date((ts + 8 * 3600) * 1000).toISOString().slice(0, 10);
}

async function fetchChart(symbol: string, range: string, revalidate: number) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate, tags: ["yahoo"] },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new MarketError(`Yahoo HTTP ${res.status}`, "upstream");
  const json = (await res.json()) as ChartResponse;
  const r = json.chart.result?.[0];
  if (!r || !r.timestamp) return null;
  const closes = r.indicators.quote[0]?.close ?? [];
  const points: PricePoint[] = [];
  r.timestamp.forEach((ts, i) => {
    const c = closes[i];
    if (c != null && Number.isFinite(c) && c > 0) points.push({ date: toIsoDate(ts), close: c });
  });
  if (!points.length) return null;
  return {
    symbol: r.meta.symbol,
    name: r.meta.longName || r.meta.shortName || r.meta.symbol,
    currency: r.meta.currency || "USD",
    points,
  };
}

export async function getYahooHistory(symbol: string, months: number): Promise<PriceSeries | null> {
  const r = await fetchChart(symbol, RANGE[months] ?? "1y", 1800);
  return r && { ...r, source: "yahoo" };
}

export async function getYahooQuote(symbol: string): Promise<Quote | null> {
  const r = await fetchChart(symbol, "5d", 900);
  if (!r) return null;
  const last = r.points[r.points.length - 1];
  return { symbol: r.symbol, name: r.name, price: last.close, currency: r.currency, asOf: last.date, source: "yahoo" };
}

/** 1 單位外幣 = ? 新台幣 */
export async function getFxToTwd(currency: string): Promise<number | null> {
  if (currency === "TWD") return 1;
  const q = await getYahooQuote(`${currency}TWD=X`);
  return q?.price ?? null;
}
