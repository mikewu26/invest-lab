"use client";
import { useEffect, useMemo, useState } from "react";
import { LineChart } from "@/components/LineChart";
import { Stats } from "@/components/Stats";
import { SymbolSearch } from "@/components/SymbolSearch";
import { analyze } from "@/lib/calc/trend";
import { pct, price, signedPct } from "@/lib/format";
import type { PriceSeries, Range } from "@/lib/market/types";
import { useUserData } from "@/lib/storage/useUserData";

const RANGES: { id: Range; label: string }[] = [
  { id: "6m", label: "6 個月" },
  { id: "1y", label: "1 年" },
  { id: "2y", label: "2 年" },
];

type Result = { status: "error"; message: string } | { status: "ok"; data: PriceSeries };

export function TrendView() {
  const [user, update] = useUserData();
  const [symbol, setSymbol] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("1y");
  const [loaded, setLoaded] = useState<{ key: string; result: Result } | null>(null);
  const active = symbol ?? user.watchlist[0] ?? "0050";
  const key = `${active}|${range}`;
  const state = loaded?.key === key ? loaded.result : { status: "loading" as const };

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/history?symbol=${encodeURIComponent(active)}&range=${range}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "查詢失敗");
        setLoaded({ key, result: { status: "ok", data: j as PriceSeries } });
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setLoaded({ key, result: { status: "error", message: e.message } });
      });
    return () => ctrl.abort();
  }, [active, range, key]);

  const inList = user.watchlist.includes(active);
  const toggleWatch = () =>
    update((d) => ({
      ...d,
      watchlist: inList ? d.watchlist.filter((s) => s !== active) : [...d.watchlist, active].slice(-12),
    }));

  return (
    <div className="stack">
      <div className="panel stack">
        <SymbolSearch onPick={(h) => setSymbol(h.symbol)} />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="chips" aria-label="觀察清單">
            {user.watchlist.map((s) => (
              <button key={s} className="chip" aria-pressed={s === active} onClick={() => setSymbol(s)}>{s}</button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="期間">
            {RANGES.map((r) => (
              <button key={r.id} aria-pressed={r.id === range} onClick={() => setRange(r.id)}>{r.label}</button>
            ))}
          </div>
        </div>
      </div>

      {state.status === "loading" && <div className="empty">正在讀取 {active} 的歷史價格⋯ 證交所資料第一次查詢需要幾秒。</div>}
      {state.status === "error" && (
        <div className="alert">
          {state.message}。台股請輸入數字代號（例如 2330），美股輸入英文代號（例如 VT、AAPL）。
        </div>
      )}
      {state.status === "ok" && <Result data={state.data} inList={inList} onToggleWatch={toggleWatch} />}
    </div>
  );
}

function Result({ data, inList, onToggleWatch }: { data: PriceSeries; inList: boolean; onToggleWatch: () => void }) {
  const closes = useMemo(() => data.points.map((p) => p.close), [data]);
  const labels = useMemo(() => data.points.map((p) => p.date), [data]);
  const shortLabels = useMemo(() => labels.map((d) => d.slice(0, 7)), [labels]);
  if (closes.length < 20) return <div className="alert">資料少於 20 筆，無法分析。</div>;
  const m = analyze(closes);
  const last = closes[closes.length - 1];
  const verdict = {
    up: { pill: "多頭排列", cls: "up", text: "價格 > 20 日線 > 60 日線：近一個月與一季的平均成本都在上升。" },
    down: { pill: "空頭排列", cls: "down", text: "價格 < 20 日線 < 60 日線：近期持續走弱。長期投資者可以檢查配置是否偏離，而不是急著賣出。" },
    range: { pill: "盤整或轉折", cls: "", text: "均線交錯，方向不明確。這種時候短線訊號特別容易失準。" },
    short: { pill: "資料不足", cls: "", text: "不到 60 筆資料，無法判斷均線排列。" },
  }[m.signal];

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>
            {data.name} <span className="num muted" style={{ fontSize: "1rem" }}>{data.symbol}</span>
          </h2>
          <span className="src">
            最新收盤 {price(last)} {data.currency} · {labels[labels.length - 1]} · 資料來源：{data.source === "twse" ? "臺灣證券交易所" : "Yahoo Finance"}
          </span>
        </div>
        <button className="btn ghost small" onClick={onToggleWatch}>{inList ? "移出觀察清單" : "加入觀察清單"}</button>
      </div>
      <Stats
        items={[
          { label: "期間報酬", value: signedPct(m.totalReturn), tone: m.totalReturn >= 0 ? "pos" : "neg", note: `${m.days} 個交易日` },
          { label: "年化報酬", value: m.cagr == null ? "—" : signedPct(m.cagr), tone: (m.cagr ?? 0) >= 0 ? "pos" : "neg", note: m.cagr == null ? "不足半年，不換算" : "換算成每年平均" },
          { label: "年化波動", value: pct(m.volatility), note: m.volatility < 0.1 ? "偏低，類似債券" : m.volatility < 0.22 ? "中等，類似大盤" : "偏高，類似個股" },
          { label: "最大回撤", value: signedPct(m.maxDrawdown), tone: "neg", note: `目前距高點 ${signedPct(m.currentDrawdown)}` },
        ]}
      />
      <div className="panel">
        <h3>價格與均線</h3>
        <LineChart
          ariaLabel={`${data.name} 收盤價與均線`}
          xLabels={labels}
          series={[
            { data: m.ma60, color: "bond", width: 1.4, label: "60日" },
            { data: m.ma20, color: "gold", width: 1.4, label: "20日" },
            { data: closes, color: "fg", width: 1.5, dot: true, label: "收盤" },
          ]}
          yFormat={(v) => (v >= 1000 ? Math.round(v).toLocaleString() : v.toFixed(v < 10 ? 1 : 0))}
          tipFormat={price}
        />
        <div className="legend">
          <span><i style={{ background: "var(--fg)" }} />收盤價</span>
          <span><i style={{ background: "var(--gold)" }} />20 日均線（約一個月）</span>
          <span><i style={{ background: "var(--bond)" }} />60 日均線（約一季）</span>
        </div>
        <p className="hint" style={{ marginTop: 6 }}>{shortLabels[0]} 至 {shortLabels[shortLabels.length - 1]}。游標移到圖上可看每日數值。</p>
      </div>
      <div className="panel">
        <h3>回撤：距離前高跌了多少</h3>
        <LineChart
          small
          ariaLabel="回撤"
          xLabels={labels}
          xTickCount={0}
          yTicks={2}
          yMax={0}
          series={[{ data: m.drawdown, color: "neg", width: 1.2, area: true, label: "回撤" }]}
          yFormat={(v) => Math.round(v * 100) + "%"}
          tipFormat={(v) => signedPct(v)}
        />
      </div>
      <div className="verdict">
        <span className={`pill ${verdict.cls}`}>{verdict.pill}</span>
        <p>{verdict.text} 均線只描述已發生的走勢，無法預測下一步。</p>
      </div>
    </>
  );
}
