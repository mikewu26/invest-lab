import { getHistory } from "@/lib/market";
import { errorJson, toError } from "@/lib/api";
import type { Range } from "@/lib/market/types";

const RANGES: Range[] = ["6m", "1y", "2y"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "";
  const range = (searchParams.get("range") ?? "1y") as Range;
  if (!RANGES.includes(range)) return errorJson("range 只能是 6m、1y 或 2y", 400);
  try {
    const series = await getHistory(symbol, range);
    return Response.json(series, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch (e) {
    return toError(e);
  }
}
