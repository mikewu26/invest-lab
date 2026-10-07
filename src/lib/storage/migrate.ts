import { DEFAULT_DATA, type UserData } from "./types";

/** v1（第一版）資料格式，只用於遷移。 */
interface V1 {
  version: 1;
  plan: { target: UserData["policy"]["target"]; riskAnswers: number[]; age: number; initial: number; monthly: number; years: number };
  holdings: UserData["holdings"];
  watchlist: string[];
}

/** 把任何版本、可能缺欄位的資料補成最新格式。無法辨識時回傳預設值。 */
export function migrate(raw: unknown): UserData {
  if (!raw || typeof raw !== "object") return DEFAULT_DATA;
  const r = raw as Partial<UserData> & Partial<V1> & { version?: number };
  if (r.version === 1 && r.plan) {
    const p = r.plan;
    return {
      ...DEFAULT_DATA,
      policy: { ...DEFAULT_DATA.policy, target: p.target, monthlyContribution: p.monthly },
      riskAnswers: p.riskAnswers,
      age: p.age,
      sim: { initial: p.initial, monthly: p.monthly, years: p.years },
      holdings: r.holdings ?? [],
      watchlist: r.watchlist ?? DEFAULT_DATA.watchlist,
    };
  }
  if (r.version === 2) {
    return {
      ...DEFAULT_DATA,
      ...r,
      version: 2,
      finances: { ...DEFAULT_DATA.finances, ...r.finances },
      house: { ...DEFAULT_DATA.house, ...r.house },
      policy: { ...DEFAULT_DATA.policy, ...r.policy },
      sim: { ...DEFAULT_DATA.sim, ...r.sim },
      holdings: r.holdings ?? [],
      watchlist: r.watchlist ?? DEFAULT_DATA.watchlist,
      lessonsDone: r.lessonsDone ?? [],
    } as UserData;
  }
  return DEFAULT_DATA;
}
