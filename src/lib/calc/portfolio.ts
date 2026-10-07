import { ETF_LOOK_THROUGH } from "@/content/etf-holdings";
import type { AssetClass, Holding } from "@/lib/storage/types";
import type { Weights } from "./simulate";

export interface PriceInfo {
  price: number;
  /** 1 unit of quote currency in TWD; null if unknown */
  fxToTwd: number | null;
  name?: string;
  currency?: string;
  asOf?: string;
}

export interface ValuedHolding {
  holding: Holding;
  /** TWD market value; null when price is missing */
  value: number | null;
  price: PriceInfo | null;
  /** unrealised gain in TWD; null if cost or value is missing */
  gain: number | null;
}

export const CLASS_ORDER: AssetClass[] = ["stock", "bond", "cash"];
export const CLASS_LABEL: Record<AssetClass, string> = { stock: "股票", bond: "債券", cash: "現金" };

const isPlainCash = (h: Holding) => h.assetClass === "cash" && !h.symbol;

export function valueHoldings(holdings: Holding[], prices: Record<string, PriceInfo | undefined>): ValuedHolding[] {
  return holdings.map((h) => {
    if (isPlainCash(h)) return { holding: h, value: h.quantity, price: null, gain: null };
    const p = prices[h.symbol] ?? null;
    const value = p && p.fxToTwd != null ? h.quantity * p.price * p.fxToTwd : null;
    const gain = value != null && h.cost ? value - h.cost : null;
    return { holding: h, value, price: p, gain };
  });
}

export function classTotals(rows: ValuedHolding[]): Weights {
  return CLASS_ORDER.map((c) => rows.filter((r) => r.holding.assetClass === c).reduce((s, r) => s + (r.value ?? 0), 0)) as Weights;
}

export interface Exposure {
  company: string;
  direct: number;
  viaEtf: number;
  total: number;
  /** share of the total portfolio value, 0–1 */
  share: number;
}

/**
 * 穿透式曝險：直接持有 + 透過 ETF 間接持有的同一家公司。
 * 只有個股（4 碼、非 0 開頭）和有穿透資料的 ETF 會被計入。
 */
export function exposures(rows: ValuedHolding[]): Exposure[] {
  const total = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const map = new Map<string, { direct: number; viaEtf: number }>();
  const add = (k: string, field: "direct" | "viaEtf", v: number) => {
    const e = map.get(k) ?? { direct: 0, viaEtf: 0 };
    e[field] += v;
    map.set(k, e);
  };
  for (const r of rows) {
    const sym = r.holding.symbol;
    if (!sym || r.value == null) continue;
    const lt = ETF_LOOK_THROUGH[sym];
    if (lt) {
      for (const [co, w] of Object.entries(lt.weights)) add(co, "viaEtf", r.value * w);
    } else if (/^[1-9]\d{3}$/.test(sym) || (/^[A-Z.]{1,5}$/.test(sym) && r.holding.assetClass === "stock" && !isBroadFund(sym))) {
      add(sym, "direct", r.value);
    }
  }
  return [...map.entries()]
    .map(([company, e]) => ({ company, ...e, total: e.direct + e.viaEtf, share: total ? (e.direct + e.viaEtf) / total : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** 常見的美股廣泛型 ETF：不算單一公司 */
const BROAD = new Set(["VT", "VTI", "VOO", "SPY", "IVV", "VXUS", "VEA", "VWO", "QQQ", "BND", "BNDW", "AGG", "TLT", "IEF", "SHY", "VGIT", "VGSH", "BNDX"]);
function isBroadFund(sym: string) {
  return BROAD.has(sym);
}

/**
 * 若之後每月投入中有 `otherMonthly` 元買「不是這家公司」的標的、`sameMonthly` 元買這家公司，
 * 在價格不變的假設下，幾個月後這家公司的占比會降到 cap 以下。回傳 null 代表永遠到不了。
 */
export function monthsToCap(exposure: number, total: number, cap: number, sameMonthly: number, otherMonthly: number): number | null {
  if (total <= 0 || exposure / total <= cap) return 0;
  const monthly = sameMonthly + otherMonthly;
  // (E + s·m) / (T + (s+o)·m) <= cap  →  m >= (E − cap·T) / (cap·(s+o) − s)
  const denom = cap * monthly - sameMonthly;
  if (denom <= 0) return null;
  return Math.ceil((exposure - cap * total) / denom);
}
