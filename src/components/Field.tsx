"use client";
import { useId } from "react";

/** 數字輸入：空白視為 0，負數一律擋掉。 */
export function NumberField({ label, value, onChange, step = 1000, suffix, hint, min = 0, max }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  hint?: string;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <label className="f" htmlFor={id}>
      <span>{label}{suffix && <span className="muted">（{suffix}）</span>}</span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(Number.isFinite(v) ? Math.max(min, max != null ? Math.min(max, v) : v) : 0);
        }}
      />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}
