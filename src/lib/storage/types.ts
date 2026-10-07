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
  /** total amount paid, TWD (optional) */
  cost?: number;
  /** cash dividend per share per year in the quote currency (optional, user-entered) */
  dividendPerShare?: number;
  /** dividend payments per year: 1, 2, 4 or 12 */
  paymentsPerYear?: number;
}

/** 個人財務現況：這些數字決定三個水桶怎麼分。 */
export interface Finances {
  /** 活存、定存等隨時可動用的現金（不含投資帳戶裡的現金） */
  cash: number;
  /** 每月生活支出；0 代表尚未填寫 */
  monthlyExpense: number;
  /** 年度可支配所得（稅後） */
  annualTakeHome: number;
  /** 綜所稅邊際稅率，0.05 / 0.12 / 0.2 / 0.3 / 0.4 */
  marginalTaxRate: number;
}

export interface HouseGoal {
  enabled: boolean;
  /** 預計準備的頭期款＋裝潢＋交易成本 */
  target: number;
  /** YYYY-MM；空字串代表尚未決定 */
  targetDate: string;
}

/** 投資政策書（Investment Policy Statement）：事先寫好的規則。 */
export interface Policy {
  /** 緊急預備金要幾個月生活費 */
  emergencyMonths: number;
  /** 每月投入長期投資的金額 */
  monthlyContribution: number;
  /** 長期投資組合的目標比例（股、債、現金） */
  target: Weights;
  /** 單一公司（含 ETF 穿透）占長期投資組合的上限，0–100 */
  singleStockCap: number;
  /** 任一類資產偏離目標超過幾個百分點就再平衡 */
  rebalanceBand: number;
  /** 幾個月檢視一次 */
  reviewEveryMonths: number;
  /** ISO 日期 */
  lastReviewed: string;
  /** 自己寫的紀律規則 */
  rules: string[];
}

export interface Simulation {
  initial: number;
  monthly: number;
  years: number;
}

export interface UserData {
  version: 2;
  finances: Finances;
  house: HouseGoal;
  policy: Policy;
  riskAnswers: number[];
  age: number;
  sim: Simulation;
  holdings: Holding[];
  watchlist: string[];
  /** 已讀完的課程 slug */
  lessonsDone: string[];
}

/**
 * 儲存層介面。目前實作是 localStorage；換成資料庫時只要實作同一個介面，
 * 頁面程式碼不需要改。見 docs/ARCHITECTURE.md。
 */
export interface Store {
  load(): UserData;
  save(data: UserData): void;
  subscribe(fn: (data: UserData) => void): () => void;
}

export const DEFAULT_RULES = [
  "不因為新聞或單日漲跌買賣，只在季度檢視時調整。",
  "要降低某一檔的比例時，優先調整未來的投入金額，而不是賣出。",
  "三年內要用的錢不放股票。",
  "買進任何新標的前，先在決策日誌寫下理由，以及什麼情況代表我錯了。",
];

export const DEFAULT_DATA: UserData = {
  version: 2,
  finances: { cash: 0, monthlyExpense: 0, annualTakeHome: 0, marginalTaxRate: 0.12 },
  house: { enabled: false, target: 0, targetDate: "" },
  policy: {
    emergencyMonths: 6,
    monthlyContribution: 10000,
    target: [70, 20, 10],
    singleStockCap: 30,
    rebalanceBand: 5,
    reviewEveryMonths: 3,
    lastReviewed: "",
    rules: DEFAULT_RULES,
  },
  riskAnswers: [2, 2, 1, 2, 2],
  age: 35,
  sim: { initial: 100000, monthly: 10000, years: 20 },
  holdings: [],
  watchlist: ["0050", "006208", "2330", "VT"],
  lessonsDone: [],
};
