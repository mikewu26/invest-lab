"use client";
import { useEffect, useId, useState } from "react";

interface Hit { symbol: string; name: string }

/** 輸入代號或中文名稱。台股會即時提示；美股或海外代號直接輸入後按 Enter。 */
export function SymbolSearch({ onPick, placeholder = "代號或名稱，例如 0050、台積電、VT", buttonLabel = "查詢" }: {
  onPick: (hit: Hit) => void;
  placeholder?: string;
  buttonLabel?: string;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ term: string; hits: Hit[] }>({ term: "", hits: [] });
  const term = q.trim();
  const searchable = term !== "" && !/^[A-Za-z^.=-]+$/.test(term);
  const hits = searchable && found.term === term ? found.hits : [];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!searchable) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((j: { results: Hit[] }) => setFound({ term, hits: j.results }))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, searchable]);

  const pick = (h: Hit) => {
    onPick(h);
    setQ("");
    setOpen(false);
  };

  return (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!term) return;
        const exact = hits.find((h) => h.symbol === term.toUpperCase() || h.name === term);
        pick(exact ?? hits[0] ?? { symbol: term.toUpperCase(), name: "" });
      }}
    >
      <div className="combo" style={{ flex: "1 1 200px" }}>
        <label htmlFor={id} className="hint" style={{ display: "block", marginBottom: 4 }}>搜尋標的</label>
        <input
          id={id}
          type="search"
          value={q}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => setOpen(true)}
          aria-autocomplete="list"
        />
        {open && hits.length > 0 && (
          <ul role="listbox">
            {hits.map((h) => (
              <li key={h.symbol}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(h)}>
                  <b>{h.symbol}</b>
                  <span>{h.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="btn" type="submit" style={{ alignSelf: "flex-end" }}>{buttonLabel}</button>
    </form>
  );
}
