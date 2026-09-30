"use client";
import type { Weights } from "@/lib/calc/simulate";

const CLASSES = [
  { key: "stock", label: "股票" },
  { key: "bond", label: "債券" },
  { key: "cash", label: "現金" },
] as const;

export function AllocBar({ weights }: { weights: Weights }) {
  return (
    <div className="alloc-bar" aria-hidden="true">
      {CLASSES.map((c, i) => (
        <div key={c.key} className={`seg-${c.key}`} style={{ flexBasis: `${weights[i]}%` }}>
          {weights[i] >= 10 ? `${weights[i]}%` : ""}
        </div>
      ))}
    </div>
  );
}

/** 股票與債券用滑桿，現金自動補足 100%。 */
export function WeightsEditor({ value, onChange }: { value: Weights; onChange: (w: Weights) => void }) {
  const [s, b, c] = value;
  const set = (ns: number, nb: number) => {
    const bb = Math.min(nb, 100 - ns);
    onChange([ns, bb, 100 - ns - bb]);
  };
  return (
    <div className="stack">
      <AllocBar weights={value} />
      <div className="sl">
        <label htmlFor="w-stock"><span className="dot" style={{ background: "var(--stock)" }} />股票</label>
        <input id="w-stock" type="range" min={0} max={100} step={5} value={s} onChange={(e) => set(+e.target.value, b)} />
        <output htmlFor="w-stock">{s}%</output>
      </div>
      <div className="sl">
        <label htmlFor="w-bond"><span className="dot" style={{ background: "var(--bond)" }} />債券</label>
        <input id="w-bond" type="range" min={0} max={100 - s} step={5} value={b} onChange={(e) => set(s, +e.target.value)} />
        <output htmlFor="w-bond">{b}%</output>
      </div>
      <div className="sl">
        <span><span className="dot" style={{ background: "var(--cash)" }} />現金</span>
        <span className="hint">自動補足到 100%</span>
        <output>{c}%</output>
      </div>
    </div>
  );
}
