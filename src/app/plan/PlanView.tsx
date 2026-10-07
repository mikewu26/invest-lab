"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { NumberField } from "@/components/Field";
import { LineChart } from "@/components/LineChart";
import { Stats } from "@/components/Stats";
import { WeightsEditor } from "@/components/WeightsEditor";
import { buckets, fiNumber } from "@/lib/calc/policy";
import { ageRule, PROFILES, RISK_QUESTIONS, scoreRisk } from "@/lib/calc/risk";
import { DEFAULT_ASSUMPTIONS, simulate, type Assumptions } from "@/lib/calc/simulate";
import { money, pct } from "@/lib/format";
import type { Finances, HouseGoal, Policy, Simulation, UserData } from "@/lib/storage/types";
import { useUserData } from "@/lib/storage/useUserData";

const TAX_RATES = [0.05, 0.12, 0.2, 0.3, 0.4];

export function PlanView() {
  const [d, update] = useUserData();
  const setFin = (p: Partial<Finances>) => update((x) => ({ ...x, finances: { ...x.finances, ...p } }));
  const setHouse = (p: Partial<HouseGoal>) => update((x) => ({ ...x, house: { ...x.house, ...p } }));
  const setPolicy = (p: Partial<Policy>) => update((x) => ({ ...x, policy: { ...x.policy, ...p } }));
  const b = buckets(d);
  const savingsRate = d.finances.annualTakeHome ? (d.policy.monthlyContribution * 12) / d.finances.annualTakeHome : null;

  return (
    <div className="stack" style={{ gap: 40 }}>
      <section>
        <h2>1. 財務現況</h2>
        <p className="lede">這些數字決定三個水桶的大小。看不懂為什麼要分桶，先讀<Link href="/learn/three-buckets">三個水桶</Link>。</p>
        <div className="split">
          <div className="panel stack">
            <NumberField label="活存與定存" suffix="元" value={d.finances.cash} onChange={(v) => setFin({ cash: v })} step={10000} hint="不含證券帳戶裡的股票" />
            <NumberField label="每月生活支出" suffix="元" value={d.finances.monthlyExpense} onChange={(v) => setFin({ monthlyExpense: v })} hint="房租、餐費、交通、保險、訂閱，平均一個月花多少" />
            <NumberField label="年度可支配所得" suffix="元，稅後" value={d.finances.annualTakeHome} onChange={(v) => setFin({ annualTakeHome: v })} step={10000} />
            <label className="f" htmlFor="tax-rate">綜所稅邊際稅率
              <select id="tax-rate" value={d.finances.marginalTaxRate} onChange={(e) => setFin({ marginalTaxRate: +e.target.value })}>
                {TAX_RATES.map((r) => <option key={r} value={r}>{r * 100}%</option>)}
              </select>
              <span className="hint">報稅時「綜合所得淨額」落在哪一級。用來比較股利怎麼課稅比較省。</span>
            </label>
          </div>
          <div className="stack">
            <div className="panel">
              <h3>現金怎麼分</h3>
              <BucketRows d={d} />
            </div>
            <Stats
              items={[
                { label: "每月投入占所得", value: savingsRate == null ? "—" : pct(savingsRate, 0), note: "長期投資的部分" },
                { label: "財務自由數字", value: d.finances.monthlyExpense ? money(fiNumber(d.finances.monthlyExpense)) : "—", note: "年支出 × 25" },
                { label: "預備金", value: d.finances.monthlyExpense ? `${(b.emergencyHave / d.finances.monthlyExpense).toFixed(1)} 個月` : "—", note: `目標 ${d.policy.emergencyMonths} 個月` },
                { label: "閒置現金", value: d.finances.monthlyExpense ? money(b.spareCash) : "—", note: "預備金與購屋之外" },
              ]}
            />
          </div>
        </div>
      </section>

      <section>
        <h2>2. 購屋目標</h2>
        <p className="lede">三年內要用的錢，不該承受股市的波動。詳見<Link href="/learn/house-vs-invest">買房和投資怎麼一起規劃</Link>。</p>
        <div className="panel stack" style={{ maxWidth: 640 }}>
          <label className="row" style={{ fontSize: ".92rem" }}>
            <input type="checkbox" checked={d.house.enabled} onChange={(e) => setHouse({ enabled: e.target.checked })} />我有買房計畫
          </label>
          {d.house.enabled && (
            <div className="grid2">
              <NumberField label="需準備的現金" suffix="元" value={d.house.target} onChange={(v) => setHouse({ target: v })} step={100000} hint="頭期款＋裝潢＋仲介、代書、稅費" />
              <label className="f" htmlFor="house-date">預計購屋時間
                <input id="house-date" type="month" value={d.house.targetDate} onChange={(e) => setHouse({ targetDate: e.target.value })} />
                <span className="hint">
                  {b.houseMonths != null && b.houseMonths > 0
                    ? `還有 ${b.houseMonths} 個月${b.houseMonthly ? `，每月需存 ${money(b.houseMonthly)}` : ""}`
                    : "還沒決定也可以先估一個"}
                </span>
              </label>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2>3. 投資紀律</h2>
        <p className="lede">這是投資政策書的核心：在市場平靜時先決定好規則，市場劇烈波動時照規則執行。</p>
        <div className="split">
          <div className="panel stack">
            <NumberField label="每月投入長期投資" suffix="元" value={d.policy.monthlyContribution} onChange={(v) => setPolicy({ monthlyContribution: v })} />
            <NumberField label="緊急預備金" suffix="個月生活費" value={d.policy.emergencyMonths} onChange={(v) => setPolicy({ emergencyMonths: v })} step={1} max={24} />
            <label className="f" htmlFor="cap">單一公司上限：<span className="num">{d.policy.singleStockCap}%</span>
              <input id="cap" type="range" min={10} max={100} step={5} value={d.policy.singleStockCap} onChange={(e) => setPolicy({ singleStockCap: +e.target.value })} />
              <span className="hint">含 ETF 裡間接持有的部分。專業機構常把單一個股控制在 5–10%，個人投資者常見 20–30%。</span>
            </label>
            <div className="grid2">
              <NumberField label="再平衡區間" suffix="± 百分點" value={d.policy.rebalanceBand} onChange={(v) => setPolicy({ rebalanceBand: v })} step={1} max={30} />
              <NumberField label="檢視頻率" suffix="每幾個月" value={d.policy.reviewEveryMonths} onChange={(v) => setPolicy({ reviewEveryMonths: Math.max(1, v) })} step={1} max={12} />
            </div>
          </div>
          <div className="panel stack">
            <h3>我的規則</h3>
            <RulesEditor rules={d.policy.rules} onChange={(rules) => setPolicy({ rules })} />
            <p className="hint">好的規則要具體到能判斷「有沒有做到」。寫「長期持有」太模糊，寫「只有公司基本面改變才賣，股價下跌不算」才能執行。</p>
          </div>
        </div>
      </section>

      <Allocation d={d} setPolicy={setPolicy} update={update} />
      <Projection d={d} update={update} />
    </div>
  );
}

function BucketRows({ d }: { d: UserData }) {
  const b = buckets(d);
  const rows = [
    { name: "緊急預備金", have: b.emergencyHave, need: b.emergencyNeed, note: d.finances.monthlyExpense ? `${d.policy.emergencyMonths} 個月支出` : "先填每月支出" },
    ...(d.house.enabled ? [{ name: "購屋基金", have: b.houseHave, need: b.houseNeed, note: d.house.targetDate || "先填時間" }] : []),
  ];
  return (
    <div className="stack" style={{ gap: 12 }}>
      {rows.map((r) => (
        <div key={r.name} className="bucket">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>{r.name} <span className="hint">{r.note}</span></span>
            <span className="num">{money(r.have)} / {r.need ? money(r.need) : "—"}</span>
          </div>
          <div className={`meter ${r.need && r.have < r.need ? "warn" : ""}`}><i style={{ width: `${r.need ? Math.min(100, (r.have / r.need) * 100) : 0}%` }} /></div>
        </div>
      ))}
      <p className="hint">{d.finances.monthlyExpense ? `現金依序填進上面的水桶，剩下的 ${money(b.spareCash)} 才是可以考慮投入長期投資的閒錢。` : "先填每月生活支出，才知道預備金要留多少、剩下多少閒錢。"}</p>
    </div>
  );
}

function RulesEditor({ rules, onChange }: { rules: string[]; onChange: (r: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <>
      <ol className="rules">
        {rules.map((r, i) => (
          <li key={i}>
            <span className="num muted" style={{ paddingTop: 7 }}>{i + 1}.</span>
            <input type="text" aria-label={`規則 ${i + 1}`} value={r} onChange={(e) => onChange(rules.map((x, j) => (j === i ? e.target.value : x)))} />
            <button className="link-btn" type="button" style={{ paddingTop: 8 }} onClick={() => onChange(rules.filter((_, j) => j !== i))}>刪除</button>
          </li>
        ))}
      </ol>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onChange([...rules, draft.trim()]); setDraft(""); } }}>
        <input type="text" aria-label="新增規則" placeholder="新增一條規則" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ flex: 1, fontFamily: "var(--body)" }} />
        <button className="btn ghost small" type="submit">新增</button>
      </form>
    </>
  );
}

function Allocation({ d, setPolicy, update }: { d: UserData; setPolicy: (p: Partial<Policy>) => void; update: (fn: (x: UserData) => UserData) => void }) {
  const risk = scoreRisk(d.riskAnswers);
  const profile = PROFILES[risk.profile];
  const gap = Math.abs(d.policy.target[0] - profile.weights[0]);
  return (
    <section>
      <h2>4. 長期投資的目標配置</h2>
      <p className="lede">只針對長期投資的錢（不含預備金和購屋基金）。比例怎麼定，可以參考<Link href="/learn/portfolios">投資組合範例庫</Link>。</p>
      <div className="split">
        <div className="panel">
          <h3>風險屬性問卷</h3>
          {RISK_QUESTIONS.map((q, qi) => (
            <fieldset key={qi}>
              <legend>{qi + 1}. {q.q}</legend>
              <div className="radios">
                {q.options.map((o, oi) => (
                  <label key={oi}>
                    <input type="radio" name={`q${qi}`} checked={d.riskAnswers[qi] === oi}
                      onChange={() => update((x) => ({ ...x, riskAnswers: x.riskAnswers.map((a, i) => (i === qi ? oi : a)) }))} />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="stack">
          <div className="profile">
            <span className="eyebrow">風險屬性 · {risk.score} / {risk.max} 分</span><br />
            <b>{risk.profile}型</b>
            <p>{profile.desc} 參考配置：股票 {profile.weights[0]}%、債券 {profile.weights[1]}%、現金 {profile.weights[2]}%。</p>
          </div>
          <div className="panel stack">
            <h3>目標配置</h3>
            <WeightsEditor value={d.policy.target} onChange={(w) => setPolicy({ target: w })} />
            {gap >= 20 && <p className="hint">目前股票比例和問卷結果差距較大，請確認自己能承受對應的跌幅。</p>}
            <div className="row">
              <button className="btn ghost small" type="button" onClick={() => setPolicy({ target: profile.weights })}>套用問卷建議</button>
              <button className="btn ghost small" type="button" onClick={() => setPolicy({ target: ageRule(d.age) })}>用「110 − 年齡」法則</button>
            </div>
            <div style={{ maxWidth: 140 }}>
              <NumberField label="年齡" value={d.age} onChange={(v) => update((x) => ({ ...x, age: v || 35 }))} step={1} max={90} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Projection({ d, update }: { d: UserData; update: (fn: (x: UserData) => UserData) => void }) {
  const [a, setA] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const s = d.sim;
  const setSim = (p: Partial<Simulation>) => update((x) => ({ ...x, sim: { ...x.sim, ...p } }));
  const sim = useMemo(() => simulate({ initial: s.initial, monthly: s.monthly, years: s.years, weights: d.policy.target, assumptions: a }), [s.initial, s.monthly, s.years, d.policy.target, a]);
  const Y = s.years;
  const P = sim.principal[Y];
  const fi = d.finances.monthlyExpense ? fiNumber(d.finances.monthlyExpense) : null;
  const fiYear = fi ? sim.p50.findIndex((v) => v >= fi) : -1;
  const names = ["股票", "債券", "現金"];
  const setMu = (i: number, v: number) => setA((x) => ({ ...x, mu: x.mu.map((m, j) => (j === i ? v / 100 : m)) as Assumptions["mu"] }));
  const setSd = (i: number, v: number) => setA((x) => ({ ...x, sigma: x.sigma.map((m, j) => (j === i ? Math.max(0, v) / 100 : m)) as Assumptions["sigma"] }));

  return (
    <section>
      <h2>5. 長期試算</h2>
      <p className="lede">用目標配置跑 1,000 次隨機模擬。重點不是中位數，而是最差的 10% 你能不能接受。</p>
      <div className="split">
        <div className="panel stack">
          <div className="grid2">
            <NumberField label="初始金額" suffix="元" value={s.initial} onChange={(v) => setSim({ initial: v })} step={10000} />
            <NumberField label="每月投入" suffix="元" value={s.monthly} onChange={(v) => setSim({ monthly: v })} />
          </div>
          <button className="link-btn" type="button" style={{ alignSelf: "flex-start" }} onClick={() => setSim({ monthly: d.policy.monthlyContribution })}>
            改用投資紀律裡的每月投入（{money(d.policy.monthlyContribution)}）
          </button>
          <label className="f" htmlFor="p-years">投資年數：<span className="num">{Y}</span> 年
            <input id="p-years" type="range" min={1} max={40} value={Y} onChange={(e) => setSim({ years: +e.target.value })} />
          </label>
          <details className="adv">
            <summary>進階假設（年化報酬與波動）</summary>
            <div className="stack" style={{ marginTop: 10 }}>
              <div className="grid3">
                {names.map((n, i) => (
                  <label className="f" key={"mu" + i} htmlFor={`mu-${i}`}>{n}報酬 %
                    <input id={`mu-${i}`} type="number" step={0.5} value={+(a.mu[i] * 100).toFixed(2)} onChange={(e) => setMu(i, +e.target.value)} />
                  </label>
                ))}
                {names.map((n, i) => (
                  <label className="f" key={"sd" + i} htmlFor={`sd-${i}`}>{n}波動 %
                    <input id={`sd-${i}`} type="number" step={0.5} value={+(a.sigma[i] * 100).toFixed(2)} onChange={(e) => setSd(i, +e.target.value)} />
                  </label>
                ))}
              </div>
              <p className="hint">預設值參考全球股債長期歷史的保守估計，未扣通膨。想看實質購買力，每個報酬各減 2%。單一個股的波動通常是大盤的 1.5–2 倍，持股集中時實際起伏會比模擬更大。</p>
              <button className="link-btn" type="button" onClick={() => setA(DEFAULT_ASSUMPTIONS)} style={{ alignSelf: "flex-start" }}>恢復預設</button>
            </div>
          </details>
        </div>
        <div className="stack">
          <Stats
            items={[
              { label: "投入本金", value: money(P), note: `${Y} 年累計` },
              { label: "中位數結果", value: money(sim.p50[Y]), tone: "pos", note: `約本金 ${(sim.p50[Y] / Math.max(P, 1)).toFixed(1)} 倍` },
              { label: "較差情況", value: money(sim.p10[Y]), note: "最差 10%" },
              { label: "財務自由", value: fi == null ? "—" : fiYear >= 0 ? `第 ${fiYear} 年` : `${Y} 年內未達`, note: fi == null ? "先填每月支出" : `目標 ${money(fi)}（中位數）` },
            ]}
          />
          <div className="panel">
            <LineChart
              ariaLabel="資產模擬結果"
              xLabels={sim.principal.map((_, y) => `${y} 年`)}
              xTickCount={Math.min(Y + 1, 5)}
              yMin={0}
              band={{ lo: sim.p10, hi: sim.p90, color: "accent" }}
              series={[
                { data: sim.principal, color: "muted", width: 1.3, dash: [4, 4], label: "本金" },
                ...(fi ? [{ data: sim.principal.map(() => fi), color: "gold", width: 1, dash: [2, 3], label: "財務自由" }] : []),
                { data: sim.p50, color: "accent", width: 2, dot: true, label: "中位數" },
              ]}
              yFormat={(v) => (v >= 1e8 ? (v / 1e8).toFixed(1) + "億" : Math.round(v / 1e4).toLocaleString() + "萬")}
              tipFormat={money}
            />
            <div className="legend">
              <span><i className="band" style={{ background: "var(--accent)" }} />80% 的模擬落在此區間</span>
              <span><i style={{ background: "var(--accent)" }} />中位數</span>
              <span><i style={{ background: "var(--muted)" }} />投入本金</span>
              {fi && <span><i style={{ background: "var(--gold)" }} />財務自由數字</span>}
            </div>
          </div>
          <div className="verdict">
            <span className={`pill ${sim.belowPrincipal > 0.15 ? "down" : "up"}`}>{pct(sim.belowPrincipal, 0)} 低於本金</span>
            <p>途中可能遇到的單年跌幅約 {pct(Math.abs(Math.min(0, sim.badYear)), 0)}（10% 機率更糟）。如果這個跌幅會讓你想賣出，請降低股票比例。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
