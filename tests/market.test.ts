import { afterEach, describe, expect, it, vi } from "vitest";
import { getHistory } from "@/lib/market";

afterEach(() => vi.unstubAllGlobals());

function month(d: string, close: string) {
  return {
    stat: "OK",
    title: "115年09月 0050 元大台灣50           各日成交資訊",
    fields: ["日期", "成交股數", "成交金額", "開盤價", "最高價", "最低價", "收盤價", "漲跌價差", "成交筆數", "註記"],
    data: [[d, "1", "1", "1", "1", "1", close, "0", "1", ""]],
  };
}

describe("getHistory routing", () => {
  it("uses TWSE for Taiwan codes and keeps months in order", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      const date = new URL(url).searchParams.get("date")!; // YYYYMM01
      const roc = `${Number(date.slice(0, 4)) - 1911}/${date.slice(4, 6)}/15`;
      return new Response(JSON.stringify(month(roc, String(100 + Number(date.slice(4, 6))))));
    }));
    const s = await getHistory("0050", "6m");
    expect(s.source).toBe("twse");
    expect(s.name).toBe("元大台灣50");
    expect(calls).toHaveLength(6);
    expect(s.points.map((p) => p.date)).toEqual([...s.points.map((p) => p.date)].sort());
  });

  it("falls back to Yahoo .TWO when TWSE has nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("twse")) return new Response(JSON.stringify({ stat: "很抱歉，沒有符合條件的資料!" }));
      if (url.includes("6488.TWO"))
        return new Response(JSON.stringify({ chart: { result: [{ meta: { symbol: "6488.TWO", currency: "TWD", shortName: "GlobalWafers" }, timestamp: [1790000000, 1790086400], indicators: { quote: [{ close: [500, null] }] } }] } }));
      return new Response("", { status: 404 });
    }));
    const s = await getHistory("6488", "6m");
    expect(s.source).toBe("yahoo");
    expect(s.symbol).toBe("6488");
    expect(s.points).toHaveLength(1);
  });

  it("uses Yahoo for non-Taiwan tickers and reports not found", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    await expect(getHistory("ZZZZ", "1y")).rejects.toThrow("找不到 ZZZZ");
  });
});
