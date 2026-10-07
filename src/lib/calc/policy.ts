import { COMPANY_NAMES } from "@/content/etf-holdings";
import type { UserData } from "@/lib/storage/types";
import { CLASS_LABEL, CLASS_ORDER, exposures, monthsToCap, type ValuedHolding } from "./portfolio";

export type CheckStatus = "ok" | "warn" | "bad" | "todo";

export interface Check {
  id: string;
  status: CheckStatus;
  title: string;
  detail: string;
  /** link to the lesson that explains why */
  lesson?: string;
}

export interface Buckets {
  emergencyNeed: number;
  emergencyHave: number;
  houseHave: number;
  houseNeed: number;
  /** months until the house date; null when not set */
  houseMonths: number | null;
  /** monthly saving needed to hit the house target on time */
  houseMonthly: number | null;
  /** cash left after emergency + house */
  spareCash: number;
}

export function monthsUntil(yyyymm: string, now = new Date()): number | null {
  const m = yyyymm.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return (Number(m[1]) - now.getFullYear()) * 12 + (Number(m[2]) - 1 - now.getMonth());
}

/** 現金依序裝進：緊急預備金 → 購屋基金 → 剩餘。 */
export function buckets(d: UserData, now = new Date()): Buckets {
  const emergencyNeed = d.finances.monthlyExpense * d.policy.emergencyMonths;
  const emergencyHave = Math.min(d.finances.cash, emergencyNeed);
  const afterEmergency = d.finances.cash - emergencyHave;
  const houseNeed = d.house.enabled ? d.house.target : 0;
  const houseHave = Math.min(afterEmergency, houseNeed);
  const houseMonths = d.house.enabled ? monthsUntil(d.house.targetDate, now) : null;
  const gap = houseNeed - houseHave;
  const houseMonthly = houseMonths != null && houseMonths > 0 ? Math.max(0, gap) / houseMonths : null;
  return { emergencyNeed, emergencyHave, houseHave, houseNeed, houseMonths, houseMonthly, spareCash: afterEmergency - houseHave };
}

const fmt = (v: number) => (Math.abs(v) >= 1e4 ? `${(v / 1e4).toFixed(1)} 萬` : `${Math.round(v).toLocaleString()} 元`);

/** 依投資政策書檢查目前狀態。全部是純函式，方便測試。 */
export function runChecks(d: UserData, rows: ValuedHolding[], now = new Date()): Check[] {
  const out: Check[] = [];
  const b = buckets(d, now);
  const invested = rows.reduce((s, r) => s + (r.value ?? 0), 0);

  // 1. 緊急預備金
  if (!d.finances.monthlyExpense) {
    out.push({ id: "emergency", status: "todo", title: "緊急預備金", detail: "填入每月生活支出，才能算出需要多少預備金。", lesson: "three-buckets" });
  } else if (b.emergencyHave < b.emergencyNeed) {
    out.push({ id: "emergency", status: "bad", title: "緊急預備金不足", detail: `需要 ${fmt(b.emergencyNeed)}（${d.policy.emergencyMonths} 個月），目前只有 ${fmt(b.emergencyHave)}。先補足再加碼投資。`, lesson: "three-buckets" });
  } else {
    out.push({ id: "emergency", status: "ok", title: "緊急預備金足夠", detail: `${d.policy.emergencyMonths} 個月生活費 ${fmt(b.emergencyNeed)} 已備妥。`, lesson: "three-buckets" });
  }

  // 2. 購屋基金
  if (d.house.enabled) {
    if (!d.house.target || b.houseMonths == null) {
      out.push({ id: "house", status: "todo", title: "購屋目標", detail: "填入預算與預計時間，才能判斷這筆錢該放哪裡。", lesson: "house-vs-invest" });
    } else if (b.houseMonths <= 0) {
      out.push({ id: "house", status: b.houseHave >= b.houseNeed ? "ok" : "bad", title: "購屋時間已到", detail: `目標 ${fmt(b.houseNeed)}，現金可用 ${fmt(b.houseHave)}。`, lesson: "house-vs-invest" });
    } else {
      const short = b.houseHave < b.houseNeed;
      const near = b.houseMonths <= 36;
      out.push({
        id: "house",
        status: short ? (near ? "warn" : "ok") : "ok",
        title: short ? "購屋基金還有缺口" : "購屋基金已用現金備妥",
        detail: short
          ? `還差 ${fmt(b.houseNeed - b.houseHave)}，距離目標 ${b.houseMonths} 個月，每月需存 ${fmt(b.houseMonthly ?? 0)}。${near ? "三年內要用的錢，建議以現金或短債準備，不要靠股票報酬補缺口。" : ""}`
          : `距離目標 ${b.houseMonths} 個月。這筆錢放在現金或短天期債券，不要拿去買股票。`,
        lesson: "house-vs-invest",
      });
    }
  }

  // 3. 單一公司集中度
  const cap = d.policy.singleStockCap / 100;
  const top = exposures(rows)[0];
  if (top && invested > 0) {
    const name = COMPANY_NAMES[top.company] ?? rows.find((r) => r.holding.symbol === top.company)?.holding.name ?? top.company;
    if (top.share > cap) {
      const sameNow = d.holdings.some((h) => h.symbol === top.company) ? d.policy.monthlyContribution : 0;
      const keep = monthsToCap(top.total, invested, cap, sameNow, 0);
      const redirect = monthsToCap(top.total, invested, cap, 0, d.policy.monthlyContribution);
      out.push({
        id: "concentration",
        status: "warn",
        title: `${name} 占投資組合 ${Math.round(top.share * 100)}%`,
        detail:
          `超過你設定的上限 ${d.policy.singleStockCap}%。` +
          (redirect != null ? `若每月 ${fmt(d.policy.monthlyContribution)} 全部改買其他標的，約 ${redirect} 個月（價格不變的假設下）回到上限內，不需要賣出。` : "") +
          (sameNow && keep == null ? "維持現在全部買同一檔，比例不會下降。" : ""),
        lesson: "core-satellite",
      });
    } else {
      out.push({ id: "concentration", status: "ok", title: "單一公司集中度在上限內", detail: `最大的是 ${name}，占 ${Math.round(top.share * 100)}%（上限 ${d.policy.singleStockCap}%）。`, lesson: "core-satellite" });
    }
  }

  // 4. 配置偏離
  if (invested > 0) {
    const totals = CLASS_ORDER.map((c) => rows.filter((r) => r.holding.assetClass === c).reduce((s, r) => s + (r.value ?? 0), 0));
    const devs = totals.map((t, i) => t / invested - d.policy.target[i] / 100);
    const worst = devs.reduce((wi, v, i) => (Math.abs(v) > Math.abs(devs[wi]) ? i : wi), 0);
    const pp = Math.round(Math.abs(devs[worst]) * 100);
    out.push({
      id: "drift",
      status: pp > d.policy.rebalanceBand ? "warn" : "ok",
      title: pp > d.policy.rebalanceBand ? `${CLASS_LABEL[CLASS_ORDER[worst]]}偏離目標 ${pp} 個百分點` : "配置在再平衡區間內",
      detail:
        pp > d.policy.rebalanceBand
          ? `目標 ${d.policy.target[worst]}%，目前 ${Math.round((totals[worst] / invested) * 100)}%，超過 ±${d.policy.rebalanceBand} 的區間。到持股頁看新資金該怎麼分配。`
          : `所有類別都在目標 ±${d.policy.rebalanceBand} 個百分點以內，照計畫投入即可。`,
      lesson: "rebalancing",
    });
  }

  // 5. 定期檢視
  const last = d.policy.lastReviewed ? new Date(d.policy.lastReviewed) : null;
  const due = last ? new Date(last.getFullYear(), last.getMonth() + d.policy.reviewEveryMonths, last.getDate()) : null;
  if (!last) out.push({ id: "review", status: "todo", title: "還沒做過檢視", detail: "完成第一次季度檢視後，這裡會提醒你下一次的時間。" });
  else if (due && due < now) out.push({ id: "review", status: "warn", title: "該做季度檢視了", detail: `上次是 ${d.policy.lastReviewed}，每 ${d.policy.reviewEveryMonths} 個月一次。` });
  else out.push({ id: "review", status: "ok", title: "檢視進度正常", detail: `上次 ${d.policy.lastReviewed}，下次約 ${due!.toISOString().slice(0, 10)}。` });

  return out;
}

/** 財務自由數字：年支出 × 25（對應 4% 提領率）。 */
export function fiNumber(monthlyExpense: number, withdrawalRate = 0.04) {
  return (monthlyExpense * 12) / withdrawalRate;
}
