"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { CheckList } from "@/components/CheckList";
import { NumberField } from "@/components/Field";
import { Stats } from "@/components/Stats";
import { SymbolSearch } from "@/components/SymbolSearch";
import { AllocBar } from "@/components/WeightsEditor";
import { COMPANY_NAMES, ETF_LOOK_THROUGH } from "@/content/etf-holdings";
import { compareDividendTax, dividendLines, TAX_RULES } from "@/lib/calc/dividends";
import { runChecks } from "@/lib/calc/policy";
import { CLASS_LABEL, CLASS_ORDER, classTotals, exposures, monthsToCap, valueHoldings, type ValuedHolding } from "@/lib/calc/portfolio";
import { rebalance } from "@/lib/calc/rebalance";
import type { Weights } from "@/lib/calc/simulate";
import { money, pct, price, signedPct } from "@/lib/format";
import { isTaiwanCode } from "@/lib/market/types";
import type { AssetClass, Holding, UserData } from "@/lib/storage/types";
import { exportJson, importJson, useUserData } from "@/lib/storage/useUserData";
import { useQuotes } from "@/lib/useQuotes";

function guessClass(symbol: string, name: string): AssetClass {
  if (/\d{4,5}B$/.test(symbol) || /債|bond|treasury/i.test(name) || ["BND", "BNDW", "BNDX", "AGG", "TLT", "IEF", "SHY", "VGIT", "VGSH"].includes(symbol)) return "bond";
  return "stock";
}

const uid = () => Math.random().toString(36).slice(2, 10);

const EXAMPLE: Omit<Holding, "id">[] = [
  { symbol: "2330", name: "台積電", assetClass: "stock", quantity: 100, cost: 150000 },
  { symbol: "0050", name: "元大台灣50", assetClass: "stock", quantity: 1000, cost: 45000 },
  { symbol: "00679B", name: "元大美債20年", assetClass: "bond", quantity: 1500, cost: 45000 },
];

export function PortfolioView() {
  const [d, update] = useUserData();
  const { prices, errors, loading } = useQuotes(d.holdings);
  const [pending, setPending] = useState<{ symbol: string; name: string; assetClass: AssetClass; quantity: number; cost: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = valueHoldings(d.holdings, prices);
  const totals = classTotals(rows);
  const total = totals.reduce((a, b) => a + b, 0);
  const missing = rows.some((r) => r.value == null);
  const costed = rows.filter((r) => r.gain != null);
  const gain = costed.reduce((s, r) => s + (r.gain ?? 0), 0);
  const costSum = costed.reduce((s, r) => s + (r.holding.cost ?? 0), 0);

  const setHoldings = (fn: (h: Holding[]) => Holding[]) => update((x) => ({ ...x, holdings: fn(x.holdings) }));
  const patch = (id: string, p: Partial<Holding>) => setHoldings((hs) => hs.map((h) => (h.id === id ? { ...h, ...p } : h)));

  const doExport = () => {
    const blob = new Blob([exportJson(d)], { type: "application/json" });
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
      setMsg(`已匯入 ${data.holdings.length} 筆持股與計畫設定`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "匯入失敗");
    }
  };

  const checks = runChecks(d, rows).filter((c) => c.id === "concentration" || c.id === "drift");

  return (
    <div className="stack">
      <div className="panel stack">
        <SymbolSearch buttonLabel="新增" onPick={(h) => setPending({ symbol: h.symbol, name: h.name || h.symbol, assetClass: guessClass(h.symbol, h.name), quantity: 0, cost: 0 })} />
        {pending && (
          <form className="stack" onSubmit={(e) => {
            e.preventDefault();
            if (!(pending.quantity > 0)) return;
            setHoldings((hs) => [...hs, { id: uid(), symbol: pending.symbol, name: pending.name, assetClass: pending.assetClass, quantity: pending.quantity, cost: pending.cost || undefined }]);
            setPending(null);
          }}>
            <b>{pending.symbol} <span className="muted" style={{ fontWeight: 400 }}>{pending.name}</span></b>
            <div className="grid3">
              <NumberField label="持有股數" value={pending.quantity} onChange={(v) => setPending({ ...pending, quantity: v })} step={1} />
              <NumberField label="總成本" suffix="新台幣，可留空" value={pending.cost} onChange={(v) => setPending({ ...pending, cost: v })} />
              <label className="f" htmlFor="pend-c">類別
                <select id="pend-c" value={pending.assetClass} onChange={(e) => setPending({ ...pending, assetClass: e.target.value as AssetClass })}>
                  {CLASS_ORDER.map((c) => <option key={c} value={c}>{CLASS_LABEL[c]}</option>)}
                </select>
              </label>
            </div>
            <div className="row">
              <button className="btn" type="submit" disabled={!(pending.quantity > 0)}>加入持股</button>
              <button className="link-btn" type="button" onClick={() => setPending(null)}>取消</button>
            </div>
          </form>
        )}
        <p className="hint">台股用數字代號，美股與海外 ETF 用英文代號；海外標的依即時匯率換算成新台幣。總成本可從券商 App 的「總付出成本」或「庫存成本」查到。</p>
      </div>

      {d.holdings.length === 0 ? (
        <div className="empty">
          <p style={{ margin: "0 0 10px" }}>還沒有持股。用上面的搜尋新增，或從備份檔匯入。也可以先放入範例看效果。</p>
          <button className="btn ghost" type="button" onClick={() => setHoldings(() => EXAMPLE.map((h) => ({ ...h, id: uid() })))}>放入範例持股</button>
        </div>
      ) : (
        <>
          <Stats
            items={[
              { label: "總市值", value: money(total), note: missing ? (loading ? "更新報價中⋯" : "部分標的查無價格") : "以最新收盤價計算" },
              { label: "未實現損益", value: costSum ? money(gain) : "—", tone: gain >= 0 ? "pos" : "neg", note: costSum ? `報酬率 ${signedPct(gain / costSum)}` : "填入成本後顯示" },
              ...CLASS_ORDER.slice(0, 2).map((c, i) => ({ label: CLASS_LABEL[c], value: total ? pct(totals[i] / total, 0) : "—", note: `目標 ${d.policy.target[i]}%` })),
            ]}
          />
          <HoldingsTable rows={rows} total={total} errors={errors} patch={patch} remove={(id) => setHoldings((hs) => hs.filter((h) => h.id !== id))} />

          {checks.length > 0 && <CheckList checks={checks} />}

          <Concentration d={d} rows={rows} total={total} />
          <Dividends d={d} rows={rows} patch={patch} />
          <Rebalance d={d} rows={rows} totals={totals} total={total} />
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

function HoldingsTable({ rows, total, errors, patch, remove }: {
  rows: ValuedHolding[]; total: number; errors: Record<string, string>;
  patch: (id: string, p: Partial<Holding>) => void; remove: (id: string) => void;
}) {
  return (
    <div className="panel">
      <div className="tbl-wrap">
        <table style={{ minWidth: 720 }}>
          <thead>
            <tr><th>標的</th><th>類別</th><th>股數</th><th>總成本</th><th>價格</th><th>市值</th><th>損益</th><th>占比</th><th aria-label="操作" /></tr>
          </thead>
          <tbody>
            {rows.map(({ holding: h, value, price: p, gain }) => (
              <tr key={h.id}>
                <td className="t">
                  {h.symbol ? <b className="num">{h.symbol}</b> : <input type="text" aria-label="現金名稱" value={h.name} onChange={(e) => patch(h.id, { name: e.target.value })} style={{ maxWidth: 140 }} />}
                  {h.symbol && <small>{p?.name ?? h.name}</small>}
                </td>
                <td className="t">
                  <select aria-label="類別" value={h.assetClass} onChange={(e) => patch(h.id, { assetClass: e.target.value as AssetClass })} style={{ width: 76 }}>
                    {CLASS_ORDER.map((c) => <option key={c} value={c}>{CLASS_LABEL[c]}</option>)}
                  </select>
                </td>
                <td><input type="number" min={0} step="any" aria-label="股數" value={h.quantity} onChange={(e) => patch(h.id, { quantity: Math.max(0, +e.target.value || 0) })} style={{ width: 96, textAlign: "right" }} /></td>
                <td><input type="number" min={0} step="any" aria-label="總成本" value={h.cost ?? ""} placeholder="—" onChange={(e) => patch(h.id, { cost: +e.target.value || undefined })} style={{ width: 110, textAlign: "right" }} /></td>
                <td>{!h.symbol ? "—" : p ? <>{price(p.price)}<small>{p.currency} · {p.asOf?.slice(5)}</small></> : errors[h.symbol] ? <span className="neg" title={errors[h.symbol]}>查無報價</span> : "⋯"}</td>
                <td>{value == null ? "—" : money(value)}</td>
                <td className={gain == null ? "" : gain >= 0 ? "pos" : "neg"}>{gain == null ? "—" : <>{money(gain)}<small>{signedPct(gain / (h.cost || 1))}</small></>}</td>
                <td>{value == null || !total ? "—" : pct(value / total, 1)}</td>
                <td><button className="link-btn" type="button" onClick={() => remove(h.id)}>刪除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Concentration({ d, rows, total }: { d: UserData; rows: ValuedHolding[]; total: number }) {
  const ex = exposures(rows).slice(0, 5);
  const top = ex[0];
  const [other, setOther] = useState<number | null>(null);
  if (!top || !total) return null;
  const cap = d.policy.singleStockCap / 100;
  const monthly = d.policy.monthlyContribution;
  const otherMonthly = other ?? 0;
  const months = monthsToCap(top.total, total, cap, monthly - otherMonthly, otherMonthly);
  const name = (sym: string) => COMPANY_NAMES[sym] ?? rows.find((r) => r.holding.symbol === sym)?.holding.name ?? sym;
  const etfs = rows.filter((r) => ETF_LOOK_THROUGH[r.holding.symbol]);

  return (
    <section className="section">
      <h2>你真正押在哪幾家公司</h2>
      <p className="lede">把 ETF 拆開，加上直接持有的個股，算出每家公司占整個投資組合的比例。為什麼這很重要，見<Link href="/learn/core-satellite">核心衛星</Link>。</p>
      <div className="split">
        <div className="panel">
          <div className="tbl-wrap">
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>公司</th><th>直接持有</th><th>透過 ETF</th><th>占比</th></tr></thead>
              <tbody>
                {ex.map((e) => (
                  <tr key={e.company}>
                    <td className="t">{name(e.company)}<small>{e.company}</small></td>
                    <td>{money(e.direct)}</td>
                    <td>{e.viaEtf ? money(e.viaEtf) : "—"}</td>
                    <td className={e.share > cap ? "neg" : ""}>{pct(e.share, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            {etfs.length
              ? `ETF 權重：${etfs.map((r) => `${r.holding.symbol}（${ETF_LOOK_THROUGH[r.holding.symbol].source}，${ETF_LOOK_THROUGH[r.holding.symbol].asOf}）`).join("；")}。`
              : "目前持有的 ETF 沒有內建穿透資料；高股息 ETF 成分股每季調整，必要時到投信官網查持股權重。"}
          </p>
        </div>
        <div className="panel stack">
          <h3>不賣出，只調整每月投入</h3>
          {top.share <= cap ? (
            <p style={{ margin: 0 }}>最大的 {name(top.company)} 占 {pct(top.share, 0)}，在你的上限 {d.policy.singleStockCap}% 以內。</p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: ".92rem" }}>
                {name(top.company)} 占 {pct(top.share, 0)}，上限 {d.policy.singleStockCap}%。每月投入 {money(monthly)} 中，改買其他標的的金額：
              </p>
              <label className="f" htmlFor="redirect"><span className="num">{money(otherMonthly)}</span>
                <input id="redirect" type="range" min={0} max={monthly} step={Math.max(500, Math.round(monthly / 30 / 500) * 500)} value={otherMonthly} onChange={(e) => setOther(+e.target.value)} />
              </label>
              <div className="verdict">
                <span className={`pill ${months == null ? "down" : "up"}`}>{months == null ? "到不了" : `約 ${months} 個月`}</span>
                <p>
                  {months == null
                    ? "這個分配下，比例不會降到上限內。"
                    : `約 ${(months / 12).toFixed(1)} 年後回到 ${d.policy.singleStockCap}% 以內（假設價格不變；${name(top.company)} 持續上漲會更久）。`}
                </p>
              </div>
              <p className="hint">也可以把預備金與購屋基金以外的閒置現金分批投入其他標的，速度會快很多。調整上限請到<Link href="/plan">計畫</Link>。</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Dividends({ d, rows, patch }: { d: UserData; rows: ValuedHolding[]; patch: (id: string, p: Partial<Holding>) => void }) {
  const items = rows.filter((r) => r.holding.symbol);
  const lines = dividendLines(
    items.map((r) => {
      const h = r.holding;
      const fx = r.price?.fxToTwd ?? 1;
      return { symbol: h.symbol, annual: (h.dividendPerShare ?? 0) * h.quantity * fx, paymentsPerYear: h.paymentsPerYear ?? 1, domestic: isTaiwanCode(h.symbol) };
    }),
  );
  const annual = lines.reduce((s, l) => s + l.annual, 0);
  const domestic = lines.filter((l) => l.domestic).reduce((s, l) => s + l.annual, 0);
  const foreign = annual - domestic;
  const nhi = lines.reduce((s, l) => s + l.nhi, 0);
  const tax = compareDividendTax(domestic, d.finances.marginalTaxRate);
  const coverage = d.finances.monthlyExpense ? annual / (d.finances.monthlyExpense * 12) : null;

  return (
    <section className="section">
      <h2>股利、被動收入與稅費</h2>
      <p className="lede">填入每股每年配息（券商 App 的股利紀錄或 Goodinfo 可查），估算一年的現金股利、二代健保補充保費與所得稅。規則說明見<Link href="/learn/taiwan-tax">台灣股利稅費</Link>。</p>
      <div className="stack">
        <div className="panel">
          <div className="tbl-wrap">
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>標的</th><th>每股年配息</th><th>每年幾次</th><th>年股利</th><th>單次</th></tr></thead>
              <tbody>
                {items.map((r, i) => {
                  const h = r.holding;
                  const l = lines[i];
                  return (
                    <tr key={h.id}>
                      <td className="t"><b className="num">{h.symbol}</b></td>
                      <td><input type="number" min={0} step="any" aria-label={`${h.symbol} 每股年配息`} value={h.dividendPerShare ?? ""} placeholder="—" onChange={(e) => patch(h.id, { dividendPerShare: +e.target.value || undefined })} style={{ width: 80, textAlign: "right" }} /></td>
                      <td>
                        <select aria-label={`${h.symbol} 配息次數`} value={h.paymentsPerYear ?? 1} onChange={(e) => patch(h.id, { paymentsPerYear: +e.target.value })} style={{ width: 64 }}>
                          {[1, 2, 4, 12].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                      <td>{l.annual ? money(l.annual) : "—"}</td>
                      <td className={l.nhi ? "neg" : ""}>{l.annual ? money(l.perPayment) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>國內股利單次達 {money(TAX_RULES.nhiThreshold)} 會被扣 {pct(TAX_RULES.nhiRate, 2)} 補充保費（紅字）。美股股利由美國先預扣 {pct(TAX_RULES.usWithholding, 0)}。</p>
        </div>
        <div className="stack">
          <Stats
            items={[
              { label: "年現金股利", value: money(annual), note: "稅前" },
              { label: "被動收入覆蓋率", value: coverage == null ? "—" : pct(coverage, 1), note: coverage == null ? "先在計畫填每月支出" : "股利 ÷ 年支出" },
              { label: "補充保費", value: money(nhi), note: nhi ? "可拆單或分散標的避開" : "目前每次都低於門檻" },
              { label: "建議課稅方式", value: domestic ? (tax.better === "combined" ? "合併計稅" : "分開計稅") : "—", note: domestic ? `省 ${money(Math.abs(tax.separate - tax.combined))}` : "無國內股利" },
            ]}
          />
          <div className="verdict">
            <span className="pill">稅費試算</span>
            <p>
              國內股利 {money(domestic)}：合併計稅（邊際稅率 {pct(d.finances.marginalTaxRate, 0)}、可抵減 8.5%）{tax.combined < 0 ? `可退 ${money(-tax.combined)}` : `約繳 ${money(tax.combined)}`}；分開計稅（28%）約繳 {money(tax.separate)}。
              {foreign > 0 && ` 海外股利 ${money(foreign)} 美國預扣後約剩 ${money(foreign * (1 - TAX_RULES.usWithholding))}。`}
              試算假設股利不會讓你跳級距，實際以報稅軟體為準。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Rebalance({ d, rows, totals, total }: { d: UserData; rows: ValuedHolding[]; totals: Weights; total: number }) {
  const [newMoney, setNewMoney] = useState<number | null>(null);
  const [noSell, setNoSell] = useState(true);
  if (!total) return null;
  const amount = newMoney ?? d.policy.monthlyContribution;
  const rb = rebalance(totals, d.policy.target, amount, noSell);
  const currentPct = totals.map((v) => Math.round((v / total) * 100)) as Weights;
  const drift = Math.max(...rb.rows.map((r) => Math.abs(r.currentPct - r.targetPct)));
  const band = d.policy.rebalanceBand / 100;
  return (
    <section className="section">
      <h2>這次的錢該怎麼放</h2>
      <div className="panel stack" style={{ marginBottom: 16 }}>
        <div><span className="hint">目前</span><AllocBar weights={currentPct} /></div>
        <div><span className="hint">目標（在<Link href="/plan">計畫</Link>調整）</span><AllocBar weights={d.policy.target} /></div>
        <p className="hint">{drift > band ? `最大偏離 ${pct(drift, 0)}，超過你設定的 ±${d.policy.rebalanceBand} 個百分點，這次投入時調整。` : `最大偏離 ${pct(drift, 0)}，在 ±${d.policy.rebalanceBand} 個百分點以內，照原計畫投入即可。`}</p>
      </div>
      <div className="split">
        <div className="panel stack">
          <NumberField label="這次新增資金" suffix="新台幣" value={amount} onChange={setNewMoney} />
          <label className="row" style={{ fontSize: ".88rem" }}>
            <input type="checkbox" checked={noSell} onChange={(e) => setNoSell(e.target.checked)} />只用新增資金調整，不賣出
          </label>
          <p className="hint">不賣出可以避免交易成本和稅，但偏離太大時可能調不回來。這裡只看股、債、現金三類；單一公司集中度看上一段。</p>
        </div>
        <div className="panel">
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>類別</th><th>目前</th><th>目標</th><th>動作</th><th>調整後</th></tr></thead>
              <tbody>
                {rb.rows.map((r, i) => {
                  const cls = CLASS_ORDER[i];
                  const inClass = rows.filter((v) => v.holding.assetClass === cls && v.price);
                  const one = inClass.length === 1 ? inClass[0] : null;
                  const units = one?.price?.fxToTwd ? Math.floor(Math.abs(r.action) / (one.price.price * one.price.fxToTwd)) : null;
                  return (
                    <tr key={cls}>
                      <td className="t"><span className="dot" style={{ background: `var(--${cls})` }} />{CLASS_LABEL[cls]}</td>
                      <td>{pct(r.currentPct, 0)}</td>
                      <td>{pct(r.targetPct, 0)}</td>
                      <td className={r.action > 0.5 ? "pos" : r.action < -0.5 ? "neg" : ""}>
                        {Math.abs(r.action) < 1 ? "不動" : `${r.action > 0 ? "買進" : "賣出"} ${money(Math.abs(r.action))}`}
                        {units != null && units > 0 && one && <small>約 {units.toLocaleString()} 股 {one.holding.symbol}</small>}
                      </td>
                      <td>{pct(r.afterPct, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            {noSell && rb.maxDeviation > band
              ? `只用新資金無法完全調回目標，最大仍偏離 ${pct(rb.maxDeviation, 0)}。`
              : `調整後總資產 ${money(rb.total)}。股數以最新收盤價估算，實際以下單價格為準。`}
          </p>
        </div>
      </div>
    </section>
  );
}
