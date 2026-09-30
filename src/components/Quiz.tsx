"use client";
import { useState } from "react";
import { QUIZ } from "@/content/learn";

export function Quiz() {
  const [picked, setPicked] = useState<(number | null)[]>(() => QUIZ.map(() => null));
  const answered = picked.filter((p) => p != null).length;
  const correct = picked.filter((p, i) => p === QUIZ[i].answer).length;
  return (
    <div className="panel">
      {QUIZ.map((item, qi) => {
        const p = picked[qi];
        return (
          <div className="q" key={qi}>
            <p className="qq">{qi + 1}. {item.q}</p>
            <div className="opts">
              {item.options.map((o, oi) => {
                const cls = p == null ? "" : oi === item.answer ? "right" : oi === p ? "wrong" : "";
                return (
                  <button key={oi} type="button" className={`opt ${cls}`} disabled={p != null}
                    onClick={() => setPicked((arr) => arr.map((v, i) => (i === qi ? oi : v)))}>
                    {o}
                  </button>
                );
              })}
            </div>
            {p != null && (
              <p className="explain">
                {p === item.answer ? "答對了。" : `正確答案是「${item.options[item.answer]}」。`}
                {item.why}
              </p>
            )}
          </div>
        );
      })}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <p className="num muted" style={{ margin: 0 }}>
          已作答 {answered} / {QUIZ.length}，答對 {correct} 題
          {answered === QUIZ.length && (correct >= 4 ? "。觀念很穩，可以往下一步走。" : "。建議再看一次上面的觀念卡。")}
        </p>
        {answered > 0 && (
          <button className="link-btn" type="button" onClick={() => setPicked(QUIZ.map(() => null))}>重新作答</button>
        )}
      </div>
    </div>
  );
}
