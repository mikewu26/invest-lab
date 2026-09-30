import type { Metadata } from "next";
import { ConceptCard } from "@/components/ConceptCard";
import { METRIC_NOTES } from "@/content/learn";
import { TrendView } from "./TrendView";

export const metadata: Metadata = { title: "趨勢分析" };

export default function TrendPage() {
  return (
    <>
      <h1>讀懂一段價格走勢</h1>
      <p className="lede">
        輸入台股或美股代號，抓取真實收盤價，算出報酬、波動、最大回撤和均線狀態。這些指標描述「過去發生了什麼」，不能預測未來。
      </p>
      <TrendView />
      <section className="section">
        <h2>指標怎麼看</h2>
        <div className="concepts" style={{ marginTop: 12 }}>
          {METRIC_NOTES.map((m) => (
            <ConceptCard key={m.title} title={m.title} summary={m.summary} example={m.body} pitfall={m.pitfall} exampleTag="說明" />
          ))}
        </div>
      </section>
    </>
  );
}
