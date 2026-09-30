import type { Weights } from "./simulate";

export const RISK_QUESTIONS: { q: string; options: string[] }[] = [
  { q: "這筆錢多久內不會動用？", options: ["1 年內", "1–3 年", "3–7 年", "7 年以上"] },
  { q: "投資一年內跌了 20%，你會？", options: ["全部賣掉止損", "賣掉一部分", "不動，繼續持有", "趁低點加碼"] },
  { q: "你的投資經驗？", options: ["完全沒有", "只有存款或儲蓄險", "買過基金或 ETF", "多年股票經驗"] },
  { q: "你的收入穩定度？", options: ["不穩定", "普通", "穩定", "很穩定且有其他收入"] },
  { q: "你的緊急預備金？", options: ["沒有", "不到 3 個月", "3–6 個月", "超過 6 個月"] },
];

export type ProfileName = "保守" | "穩健" | "積極";

export const PROFILES: Record<ProfileName, { weights: Weights; desc: string }> = {
  保守: { weights: [30, 50, 20], desc: "重視本金穩定，能接受的跌幅較小。以債券和現金為主，預期長期報酬也較低。" },
  穩健: { weights: [60, 30, 10], desc: "願意承受中等波動換取成長。股債平衡，大跌時帳面可能下跌 20–30%。" },
  積極: { weights: [80, 15, 5], desc: "投資期間長、能忍受大幅波動。以股票為主，大跌時帳面可能下跌 35–45%。" },
};

/** answers: 0-based option index per question */
export function scoreRisk(answers: number[]) {
  const score = answers.reduce((s, a) => s + a + 1, 0);
  const profile: ProfileName = score <= 9 ? "保守" : score <= 14 ? "穩健" : "積極";
  const lowEmergencyFund = (answers[4] ?? 0) <= 1;
  return { score, max: RISK_QUESTIONS.length * 4, profile, lowEmergencyFund };
}

/** "110 − 年齡" 法則：股票比例，四捨五入到 5%，限制在 20–90%；其餘債 3 : 現金 1 */
export function ageRule(age: number): Weights {
  const s = Math.max(20, Math.min(90, Math.round((110 - age) / 5) * 5));
  const b = Math.round(((100 - s) * 0.75) / 5) * 5;
  return [s, b, 100 - s - b];
}
