"use client";
import { useEffect, useMemo, useState } from "react";
import type { PriceInfo } from "@/lib/calc/portfolio";
import type { Holding } from "@/lib/storage/types";

type Entry = { ok: true; quote: PriceInfo & { name: string; currency: string; asOf: string } } | { ok: false; error: string };

/** 取得持股的最新報價（含匯率）。代號清單不變時不會重抓。 */
export function useQuotes(holdings: Holding[]) {
  const symbols = useMemo(() => [...new Set(holdings.map((h) => h.symbol).filter(Boolean))].sort(), [holdings]);
  const key = symbols.join(",");
  const [fetched, setFetched] = useState<{ key: string; entries: Record<string, Entry> }>({ key: "", entries: {} });

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch(`/api/quote?symbols=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: { results: ({ symbol: string } & Entry)[] }) => {
        const next: Record<string, Entry> = {};
        j.results.forEach((r) => (next[r.symbol] = r.ok ? { ok: true, quote: r.quote } : { ok: false, error: r.error }));
        setFetched({ key, entries: next });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [key]);

  const entries = fetched.entries;
  const prices = useMemo(() => {
    const out: Record<string, PriceInfo> = {};
    for (const [s, e] of Object.entries(entries)) if (e.ok) out[s] = e.quote;
    return out;
  }, [entries]);
  const errors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [s, e] of Object.entries(entries)) if (!e.ok) out[s] = e.error;
    return out;
  }, [entries]);

  return { prices, errors, loading: key !== "" && fetched.key !== key };
}
