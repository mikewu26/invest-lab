"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Series {
  data: (number | null)[];
  /** CSS token name without the leading dashes, e.g. "accent" */
  color: string;
  width?: number;
  dash?: number[];
  area?: boolean;
  dot?: boolean;
  label?: string;
}

export interface LineChartProps {
  series: Series[];
  band?: { lo: number[]; hi: number[]; color: string };
  xLabels: string[];
  /** how many x labels to show */
  xTickCount?: number;
  yFormat: (v: number) => string;
  tipFormat?: (v: number) => string;
  yMin?: number;
  yMax?: number;
  yTicks?: number;
  small?: boolean;
  ariaLabel: string;
}

function niceStep(range: number, count: number) {
  const raw = range / count;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}

const PAD = { l: 58, r: 14, t: 10, b: 24 };

export function LineChart(props: LineChartProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setThemeTick((t) => t + 1);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const draw = useCallback(() => {
    const cv = ref.current;
    if (!cv) return;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!w) return;
    const cs = getComputedStyle(document.documentElement);
    const tok = (n: string) => cs.getPropertyValue("--" + n).trim();
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const g = cv.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const { series, band, xLabels } = props;
    const n = xLabels.length;
    let lo = Infinity;
    let hi = -Infinity;
    const scan = (a: (number | null)[]) =>
      a.forEach((v) => {
        if (v != null && Number.isFinite(v)) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      });
    series.forEach((s) => scan(s.data));
    if (band) {
      scan(band.lo);
      scan(band.hi);
    }
    if (!Number.isFinite(lo)) return;
    if (props.yMin != null) lo = Math.min(lo, props.yMin);
    if (props.yMax != null) hi = props.yMax;
    if (hi === lo) {
      hi += 1;
      lo -= 1;
    }
    const step = niceStep(hi - lo, props.yTicks ?? 4);
    lo = props.yMin === 0 ? 0 : Math.floor(lo / step) * step;
    hi = props.yMax != null ? props.yMax : Math.ceil(hi / step) * step;

    const X = (i: number) => PAD.l + (n <= 1 ? 0 : i / (n - 1)) * (w - PAD.l - PAD.r);
    const Y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (h - PAD.t - PAD.b);

    g.font = `11px ${tok("mono")}`;
    g.textBaseline = "middle";
    g.textAlign = "right";
    for (let v = lo; v <= hi + step * 1e-6; v += step) {
      const y = Math.round(Y(v)) + 0.5;
      g.strokeStyle = tok("line");
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(PAD.l, y);
      g.lineTo(w - PAD.r, y);
      g.stroke();
      g.fillStyle = tok("muted");
      g.fillText(props.yFormat(v), PAD.l - 8, y);
    }

    const tc = props.xTickCount ?? 5;
    if (tc > 0 && n > 1) {
      g.textAlign = "center";
      g.textBaseline = "top";
      const idx = new Set<number>();
      for (let k = 0; k < tc; k++) idx.add(Math.round((k / (tc - 1)) * (n - 1)));
      idx.forEach((i) => {
        const x = Math.max(PAD.l + 22, Math.min(w - PAD.r - 22, X(i)));
        g.fillStyle = tok("muted");
        g.fillText(xLabels[i], x, h - PAD.b + 7);
      });
    }

    if (band) {
      g.beginPath();
      band.hi.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))));
      for (let i = n - 1; i >= 0; i--) g.lineTo(X(i), Y(band.lo[i]));
      g.closePath();
      g.globalAlpha = 0.2;
      g.fillStyle = tok(band.color);
      g.fill();
      g.globalAlpha = 1;
    }

    const trace = (data: (number | null)[]) => {
      g.beginPath();
      let started = false;
      data.forEach((v, i) => {
        if (v == null) return;
        if (started) g.lineTo(X(i), Y(v));
        else {
          g.moveTo(X(i), Y(v));
          started = true;
        }
      });
    };

    series.forEach((s) => {
      if (s.area) {
        trace(s.data);
        const base = Y(Math.min(hi, Math.max(lo, 0)));
        const first = s.data.findIndex((v) => v != null);
        g.lineTo(X(n - 1), base);
        g.lineTo(X(first), base);
        g.closePath();
        g.globalAlpha = 0.22;
        g.fillStyle = tok(s.color);
        g.fill();
        g.globalAlpha = 1;
      }
      trace(s.data);
      g.strokeStyle = tok(s.color);
      g.lineWidth = s.width ?? 1.6;
      g.setLineDash(s.dash ?? []);
      g.lineJoin = "round";
      g.stroke();
      g.setLineDash([]);
      const last = s.data[n - 1];
      if (s.dot && last != null) {
        g.beginPath();
        g.arc(X(n - 1), Y(last), 4, 0, Math.PI * 2);
        g.fillStyle = tok(s.color);
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = tok("surface");
        g.stroke();
      }
    });

    if (hover != null && hover < n) {
      const x = Math.round(X(hover)) + 0.5;
      g.strokeStyle = tok("muted");
      g.lineWidth = 1;
      g.setLineDash([3, 3]);
      g.beginPath();
      g.moveTo(x, PAD.t);
      g.lineTo(x, h - PAD.b);
      g.stroke();
      g.setLineDash([]);
      series.forEach((s) => {
        const v = s.data[hover];
        if (v == null) return;
        g.beginPath();
        g.arc(x, Y(v), 3, 0, Math.PI * 2);
        g.fillStyle = tok(s.color);
        g.fill();
      });
    }
    // themeTick forces a redraw when the colour scheme flips
    void themeTick;
  }, [props, hover, themeTick]);

  useEffect(() => {
    draw();
    const cv = ref.current;
    if (!cv) return;
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [draw]);

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const n = props.xLabels.length;
    const f = (e.clientX - r.left - PAD.l) / (r.width - PAD.l - PAD.r);
    setHover(f < 0 || f > 1 ? null : Math.round(f * (n - 1)));
  };

  const fmt = props.tipFormat ?? props.yFormat;
  const tip =
    hover != null
      ? [props.xLabels[hover], ...props.series.filter((s) => s.label && s.data[hover] != null).map((s) => `${s.label} ${fmt(s.data[hover]!)}`)].join(" · ")
      : null;

  return (
    <div className="chart-box">
      <canvas
        ref={ref}
        className={props.small ? "chart sm" : "chart"}
        role="img"
        aria-label={props.ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      />
      {tip && <div className="tip">{tip}</div>}
    </div>
  );
}
