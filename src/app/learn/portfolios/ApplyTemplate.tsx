"use client";
import Link from "next/link";
import { useState } from "react";
import type { Weights } from "@/lib/calc/simulate";
import { useUserData } from "@/lib/storage/useUserData";

export function ApplyTemplate({ weights }: { weights: Weights }) {
  const [d, update] = useUserData();
  const [applied, setApplied] = useState(false);
  const same = d.policy.target.every((v, i) => v === weights[i]);
  return (
    <div className="row">
      <button
        className="btn ghost small"
        type="button"
        disabled={same}
        onClick={() => {
          update((x) => ({ ...x, policy: { ...x.policy, target: weights } }));
          setApplied(true);
        }}
      >
        {same ? "目前的目標配置" : `套用為目標（股 ${weights[0]}／債 ${weights[1]}／現金 ${weights[2]}）`}
      </button>
      {applied && <span className="hint">已更新，<Link href="/plan">到計畫查看</Link></span>}
    </div>
  );
}
