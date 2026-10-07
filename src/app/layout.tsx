import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "投資工作台", template: "%s · 投資工作台" },
  description: "個人投資政策書、持股穿透分析、季度檢視與投資課程。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600;900&family=Noto+Sans+TC:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <header className="site">
          <div className="head-in">
            <Link className="brand" href="/">
              <b>投資工作台</b>
              <small>少做決定，但每個決定都想清楚</small>
            </Link>
            <Nav />
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site">
          本工具用於學習與試算，不構成投資建議。行情來自臺灣證券交易所公開資料與 Yahoo Finance，可能延遲或有誤。模擬結果基於假設的報酬與波動，實際市場可能更好或更差。
        </footer>
      </body>
    </html>
  );
}
