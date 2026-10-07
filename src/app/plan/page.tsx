import type { Metadata } from "next";
import { PlanView } from "./PlanView";

export const metadata: Metadata = { title: "我的計畫" };

export default function PlanPage() {
  return (
    <>
      <h1>我的投資政策書</h1>
      <p className="lede">
        先把財務現況、目標和紀律寫下來。總覽和持股頁會依照這裡的規則檢查你的狀態，定期檢視時也是回來對照這一頁。所有資料只存在這台裝置的瀏覽器。
      </p>
      <PlanView />
    </>
  );
}
