/**
 * ETF 成分股中「單一公司」的權重，用於穿透式集中度分析。
 * 只列出查證過、且對集中度影響大的權重；成分股每季調整，數字會過時。
 * 更新方式：到投信官網「持股權重」頁面查最新數字，改這裡並更新 asOf。
 */
export interface LookThrough {
  /** 公司代號 → 權重（0–1） */
  weights: Record<string, number>;
  asOf: string;
  source: string;
}

export const ETF_LOOK_THROUGH: Record<string, LookThrough> = {
  "0050": {
    weights: { "2330": 0.6 },
    asOf: "2026-06",
    source: "元大投信 0050 持股權重；2026/6 季調整後台積電約 6 成",
  },
  "006208": {
    weights: { "2330": 0.6 },
    asOf: "2026-06",
    source: "與 0050 追蹤同一指數（臺灣 50 指數），權重相近",
  },
};

export const COMPANY_NAMES: Record<string, string> = { "2330": "台積電" };
