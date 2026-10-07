import type { Metadata } from "next";
import Link from "next/link";
import { Quiz } from "@/components/Quiz";
import { MODULES } from "@/content/catalog";
import { LessonDone } from "./LessonProgress";

export const metadata: Metadata = { title: "學習" };

export default function LearnPage() {
  return (
    <>
      <h1>學習路徑</h1>
      <p className="lede">
        六個模組，從財務地基到選股、債券、組合設計和稅費。標示「你的狀況」的課，是依你目前的持股和購屋計畫寫的。建議依序讀，每課約 10 分鐘。
      </p>
      <div className="modules">
        {MODULES.map((m, mi) => (
          <section key={m.id} className="module">
            <span className="eyebrow">模組 {mi + 1}</span>
            <h2>{m.title}</h2>
            <p className="muted" style={{ margin: 0 }}>{m.goal}</p>
            <ul className="lessons">
              {m.lessons.map((l, li) => (
                <li key={l.slug}>
                  <Link href={`/learn/${l.slug}`}>
                    <span className="no">{mi + 1}-{li + 1}</span>
                    <span>
                      <span className="ttl">{l.title}</span>
                      <span className="sum">
                        {l.personal && <span className="tag you">你的狀況</span>}
                        {l.summary} · {l.minutes} 分鐘
                      </span>
                    </span>
                    <LessonDone slug={l.slug} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="module">
          <span className="eyebrow">參考</span>
          <h2>投資組合範例庫</h2>
          <p className="muted" style={{ margin: "0 0 10px" }}>六種經典配置的邏輯、歷史表現與適合的人，可以直接套用到你的目標配置。</p>
          <Link className="btn ghost" href="/learn/portfolios">打開範例庫</Link>
        </section>
        <section className="module">
          <span className="eyebrow">複習</span>
          <h2>基礎觀念小測驗</h2>
          <div style={{ marginTop: 10 }}><Quiz /></div>
        </section>
      </div>
    </>
  );
}
