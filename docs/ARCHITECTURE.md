# 架構與長期維護

## 定位

個人投資作業系統：**少做決定，但每個決定都想清楚**。

- 規則先於行情：先寫投資政策書，工具負責檢查是否偏離。
- 以季為單位：刻意不做即時報價首頁，避免盯盤。
- 每個數字都能解釋：檢查結果都連到解釋原因的課程。
- 資料可攜：使用者資料以 JSON 匯出入，儲存層可替換，不綁定單一服務。

## 分層

```
src/
  app/                 路由（頁面與 API route handlers），只做組裝與呈現
  components/          共用 UI（LineChart、CheckList、Field…）
  content/             內容即資料：課程目錄、MDX 課程、組合範例、ETF 穿透權重
    lessons/*.mdx      一課一檔；新增一課 = 加檔案 + 在 catalog.ts 登記
  lib/
    calc/              純函式，無 I/O，全部有單元測試
      policy.ts        三個水桶、投資政策書規則檢查
      portfolio.ts     市值、損益、ETF 穿透、集中度試算
      dividends.ts     股利、二代健保、合併／分開計稅（稅制數字集中在 TAX_RULES）
      simulate.ts      蒙地卡羅試算
      rebalance.ts     再平衡
    market/            行情資料源（證交所、Yahoo），唯一入口 index.ts
    storage/           使用者資料：型別、版本遷移、Store 介面與 localStorage 實作
tests/                 vitest
```

依賴方向：`app → components → lib/calc, lib/storage, content`；`lib/calc` 不依賴 React、不做網路請求。

## 資料模型與版本

`UserData`（`src/lib/storage/types.ts`）帶 `version`。格式改變時：

1. 提高版本號，更新型別與 `DEFAULT_DATA`。
2. 在 `migrate.ts` 加上舊版轉新版的邏輯與測試。
3. 匯入備份與讀取 localStorage 都經過 `migrate()`，舊資料不會壞掉。

個人財務資料**不進 repo**（repo 是公開的）。個人設定以匯出的 JSON 保存。

## 後端擴充計畫

目前全部資料在瀏覽器。以下功能需要伺服器端儲存，屆時再加：

| 功能 | 為什麼需要後端 |
| --- | --- |
| 季度快照與淨值曲線 | 歷史紀錄要跨裝置保存 |
| 決策日誌 | 同上，且需要長期回顧 |
| 定期提醒（季度檢視） | 需要排程與通知 |
| 自動抓配息、月營收、財報 | 排程抓取並快取，避免每次即時打外部 API |

### 選型原則

- **資料庫用標準 Postgres**，透過 Drizzle ORM（SQL 為主、型別安全、可產生 migration）。任何託管服務（Neon、Supabase、自架）都能換，不鎖定特定平台。
- **儲存層維持 `Store` 介面**：新增 `PostgresStore`（經由 route handlers / server actions），頁面程式碼不改。localStorage 版本保留作為離線與未登入模式。
- **認證**：單人使用時，最簡單是一組環境變數密碼＋簽章 cookie；之後需要多人再換 Auth.js。
- **排程**：Vercel Cron 呼叫 route handler（季度提醒、抓配息與月營收）。
- **匯出入格式不變**：JSON 備份仍是唯一的可攜格式，資料庫只是它的另一個存放處。

### 建議資料表（草案）

```
snapshots(id, taken_at, data jsonb)          -- 每次季度檢視存一份完整 UserData
journal(id, created_at, symbol, action, amount, thesis, invalidation, review_at, outcome)
dividends(symbol, ex_date, pay_date, cash_per_share, stock_per_share)  -- 排程抓取
```

## 內容維護

- 課程中的財報、權重、稅制數字都標註了時間點；每季檢視時順手更新：
  - `content/etf-holdings.ts`：ETF 穿透權重與 `asOf`
  - `lib/calc/dividends.ts`：`TAX_RULES`
  - `content/lessons/case-tsmc.mdx`：最新一季財報
- 課程不放個人數字；個人狀況由工具即時計算。
