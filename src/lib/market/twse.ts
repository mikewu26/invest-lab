import "server-only";
import { MarketError, type PriceSeries, type Quote } from "./types";
import { parseNumber, parseStockDay, rocCompactToIso, type StockDayResponse } from "./twse-parse";

/**
 * 台灣證券交易所（TWSE）官方資料。
 * - 個股月資料：/rwd/zh/afterTrading/STOCK_DAY（民國日期，一次一個月）
 * - 全市場當日收盤：openapi.twse.com.tw STOCK_DAY_ALL（查名稱與最新價）
 * 只涵蓋上市股票與 ETF；上櫃股票由 Yahoo 補上。
 */

const UA = { "User-Agent": "Mozilla/5.0 (invest-lab; +https://github.com)" };

interface StockDayAllRow {
  Date: string;
  Code: string;
  Name: string;
  ClosingPrice: string;
}

function monthKeys(months: number, now = new Date()): { key: string; current: boolean }[] {
  const out: { key: string; current: boolean }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}01`,
      current: i === 0,
    });
  }
  return out;
}

async function fetchMonth(code: string, yyyymmdd: string, current: boolean) {
  const url = `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=${yyyymmdd}&stockNo=${encodeURIComponent(code)}&response=json`;
  const res = await fetch(url, {
    headers: UA,
    // 過去月份不會再變，快取一個月；當月每 30 分鐘更新
    next: { revalidate: current ? 1800 : 60 * 60 * 24 * 30, tags: ["twse"] },
  });
  if (!res.ok) throw new MarketError(`TWSE HTTP ${res.status}`, "upstream");
  return parseStockDay((await res.json()) as StockDayResponse);
}

/** 證交所有頻率限制，同時最多 3 個請求。 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export async function getTwseHistory(code: string, months: number): Promise<PriceSeries | null> {
  const results = await mapLimit(monthKeys(months), 3, (m) => fetchMonth(code, m.key, m.current));
  const points = results.flatMap((r) => r.points);
  if (points.length === 0) return null;
  const name = results.map((r) => r.name).find(Boolean) ?? (await getTwseQuote(code))?.name ?? code;
  return { symbol: code, name, currency: "TWD", source: "twse", points };
}

async function getStockDayAll(): Promise<StockDayAllRow[]> {
  const res = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", {
    headers: UA,
    next: { revalidate: 900, tags: ["twse"] },
  });
  if (!res.ok) throw new MarketError(`TWSE OpenAPI HTTP ${res.status}`, "upstream");
  return (await res.json()) as StockDayAllRow[];
}

export async function getTwseQuote(code: string): Promise<Quote | null> {
  const rows = await getStockDayAll();
  const row = rows.find((r) => r.Code === code);
  if (!row) return null;
  const price = parseNumber(row.ClosingPrice);
  const asOf = rocCompactToIso(row.Date);
  if (!price || !asOf) return null;
  return { symbol: code, name: row.Name, price, currency: "TWD", asOf, source: "twse" };
}

export async function searchTwse(q: string, limit = 12): Promise<{ symbol: string; name: string }[]> {
  const query = q.trim().toUpperCase();
  if (!query) return [];
  const rows = await getStockDayAll();
  const starts = rows.filter((r) => r.Code.startsWith(query) || r.Name.startsWith(q.trim()));
  const contains = rows.filter((r) => !starts.includes(r) && r.Name.includes(q.trim()));
  return [...starts, ...contains].slice(0, limit).map((r) => ({ symbol: r.Code, name: r.Name }));
}
