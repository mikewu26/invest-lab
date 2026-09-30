import type { Metadata } from "next";
import { PortfolioView } from "./PortfolioView";

export const metadata: Metadata = { title: "我的持股" };

export default function PortfolioPage() {
  return (
    <>
      <h1>我的持股</h1>
      <p className="lede">
        記下你持有的標的與數量，工具會用最新收盤價算出市值與目前配置，再告訴你新資金該買哪一類、買多少，才能回到目標比例。資料只存在這台裝置，可以匯出備份。
      </p>
      <PortfolioView />
    </>
  );
}
