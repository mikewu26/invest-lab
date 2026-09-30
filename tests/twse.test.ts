import { describe, expect, it } from "vitest";
import { parseStockDay, rocCompactToIso, rocToIso } from "@/lib/market/twse-parse";

describe("twse parsing", () => {
  it("converts ROC dates", () => {
    expect(rocToIso("115/09/01")).toBe("2026-09-01");
    expect(rocCompactToIso("1150924")).toBe("2026-09-24");
  });
  it("parses STOCK_DAY month", () => {
    const r = parseStockDay({
      stat: "OK",
      title: "115年09月 0050 元大台灣50           各日成交資訊",
      fields: ["日期", "成交股數", "成交金額", "開盤價", "最高價", "最低價", "收盤價", "漲跌價差", "成交筆數", "註記"],
      data: [
        ["115/09/01", "111,066,980", "12,012,866,945", "106.50", "108.70", "106.50", "108.45", "+2.20", "106,004", ""],
        ["115/09/02", "67,681,102", "7,244,048,852", "107.50", "107.85", "106.65", "--", "-1.65", "118,025", ""],
        ["115/09/03", "1", "1", "1", "1", "1", "1,106.80", "0", "1", ""],
      ],
    });
    expect(r.name).toBe("元大台灣50");
    expect(r.points).toEqual([
      { date: "2026-09-01", close: 108.45 },
      { date: "2026-09-03", close: 1106.8 },
    ]);
  });
  it("returns empty on no data", () => {
    expect(parseStockDay({ stat: "很抱歉，沒有符合條件的資料!" }).points).toEqual([]);
  });
});
