import type { Weights } from "@/lib/calc/simulate";

export interface Template {
  id: string;
  name: string;
  origin: string;
  /** 組成（文字） */
  mix: { label: string; weight: number }[];
  /** 對應到本工具的股、債、現金三類；有黃金等其他資產時為 null */
  weights: Weights | null;
  logic: string;
  good: string;
  bad: string;
  history: string;
  /** 不開複委託、只用台灣掛牌 ETF 的近似做法 */
  taiwan: string;
  fit: string;
  forYou?: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "core-satellite",
    name: "核心衛星",
    origin: "機構與個人投資者都常用的架構",
    mix: [
      { label: "核心：廣泛型指數 ETF＋債券", weight: 70 },
      { label: "衛星：看好的個股或主題", weight: 30 },
    ],
    weights: [80, 15, 5],
    logic: "大部分資金放在低成本、極度分散的核心，賺市場平均報酬；一小部分放你有研究、有信心的個股。衛星部位賺賠都不會左右整個計畫。",
    good: "保留選股的樂趣與學習，又有上限保護；規則清楚，容易執行。",
    bad: "衛星部位常被「越賺越多」撐大，必須定期檢查比例。",
    history: "沒有固定歷史數字，結果取決於核心比例與衛星選股。",
    taiwan: "核心：006208（台灣 50）＋00646（S&P 500）＋00697B（美債 7–10 年）；衛星：2330 等個股。",
    fit: "已經有重押的個股、不想賣，但想慢慢分散的人。",
    forYou: "最貼近你現況的架構：台積電轉為衛星，新資金優先補核心，直到台積電回到你設定的上限內。",
  },
  {
    id: "sixty-forty",
    name: "股六債四（60/40）",
    origin: "美國退休金與平衡型基金的經典基準",
    mix: [
      { label: "股票", weight: 60 },
      { label: "投資等級債券", weight: 40 },
    ],
    weights: [60, 40, 0],
    logic: "股票提供成長，債券在股市重挫時通常較穩，兩者搭配降低整體波動。",
    good: "簡單、歷史紀錄最長，波動大約是全股票組合的六成。",
    bad: "股債同時下跌的年份（例如 2022 年通膨升息）保護會失效。",
    history: "美國 60/40 在 2008 年約跌兩成，同期美股跌逾三成；2022 年股債雙殺，約跌 16–17%。",
    taiwan: "股：006208＋00646 各半；債：00697B 或 00719B（美債 1–3 年）。",
    fit: "想要中等波動、願意接受較低報酬換取睡得好的人。",
  },
  {
    id: "three-fund",
    name: "三基金組合",
    origin: "Bogleheads（指數投資之父 John Bogle 的追隨者）",
    mix: [
      { label: "本國股票市場", weight: 40 },
      { label: "國際股票市場", weight: 30 },
      { label: "債券市場", weight: 30 },
    ],
    weights: [70, 30, 0],
    logic: "用三檔最廣泛的指數基金覆蓋全世界的股票與債券，比例依年齡與風險調整。",
    good: "極度分散、成本極低、幾乎不需要判斷。",
    bad: "本國股比重是主觀選擇；台灣股市集中在少數科技股，「本國」部位本身就不夠分散。",
    history: "長期報酬接近全球市場平均，波動依股債比例而定。",
    taiwan: "本國：006208；國際：00646（只有美國，不是全球）；債：00697B。開了複委託後可改用 VT＋BND。",
    fit: "想要最省心、認同「買下整個市場」的人。",
  },
  {
    id: "permanent",
    name: "永久組合",
    origin: "Harry Browne，1980 年代",
    mix: [
      { label: "股票", weight: 25 },
      { label: "長期公債", weight: 25 },
      { label: "黃金", weight: 25 },
      { label: "現金／短債", weight: 25 },
    ],
    weights: null,
    logic: "經濟只有四種狀態：繁榮、通膨、通縮、衰退，每種狀態各有一種資產表現好，所以四種各放四分之一。",
    good: "極端事件下回撤小，心理壓力低。",
    bad: "長期報酬明顯低於股票為主的組合，在股市長期上漲時會落後很多。",
    history: "美國版在 2008 年只小跌幾個百分點；但長期年化報酬比 60/40 低。",
    taiwan: "股：006208；長債：00679B；黃金：00635U（期元大 S&P 黃金）；現金：活存或 00719B。",
    fit: "非常在意回撤、接受用報酬換穩定的人。",
  },
  {
    id: "all-weather",
    name: "全天候（簡化版）",
    origin: "Ray Dalio／橋水基金的概念，坊間流傳的簡化版",
    mix: [
      { label: "股票", weight: 30 },
      { label: "長期公債", weight: 40 },
      { label: "中期公債", weight: 15 },
      { label: "黃金", weight: 7.5 },
      { label: "原物料", weight: 7.5 },
    ],
    weights: null,
    logic: "依「風險」而不是金額分配：債券波動小，所以放比較多，讓每種資產對組合的風險貢獻接近。",
    good: "在多數環境下都不會太差。",
    bad: "重押長債，在利率快速上升時會很慘；原版靠槓桿，簡化版沒有，報酬偏低。",
    history: "2022 年因長債大跌，簡化版跌幅約兩成，比 60/40 還多。",
    taiwan: "可行但標的多、管理麻煩，不建議新手照抄。",
    fit: "想理解「風險平價」概念的人；作為學習案例比實際使用更有價值。",
  },
  {
    id: "income",
    name: "股息收入型",
    origin: "台灣投資人非常流行的做法",
    mix: [
      { label: "高股息 ETF", weight: 50 },
      { label: "金融股或特別股", weight: 20 },
      { label: "投資等級債券", weight: 30 },
    ],
    weights: [70, 30, 0],
    logic: "以每月或每季的現金流為目標，讓被動收入看得見。",
    good: "現金流穩定、心理上容易持有。",
    bad: "配息不是額外的錢，而是從淨值拿出來；選股偏向成熟產業，長期總報酬常落後市值型；股利有稅與二代健保。",
    history: "多數台灣高股息 ETF 成立時間短，歷史不足以判斷長期表現。",
    taiwan: "00919、0056、00878 等；債：00720B（投資等級公司債）。",
    fit: "已經接近退休、需要現金流的人。",
    forYou: "你的目標包含「穩定被動收入」，但在累積期（還在工作、每月投入），總報酬比配息重要。被動收入可以等接近財務自由時再把組合轉向配息。",
  },
];
