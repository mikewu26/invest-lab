"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SymbolSearch } from "@/components/SymbolSearch";
import { Stats } from "@/components/Stats";
import { AllocBar } from "@/components/WeightsEditor";
import { rebalance } from "@/lib/calc/rebalance";
import type { Weights } from "@/lib/calc/simulate";
import { money, pct, price } from "@/lib/format";
import type { Quote } from "@/lib/market/types";
import type { AssetClass, Holding } from "@/lib/storage/types";
import { exportJson, importJson, useUserData } from "@/lib/storage/useUserData";

type QuoteWithFx = Quote & { fxToTwd: number | null };
type QuoteState = Record<string, { ok: true; quote: QuoteWithFx } | { ok: false; error: string }>;

const CLASS_LABEL: Record<AssetClass, string> = { stock: "股票", bond: "債券", cash: "現金" };
const CLASS_ORDER: AssetClass[] = ["stock", "bond", "cash"];

function guessClass(symbol: string, name: string): AssetClass {
  if (/\d{4,5}B$/.test(symbol) || /債|bond|treasury/i.test(name) || ["BND", "BNDW", "AGG", "TLT", "IEF", "SHY"].includes(symbol)) return "bond";
  return "stock";
}

const uid = () => Math.random().toString(36).slice(2, 10);

const EXAMPLE: Holding[] = [
  { id: uid(), symbol: "0050", name: "元大台灣50", assetClass: "stock", quantity: 1000 },
  { id: uid(), symbol: "VT", name: "Vanguard Total World Stock ETF", assetClass: "stock", quantity: 20 },
  { id: uid(), symbol: "00679B", name: "元大美債20年", assetClass: "bond", quantity: 1500 },
  { id: uid(), symbol: "", name: "活存（投資用）", assetClass: "cash", quantity: 50000 },
];

export function PortfolioView() {
  const [user, update] = useUserData();
  const holdings = user.holdings;
  const [fetched, setFetched] = useState<{ key: string; quotes: QuoteState }>({ key: "", quotes: {} });
  const [pending, setPending] = useState<{ symbol: string; name: string; assetClass: AssetClass; quantity: string } | null>(null);
  const [newMoney, setNewMoney] = useState(20000);
  const [noSell, setNoSell] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const symbols = useMemo(() => [...new Set(holdings.map((h) => h.symbol).filter(Boolean))].sort(), [holdings]);
  const symbolsKey = symbols.join(",");
  const quotes = fetched.quotes;
  const loading = symbolsKey !== "" && fetched.key !== symbolsKey;

  useEffect(() => {
    if (!symbolsKey) return;
    const ctrl = new AbortController();
    fetch(`/api/quote?symbols=${encodeURIComponent(symbolsKey)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: { results: ({ symbol: string } & ({ ok: true; quote: QuoteWithFx } | { ok: false; error: string }))[] }) => {
        const next: QuoteState = {};
        j.results.forEach((r) => (next[r.symbol] = r.ok ? { ok: true, quote: r.quote } : { ok: false, error: r.error }));
        setFetched({ key: symbolsKey, quotes: next });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [symbolsKey]);

  const valued = holdings.map((h) => {
    if (h.assetClass === "cash" && !h.symbol) return { h, value: h.quantity, q: null as QuoteWithFx | null, err: null as string | null };
    const q = quotes[h.symbol];
    if (!q) return { h, value: null, q: null, err: null };
    if (!q.ok) return { h, value: null, q: null, err: q.error };
    const fx = q.quote.fxToTwd;
    return { h, value: fx == null ? null : h.quantity * q.quote.price * fx, q: q.quote, err: fx == null ? "無法取得匯率" : null };
  });
  const byClass = CLASS_ORDER.map((c) => valued.filter((v) => v.h.assetClass === c).reduce((s, v) => s + (v.value ?? 0), 0)) as Weights;
  const total = byClass.reduce((a, b) => a + b, 0);
  const missing = valued.some((v) => v.value == null);
  const currentPct = byClass.map((v) => (total ? Math.round((v / total) * 100) : 0)) as Weights;
  const rb = total > 0 ? rebalance(byClass, user.plan.target, Math.max(0, newMoney), noSell) : null;
  const drift = rb ? Math.max(...rb.rows.map((r) => Math.abs(r.currentPct - r.targetPct))) : 0;

  const setHoldings = (fn: (h: Holding[]) => Holding[]) => update((d) => ({ ...d, holdings: fn(d.holdings) }));
  const patch = (id: string, p: Partial<Holding>) => setHoldings((hs) => hs.map((h) => (h.id === id ? { ...h, ...p } : h)));

  const addPending = () => {
    if (!pending) return;
    const qty = Number(pending.quantity);
    if (!(qty > 0)) return;
    setHoldings((hs) => [...hs, { id: uid(), symbol: pending.symbol, name: pending.name, assetClass: pending.assetClass, quantity: qty }]);
    setPending(null);
  };

  const doExport = () => {
    const blob = new Blob([exportJson(user)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `invest-lab-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (f: File) => {
    try {
      const data = importJson(await f.text());
      update(() => data);
      setMsg(`已匯入 ${data.holdings.length} 筆持股與配置設定`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "匯入失敗");
    }
  };

  return (
    <div className="stack">
      <div className="panel stack">
        <SymbolSearch
          buttonLabel="新增"
          onPick={(h) => setPending({ symbol: h.symbol, name: h.name || h.symbol, assetClass: guessClass(h.symbol, h.name), quantity: "" })}
        />
        {pending && (
          <form className="row" onSubmit={(e) => { e.preventDefault(); addPending(); }}>
            <span style={{ fontWeight: 700 }}>{pending.symbol} <span className="muted" style={{ fontWeight: 400 }}>{pending.name}</span></span>
            <label className="f" htmlFor="pend-q" style={{ width: 130 }}>持有數量（股／單位）
              <input id="pend-q" type="number" min={0} step="any" autoFocus value={pending.quantity} onChange={(e) => setPending({ ...pending, quantity: e.target.value })} />
            </label>
            <label className="f" htmlFor="pend-c" style={{ width: 100 }}>類別
              <select id="pend-c" value={pending.assetClass} onChange={(e) => setPending({ ...pending, assetClass: e.target.value as AssetClass })}>
                {CLASS_ORDER.map((c) => <option key={c} value={c}>{CLASS_LABEL[c]}</option>)}
              </select>
            </label>
            <button className="btn" type="submit" style={{ alignSelf: "flex-end" }} disabled={!(Number(pending.quantity) > 0)}>加入持股</button>
            <button className="link-btn" type="button" style={{ alignSelf: "flex-end", marginBottom: 8 }} onClick={() => setPending(null)}>取消</button>
          </form>
        )}
        <div className="row">
          <button className="btn ghost small" type="button"
            onClick={() => setHoldings((hs) => [...hs, { id: uid(), symbol: "", name: "現金", assetClass: "cash", quantity: 0 }])}>
            ＋ 新增現金部位
          </button>
          <span className="hint">台股用數字代號，美股與海外 ETF 用英文代號；海外標的會依即時匯率換算成新台幣。</span>
        </div>
      </div>

      {holdings.length === 0 ? (
        <div className="empty">
          <p style={{ margin: "0 0 10px" }}>還沒有持股。用上面的搜尋新增第一筆，或先放入範例看看效果。</p>
          <button className="btn ghost" type="button" onClick={() => setHoldings(() => EXAMPLE.map((h) => ({ ...h, id: uid() })))}>放入範例持股</button>
        </div>
      ) : (
        <>
          <Stats
            items={[
              { label: "總市值", value: money(total), note: missing ? "部分標的價格尚未取得" : loading ? "更新報價中⋯" : "以最新收盤價計算" },
              ...CLASS_ORDER.map((c, i) => ({
                label: CLASS_LABEL[c],
                value: total ? pct(byClass[i] / total, 0) : "—",
                note: `目標 ${user.plan.target[i]}% · ${money(byClass[i])}`,
              })),
            ]}
          />
          <div className="panel">
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr><th>標的</th><th>類別</th><th>數量</th><th>價格</th><th>市值（新台幣）</th><th>占比</th><th aria-label="操作" /></tr>
                </thead>
                <tbody>
                  {valued.map(({ h, value, q, err }) => (
                    <tr key={h.id}>
                      <td className="t">
                        {h.symbol ? <b className="num">{h.symbol}</b> : <input type="text" aria-label="現金名稱" value={h.name} onChange={(e) => patch(h.id, { name: e.target.value })} style={{ maxWidth: 140 }} />}
                        {h.symbol && <small>{q?.name ?? h.name}</small>}
                      </td>
                      <td className="t">
                        <select aria-label="類別" value={h.assetClass} onChange={(e) => patch(h.id, { assetClass: e.target.value as AssetClass })} style={{ width: 76 }}>
                          {CLASS_ORDER.map((c) => <option key={c} value={c}>{CLASS_LABEL[c]}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" min={0} step="any" aria-label="數量" value={h.quantity} onChange={(e) => patch(h.id, { quantity: Math.max(0, +e.target.value || 0) })} style={{ width: 110, textAlign: "right" }} />
                      </td>
                      <td>
                        {!h.symbol ? "—" : q ? <>{price(q.price)}<small>{q.currency} · {q.asOf.slice(5)}</small></> : err ? <span className="neg" title={err}>查無報價</span> : "⋯"}
                      </td>
                      <td>{value == null ? "—" : money(value)}</td>
                      <td>{value == null || !total ? "—" : pct(value / total, 1)}</td>
                      <td><button className="link-btn" type="button" onClick={() => setHoldings((hs) => hs.filter((x) => x.id !== h.id))}>刪除</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <section className="section">
            <h2>目前 vs 目標</h2>
            <div className="panel stack">
              <div><span className="hint">目前</span><AllocBar weights={currentPct} /></div>
              <div><span className="hint">目標（在<Link href="/plan">配置</Link>頁調整）</span><AllocBar weights={user.plan.target} /></div>
              <p className="hint">{drift > 0.05 ? `最大偏離 ${pct(drift, 0)}，超過 5%，建議這次投入時調整。` : `最大偏離 ${pct(drift, 0)}，在 5% 以內，照原計畫投入即可。`}</p>
            </div>
          </section>

          {rb && (
            <section className="section">
              <h2>這次的錢該怎麼放</h2>
              <div className="split">
                <div className="panel stack">
                  <label className="f" htmlFor="new-money">這次新增資金（新台幣）
                    <input id="new-money" type="number" min={0} step={1000} value={newMoney} onChange={(e) => setNewMoney(Math.max(0, +e.target.value || 0))} />
                  </label>
                  <label className="row" style={{ fontSize: ".88rem" }}>
                    <input type="checkbox" checked={noSell} onChange={(e) => setNoSell(e.target.checked)} />只用新增資金調整，不賣出
                  </label>
                  <p className="hint">不賣出可以避免交易成本和稅，但偏離太大時可能調不回來。</p>
                </div>
                <div className="panel">
                  <div className="tbl-wrap">
                    <table>
                      <thead><tr><th>類別</th><th>目前</th><th>目標</th><th>動作</th><th>調整後</th></tr></thead>
                      <tbody>
                        {rb.rows.map((r, i) => {
                          const cls = CLASS_ORDER[i];
                          const inClass = valued.filter((v) => v.h.assetClass === cls && v.q);
                          const one = inClass.length === 1 ? inClass[0] : null;
                          const units = one && one.q && one.q.fxToTwd ? Math.floor(Math.abs(r.action) / (one.q.price * one.q.fxToTwd)) : null;
                          return (
                            <tr key={cls}>
                              <td className="t"><span className="dot" style={{ background: `var(--${cls})` }} />{CLASS_LABEL[cls]}</td>
                              <td>{pct(r.currentPct, 0)}</td>
                              <td>{pct(r.targetPct, 0)}</td>
                              <td className={r.action > 0.5 ? "pos" : r.action < -0.5 ? "neg" : ""}>
                                {Math.abs(r.action) < 1 ? "不動" : `${r.action > 0 ? "買進" : "賣出"} ${money(Math.abs(r.action))}`}
                                {units != null && units > 0 && one && <small>約 {units.toLocaleString()} 股 {one.h.symbol}</small>}
                              </td>
                              <td>{pct(r.afterPct, 0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="hint" style={{ marginTop: 10 }}>
                    {noSell && rb.maxDeviation > 0.05
                      ? `只用新資金無法完全調回目標，最大仍偏離 ${pct(rb.maxDeviation, 0)}。可考慮取消「不賣出」。`
                      : `調整後總資產 ${money(rb.total)}，各類資產回到目標比例附近。股數以最新收盤價估算，實際以下單價格為準。`}
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <div className="row" style={{ marginTop: 24 }}>
        <button className="btn ghost small" type="button" onClick={doExport}>匯出備份（JSON）</button>
        <button className="btn ghost small" type="button" onClick={() => fileRef.current?.click()}>匯入備份</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ""; }} />
        {msg && <span className="hint">{msg}</span>}
      </div>
    </div>
  );
}
