import type { Metadata } from "next";
import { PortfolioView } from "./PortfolioView";

export const metadata: Metadata = { title: "我的持股" };

export default function PortfolioPage() {
  return (
    <>
      <h1>我的持股</h1>
      <p className="lede">
        記下持有的標的、數量和成本。工具會用最新收盤價算出市值，把 ETF 拆開來看你真正押在哪幾家公司，估算股利的稅費，並依投資政策書告訴你新資金該怎麼放。
      </p>
      <PortfolioView />
    </>
  );
}
