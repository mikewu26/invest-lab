/**
 * 課程目錄。內文在 src/content/lessons/<slug>.mdx；新增一課只要加檔案並在這裡登記。
 * `personal: true` 代表內容是依你目前的狀況寫的（台積電為主、準備買房、尚未開複委託）。
 */
export interface Lesson {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  personal?: boolean;
}

export interface Module {
  id: string;
  title: string;
  goal: string;
  lessons: Lesson[];
}

export const MODULES: Module[] = [
  {
    id: "foundation",
    title: "財務地基",
    goal: "先決定錢的用途，再決定錢放哪裡。",
    lessons: [
      { slug: "three-buckets", title: "三個水桶：預備金、購屋金、長期投資", summary: "為什麼同一筆錢不能同時拿來買房又拿來投資", minutes: 8, personal: true },
      { slug: "beat-inflation", title: "打敗通膨與財務自由的真實算術", summary: "實質報酬、4% 法則、被動收入要多少本金", minutes: 10, personal: true },
      { slug: "house-vs-invest", title: "買房和投資怎麼一起規劃", summary: "頭期款放哪裡、房貸與投資的取捨、時間軸", minutes: 10, personal: true },
    ],
  },
  {
    id: "stocks",
    title: "股票：看懂一家公司",
    goal: "從「聽說會漲」進步到能說出一家公司值多少、為什麼。",
    lessons: [
      { slug: "business-and-moat", title: "商業模式與護城河", summary: "公司怎麼賺錢、別人為什麼搶不走", minutes: 9 },
      { slug: "financial-statements", title: "三大財報與關鍵指標", summary: "損益表、資產負債表、現金流量表該看哪幾行", minutes: 12 },
      { slug: "valuation", title: "估值：好公司不等於好價格", summary: "本益比、股價淨值比、PEG、殖利率、現金流折現", minutes: 12 },
      { slug: "case-tsmc", title: "案例：用台積電走一遍完整分析", summary: "用真實財報算本益比、推估隱含成長、列出風險", minutes: 15, personal: true },
      { slug: "schools", title: "投資流派：價值、成長、品質、股息、指數", summary: "每一派的假設、適用情境與失靈的時候", minutes: 12 },
      { slug: "dividend-and-financials", title: "高股息 ETF 與金融股", summary: "你持有的 00919 和永豐金是怎麼運作的", minutes: 10, personal: true },
    ],
  },
  {
    id: "bonds",
    title: "債券",
    goal: "知道債券在組合裡的角色，以及為什麼長天期債券不一定能保護你。",
    lessons: [
      { slug: "bond-basics", title: "債券基礎：殖利率、價格與存續期間", summary: "利率上升時債券為什麼會跌、跌多少", minutes: 11 },
      { slug: "bond-etfs", title: "債券 ETF 怎麼挑", summary: "短中長天期、公債與公司債、台灣與美國掛牌", minutes: 9, personal: true },
    ],
  },
  {
    id: "portfolio",
    title: "投資組合",
    goal: "從挑標的，進步到設計一個你能長期執行的組合。",
    lessons: [
      { slug: "diversification", title: "分散與相關性", summary: "為什麼加入波動大的資產，組合反而可能更穩", minutes: 9 },
      { slug: "rebalancing", title: "再平衡：定期還是看偏離", summary: "什麼時候調整、用新資金還是賣出", minutes: 7 },
      { slug: "core-satellite", title: "核心衛星：處理台積電的集中度", summary: "不賣出也能降低單一公司風險的方法", minutes: 10, personal: true },
    ],
  },
  {
    id: "taiwan",
    title: "台灣投資人的工具與稅費",
    goal: "把成本和稅降到合理，並擴充可用的投資工具。",
    lessons: [
      { slug: "taiwan-tax", title: "台灣股利稅費：合併、分開與二代健保", summary: "股利怎麼課稅比較省、補充保費怎麼避開", minutes: 9 },
      { slug: "more-tools", title: "擴充投資工具：複委託、海外券商與其他", summary: "要買全球 ETF 可以走哪幾條路、各自的成本", minutes: 10, personal: true },
    ],
  },
  {
    id: "behavior",
    title: "紀律與行為",
    goal: "最大的風險通常不是市場，而是自己在錯的時間做決定。",
    lessons: [
      { slug: "biases", title: "常見的投資偏誤與對策", summary: "處分效應、近因偏誤、後見之明，以及季度檢視流程", minutes: 9 },
    ],
  },
];

export const ALL_LESSONS = MODULES.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m })));

export function lessonIndex(slug: string) {
  return ALL_LESSONS.findIndex((l) => l.slug === slug);
}
