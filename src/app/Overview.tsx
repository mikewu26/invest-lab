"use client";
import Link from "next/link";
import { CheckList } from "@/components/CheckList";
import { Stats } from "@/components/Stats";
import { ALL_LESSONS } from "@/content/catalog";
import { buckets, fiNumber, runChecks } from "@/lib/calc/policy";
import { valueHoldings } from "@/lib/calc/portfolio";
import { money, pct } from "@/lib/format";
import { useUserData } from "@/lib/storage/useUserData";
import { useQuotes } from "@/lib/useQuotes";

const REVIEW_STEPS = [
  { text: "更新持股股數與成本，確認報價都抓得到", href: "/portfolio" },
  { text: "看單一公司集中度，決定接下來三個月的投入怎麼分", href: "/portfolio" },
  { text: "更新活存金額與每月支出，確認預備金與購屋基金", href: "/plan" },
  { text: "重讀「我的規則」，這一季有沒有違反過？為什麼？", href: "/plan" },
  { text: "讀一課還沒讀的課程", href: "/learn" },
];

export function Overview() {
  const [d, update] = useUserData();
  const { prices, loading } = useQuotes(d.holdings);
  const rows = valueHoldings(d.holdings, prices);
  const invested = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const b = buckets(d);
  const checks = runChecks(d, rows);
  const fi = d.finances.monthlyExpense ? fiNumber(d.finances.monthlyExpense) : null;
  const next = ALL_LESSONS.find((l) => !d.lessonsDone.includes(l.slug));
  const empty = d.holdings.length === 0 && d.finances.cash === 0;
  const order = { bad: 0, warn: 1, todo: 2, ok: 3 } as const;
  const sorted = [...checks].sort((x, y) => order[x.status] - order[y.status]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1>總覽</h1>
      <p className="lede">依照你的投資政策書，檢查目前的狀態。這一頁每季看一次就夠，不需要每天打開。</p>

      {empty && (
        <div className="empty" style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 10px" }}>還沒有資料。先到計畫填財務現況，再到持股記錄目前的股票；或在持股頁匯入備份檔。</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn" href="/plan">填寫我的計畫</Link>
            <Link className="btn ghost" href="/portfolio">新增持股</Link>
          </div>
        </div>
      )}

      <Stats
        items={[
          { label: "長期投資市值", value: money(invested), note: loading ? "更新報價中⋯" : `${d.holdings.length} 檔` },
          { label: "現金", value: money(d.finances.cash), note: "活存與定存" },
          { label: "財務自由進度", value: fi ? pct(invested / fi, 1) : "—", note: fi ? `目標 ${money(fi)}` : "先填每月支出" },
          { label: "每月投入", value: money(d.policy.monthlyContribution), note: "長期投資" },
        ]}
      />

      <section className="section">
        <h2>三個水桶</h2>
        <div className="buckets" style={{ marginTop: 12 }}>
          <Bucket name="緊急預備金" have={b.emergencyHave} need={b.emergencyNeed} note={d.finances.monthlyExpense ? `${d.policy.emergencyMonths} 個月支出` : "尚未填每月支出"} />
          {d.house.enabled ? (
            <Bucket name="購屋基金" have={b.houseHave} need={b.houseNeed} note={b.houseMonths != null && b.houseMonths > 0 ? `還有 ${b.houseMonths} 個月` : "尚未填時間"} />
          ) : (
            <div className="panel bucket"><span className="hint">購屋基金</span><span className="muted">未啟用</span></div>
          )}
          <div className="panel bucket">
            <span className="hint">長期投資</span>
            <span className="amt">{money(invested)}</span>
            <span className="hint">{d.finances.monthlyExpense ? `另有閒置現金 ${money(b.spareCash)}` : "填每月支出後，才能算出有多少閒置現金"}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>規則檢查</h2>
        <div style={{ marginTop: 12 }}><CheckList checks={sorted} /></div>
      </section>

      <section className="section">
        <div className="split">
          <div className="panel stack">
            <h3>季度檢視清單</h3>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              {REVIEW_STEPS.map((s) => (
                <li key={s.text}><Link href={s.href}>{s.text}</Link></li>
              ))}
            </ol>
            <div className="row">
              <button className="btn" type="button" onClick={() => update((x) => ({ ...x, policy: { ...x.policy, lastReviewed: today } }))}>
                完成本次檢視
              </button>
              <span className="hint">{d.policy.lastReviewed ? `上次：${d.policy.lastReviewed}` : "還沒做過"}</span>
            </div>
          </div>
          <div className="panel stack">
            <h3>下一課</h3>
            {next ? (
              <>
                <p style={{ margin: 0 }}><b>{next.title}</b></p>
                <p className="hint">{next.module.title} · {next.summary}</p>
                <Link className="btn ghost" href={`/learn/${next.slug}`} style={{ alignSelf: "flex-start" }}>開始讀</Link>
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>全部讀完了。可以到範例庫比較不同組合，或重讀「你的狀況」標記的課。</p>
            )}
            <p className="hint">已讀 {d.lessonsDone.length} / {ALL_LESSONS.length} 課</p>
          </div>
        </div>
      </section>
    </>
  );
}

function Bucket({ name, have, need, note }: { name: string; have: number; need: number; note: string }) {
  const ratio = need ? Math.min(1, have / need) : 0;
  return (
    <div className="panel bucket">
      <span className="hint">{name}</span>
      <span className="amt">{money(have)}<span className="hint"> / {need ? money(need) : "—"}</span></span>
      <div className={`meter ${need && have < need ? "warn" : ""}`}><i style={{ width: `${ratio * 100}%` }} /></div>
      <span className="hint">{note}</span>
    </div>
  );
}
