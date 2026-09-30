"use client";
import { useMemo, useState } from "react";
import { LineChart } from "@/components/LineChart";
import { Stats } from "@/components/Stats";
import { WeightsEditor } from "@/components/WeightsEditor";
import { ageRule, PROFILES, RISK_QUESTIONS, scoreRisk } from "@/lib/calc/risk";
import { DEFAULT_ASSUMPTIONS, simulate, type Assumptions } from "@/lib/calc/simulate";
import { money, pct } from "@/lib/format";
import type { Plan } from "@/lib/storage/types";
import { useUserData } from "@/lib/storage/useUserData";

export function PlanView() {
  const [user, update] = useUserData();
  const plan = user.plan;
  const setPlan = (patch: Partial<Plan>) => update((d) => ({ ...d, plan: { ...d.plan, ...patch } }));
  const risk = scoreRisk(plan.riskAnswers);
  const profile = PROFILES[risk.profile];
  const gap = Math.abs(plan.target[0] - profile.weights[0]);

  return (
    <>
      <div className="split">
        <div className="panel">
          <h3>風險屬性問卷</h3>
          {RISK_QUESTIONS.map((q, qi) => (
            <fieldset key={qi}>
              <legend>{qi + 1}. {q.q}</legend>
              <div className="radios">
                {q.options.map((o, oi) => (
                  <label key={oi}>
                    <input
                      type="radio"
                      name={`q${qi}`}
                      checked={plan.riskAnswers[qi] === oi}
                      onChange={() => setPlan({ riskAnswers: plan.riskAnswers.map((a, i) => (i === qi ? oi : a)) })}
                    />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="stack">
          <div className="profile">
            <span className="eyebrow">風險屬性 · {risk.score} / {risk.max} 分</span>
            <br />
            <b>{risk.profile}型</b>
            <p>
              {profile.desc} 建議配置：股票 {profile.weights[0]}%、債券 {profile.weights[1]}%、現金 {profile.weights[2]}%。
            </p>
          </div>
          {risk.lowEmergencyFund && <div className="alert">你的緊急預備金還不到 3 個月生活費。建議先補足，再開始投資。</div>}
          <div className="panel stack">
            <h3>目標配置</h3>
            <WeightsEditor value={plan.target} onChange={(w) => setPlan({ target: w })} />
            {gap >= 20 && (
              <p className="hint">
                目前股票比例和問卷結果（{risk.profile}型，股票 {profile.weights[0]}%）差距較大，請確認自己能承受對應的波動。
              </p>
            )}
            <div className="row">
              <button className="btn ghost" type="button" onClick={() => setPlan({ target: profile.weights })}>套用問卷建議</button>
              <button className="btn ghost" type="button" onClick={() => setPlan({ target: ageRule(plan.age) })}>用「110 − 年齡」法則</button>
            </div>
            <label className="f" htmlFor="age" style={{ maxWidth: 140 }}>
              你的年齡
              <input id="age" type="number" min={18} max={90} value={plan.age} onChange={(e) => setPlan({ age: +e.target.value || 35 })} />
            </label>
          </div>
        </div>
      </div>
      <Projection plan={plan} setPlan={setPlan} />
    </>
  );
}

function Projection({ plan, setPlan }: { plan: Plan; setPlan: (p: Partial<Plan>) => void }) {
  const [a, setA] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const sim = useMemo(
    () => simulate({ initial: plan.initial, monthly: plan.monthly, years: plan.years, weights: plan.target, assumptions: a }),
    [plan.initial, plan.monthly, plan.years, plan.target, a],
  );
  const Y = plan.years;
  const P = sim.principal[Y];
  const labels = sim.principal.map((_, y) => `${y} 年`);
  const setMu = (i: number, v: number) => setA((x) => ({ ...x, mu: x.mu.map((m, j) => (j === i ? v / 100 : m)) as Assumptions["mu"] }));
  const setSd = (i: number, v: number) => setA((x) => ({ ...x, sigma: x.sigma.map((m, j) => (j === i ? Math.max(0, v) / 100 : m)) as Assumptions["sigma"] }));
  const names = ["股票", "債券", "現金"];

  return (
    <section className="section">
      <h2>長期試算</h2>
      <p className="lede">用 1,000 次隨機模擬估算未來可能的結果範圍。重點不是中間那條線，而是「最差的 10%」你能不能接受。</p>
      <div className="split">
        <div className="panel stack">
          <div className="grid2">
            <label className="f" htmlFor="p-init">初始金額（元）
              <input id="p-init" type="number" min={0} step={10000} value={plan.initial} onChange={(e) => setPlan({ initial: Math.max(0, +e.target.value || 0) })} />
            </label>
            <label className="f" htmlFor="p-month">每月投入（元）
              <input id="p-month" type="number" min={0} step={1000} value={plan.monthly} onChange={(e) => setPlan({ monthly: Math.max(0, +e.target.value || 0) })} />
            </label>
          </div>
          <label className="f" htmlFor="p-years">投資年數：<span className="num">{Y}</span> 年
            <input id="p-years" type="range" min={1} max={40} value={Y} onChange={(e) => setPlan({ years: +e.target.value })} />
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
              <p className="hint">預設值參考全球股債長期歷史的保守估計，未扣除通膨。想看實質購買力，可把每個報酬各減 2%。</p>
              <button className="link-btn" type="button" onClick={() => setA(DEFAULT_ASSUMPTIONS)} style={{ alignSelf: "flex-start" }}>恢復預設</button>
            </div>
          </details>
        </div>
        <div className="stack">
          <Stats
            items={[
              { label: "投入本金", value: money(P), note: `${Y} 年累計` },
              { label: "中位數結果", value: money(sim.p50[Y]), tone: "pos", note: `約本金的 ${(sim.p50[Y] / Math.max(P, 1)).toFixed(1)} 倍` },
              { label: "較差情況", value: money(sim.p10[Y]), note: "最差 10% 的模擬" },
              { label: "較好情況", value: money(sim.p90[Y]), note: "最好 10% 的模擬" },
            ]}
          />
          <div className="panel">
            <LineChart
              ariaLabel="資產模擬結果"
              xLabels={labels}
              xTickCount={Math.min(Y + 1, 5)}
              yMin={0}
              band={{ lo: sim.p10, hi: sim.p90, color: "accent" }}
              series={[
                { data: sim.principal, color: "muted", width: 1.3, dash: [4, 4], label: "本金" },
                { data: sim.p50, color: "accent", width: 2, dot: true, label: "中位數" },
              ]}
              yFormat={(v) => (v >= 1e8 ? (v / 1e8).toFixed(1) + "億" : Math.round(v / 1e4).toLocaleString() + "萬")}
              tipFormat={money}
            />
            <div className="legend">
              <span><i className="band" style={{ background: "var(--accent)" }} />80% 的模擬落在此區間</span>
              <span><i style={{ background: "var(--accent)" }} />中位數</span>
              <span><i style={{ background: "var(--muted)" }} />投入本金</span>
            </div>
          </div>
          <div className="verdict">
            <span className={`pill ${sim.belowPrincipal > 0.15 ? "down" : "up"}`}>{pct(sim.belowPrincipal, 0)} 低於本金</span>
            <p>
              1,000 次模擬中，有 {pct(sim.belowPrincipal, 0)} 在第 {Y} 年時低於投入本金。途中可能遇到的單年跌幅約{" "}
              {pct(Math.abs(Math.min(0, sim.badYear)), 0)}（10% 機率會更糟）。如果這個跌幅會讓你想賣出，請降低股票比例。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
