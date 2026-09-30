import type { Weights } from "@/lib/calc/simulate";

export type AssetClass = "stock" | "bond" | "cash";

export interface Holding {
  id: string;
  /** e.g. 0050, 00679B, VT; empty for plain cash */
  symbol: string;
  name: string;
  assetClass: AssetClass;
  /** shares/units held; for cash rows this is the TWD amount */
  quantity: number;
}

export interface Plan {
  target: Weights;
  riskAnswers: number[];
  age: number;
  initial: number;
  monthly: number;
  years: number;
}

export interface UserData {
  version: 1;
  plan: Plan;
  holdings: Holding[];
  watchlist: string[];
}

/**
 * 儲存層介面。目前實作是 localStorage；換成 Supabase 等資料庫時，只要實作同一個介面，
 * 頁面程式碼不需要改。
 */
export interface Store {
  load(): UserData;
  save(data: UserData): void;
  subscribe(fn: (data: UserData) => void): () => void;
}

export const DEFAULT_DATA: UserData = {
  version: 1,
  plan: { target: [60, 30, 10], riskAnswers: [2, 2, 1, 2, 2], age: 35, initial: 100000, monthly: 10000, years: 20 },
  holdings: [],
  watchlist: ["0050", "006208", "00679B", "VT"],
};
