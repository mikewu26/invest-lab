import type { Metadata } from "next";
import Link from "next/link";
import { TEMPLATES } from "@/content/portfolios";
import { ApplyTemplate } from "./ApplyTemplate";

export const metadata: Metadata = { title: "投資組合範例庫" };

export default function PortfoliosPage() {
  return (
    <>
      <p className="crumb"><Link href="/learn">學習</Link> / 參考</p>
      <h1 style={{ marginTop: 6 }}>投資組合範例庫</h1>
      <p className="lede">
        六種常見配置的邏輯、歷史表現與適合的人。沒有最好的組合，只有你能在大跌時繼續執行的組合。歷史數字為美國市場的近似值，用來理解特性，不是預測。
      </p>
      <div className="tpl">
        {TEMPLATES.map((t) => (
          <article key={t.id} className="panel">
            <div>
              <h2 style={{ marginBottom: 0 }}>{t.name}</h2>
              <span className="hint">{t.origin}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: ".9rem" }}>
              {t.mix.map((m) => <li key={m.label}><span className="num">{m.weight}%</span> {m.label}</li>)}
            </ul>
            <dl>
              <dt>邏輯</dt><dd>{t.logic}</dd>
              <dt>優點</dt><dd>{t.good}</dd>
              <dt>缺點</dt><dd>{t.bad}</dd>
              <dt>歷史</dt><dd>{t.history}</dd>
              <dt>台灣做法</dt><dd>{t.taiwan}</dd>
              <dt>適合</dt><dd>{t.fit}</dd>
            </dl>
            {t.forYou && <p className="profile" style={{ margin: 0, fontSize: ".88rem" }}><b style={{ fontSize: ".95rem" }}>對你來說</b><br />{t.forYou}</p>}
            {t.weights ? <ApplyTemplate weights={t.weights} /> : <p className="hint" style={{ margin: 0 }}>含黃金或原物料，本工具目前只分股、債、現金三類，無法直接套用。</p>}
          </article>
        ))}
      </div>
    </>
  );
}
