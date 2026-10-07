# 投資工作台（invest-lab）

個人投資作業系統：投資政策書、持股穿透分析、季度檢視與完整課程。定位與架構見 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 功能

| 頁面 | 內容 |
| --- | --- |
| `/` 總覽 | 三個水桶（預備金、購屋、長期投資）、依投資政策書的規則檢查、季度檢視清單、下一課 |
| `/plan` 計畫 | 財務現況、購屋目標、投資紀律（單一公司上限、再平衡區間、自訂規則）、目標配置、長期試算與財務自由線 |
| `/portfolio` 持股 | 成本與損益、ETF 穿透的單一公司曝險、不賣出降低集中度的試算、股利與二代健保、合併／分開計稅比較、再平衡 |
| `/learn` 學習 | 6 個模組 17 課（MDX）、投資組合範例庫（可套用為目標）、小測驗 |
| `/trend` 趨勢 | 台股／美股歷史價格、報酬、波動、最大回撤、均線 |

## 開始

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 計算與資料解析的單元測試
npm run build
```

不需要任何 API 金鑰或環境變數。部署到 Vercel：匯入 repo 即可。

## 資料來源

所有行情都經過 `src/lib/market/index.ts`，頁面與 API 不直接呼叫資料源。

- **臺灣證券交易所**（官方、免費）：`STOCK_DAY` 個股月資料、OpenAPI `STOCK_DAY_ALL` 當日全市場收盤（用於搜尋與報價）。只含上市股票與 ETF。證交所有頻率限制，程式同時最多 3 個請求；過去月份快取 30 天、當月 30 分鐘。
- **Yahoo Finance chart API**（非官方）：美股、海外 ETF、匯率，以及上櫃股票（`.TWO`）。可能變動或限流，只當備援，集中在 `yahoo.ts`，要換成付費資料源只改這一個檔案。

路由規則：台股數字代號 → 證交所 → Yahoo `.TWO` → Yahoo `.TW`；其他代號 → Yahoo。

API：

- `GET /api/history?symbol=0050&range=6m|1y|2y`
- `GET /api/quote?symbols=0050,VT`（含 `fxToTwd`）
- `GET /api/search?q=台積`

## 資料儲存

財務現況、投資政策書、持股、課程進度存在瀏覽器 `localStorage`（`src/lib/storage/local.ts`），可在持股頁匯出／匯入 JSON。
儲存層是 `Store` 介面（`src/lib/storage/types.ts`），之後要改用 Supabase 等資料庫，只需新增一個實作並替換 `useUserData.ts` 裡的 `store`。

## 結構

```
src/
  app/            頁面與 API route handlers
  components/     LineChart（canvas，支援深色模式與游標數值）、SymbolSearch 等
  content/        學習內容
  lib/calc/       純計算：trend、simulate、rebalance、risk
  lib/market/     行情資料源與路由
  lib/storage/    儲存層介面與 localStorage 實作
tests/            vitest
```

## 免責

本工具用於學習與試算，不構成投資建議。
