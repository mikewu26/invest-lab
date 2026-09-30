export interface StatItem {
  label: string;
  value: string;
  note?: string;
  tone?: "pos" | "neg";
}

export function Stats({ items }: { items: StatItem[] }) {
  return (
    <div className="stats">
      {items.map((s) => (
        <div className="stat" key={s.label}>
          <div className="k">{s.label}</div>
          <div className={`v ${s.tone ?? ""}`} title={s.value}>
            {s.value}
          </div>
          {s.note && <div className="d">{s.note}</div>}
        </div>
      ))}
    </div>
  );
}
