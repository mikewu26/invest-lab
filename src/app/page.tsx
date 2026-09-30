import Link from "next/link";
import { ConceptCard } from "@/components/ConceptCard";
import { Quiz } from "@/components/Quiz";
import { CONCEPTS, STEPS } from "@/content/learn";

export default function LearnPage() {
  return (
    <>
      <h1>新手起步的五個順序</h1>
      <p className="lede">
        順序很重要。多數新手的問題不是選錯標的，而是在還沒準備好之前就投入、遇到下跌就賣出。準備好了，就到
        <Link href="/plan">配置</Link>做風險問卷。
      </p>
      <ol className="path">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <b>STEP {i + 1}</b>
            <span>{s.title}</span>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>

      <section className="section">
        <h2>核心觀念</h2>
        <p className="lede">點開每張卡片，看一句話解釋、實際例子和常見誤區。</p>
        <div className="concepts">
          {CONCEPTS.map((c) => (
            <ConceptCard key={c.title} {...c} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2>小測驗</h2>
        <p className="lede">五題檢查自己有沒有真的懂。點選答案後會顯示解釋。</p>
        <Quiz />
      </section>
    </>
  );
}
