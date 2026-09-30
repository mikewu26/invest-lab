import type { Metadata } from "next";
import { PlanView } from "./PlanView";

export const metadata: Metadata = { title: "資產配置" };

export default function PlanPage() {
  return (
    <>
      <h1>決定你的資產配置</h1>
      <p className="lede">
        先用五題問卷找出風險屬性，再調整股票、債券、現金的比例，看看長期試算和下跌時的可能情況。設定會存在這台裝置的瀏覽器裡，持股頁的再平衡也會用這個目標比例。
      </p>
      <PlanView />
    </>
  );
}
