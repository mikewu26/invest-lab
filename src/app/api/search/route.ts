import { search } from "@/lib/market";
import { toError } from "@/lib/api";

/** GET /api/search?q=台積 — 搜尋上市股票與 ETF（證交所清單） */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return Response.json({ results: await search(q) }, { headers: { "Cache-Control": "public, s-maxage=900" } });
  } catch (e) {
    return toError(e);
  }
}
