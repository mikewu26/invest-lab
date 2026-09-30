import { getQuote } from "@/lib/market";
import { errorJson, toError } from "@/lib/api";

/** GET /api/quote?symbols=0050,VT — 一次最多 20 個代號；個別失敗不影響其他 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("symbols") ?? "";
  const symbols = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  if (!symbols.length) return errorJson("請提供 symbols", 400);
  if (symbols.length > 20) return errorJson("一次最多 20 個代號", 400);
  try {
    const results = await Promise.all(
      symbols.map(async (s) => {
        try {
          return { symbol: s, ok: true as const, quote: await getQuote(s) };
        } catch (e) {
          return { symbol: s, ok: false as const, error: e instanceof Error ? e.message : "查詢失敗" };
        }
      }),
    );
    return Response.json({ results }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch (e) {
    return toError(e);
  }
}
