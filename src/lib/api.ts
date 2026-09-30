import { MarketError } from "@/lib/market/types";

export function errorJson(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function toError(e: unknown) {
  if (e instanceof MarketError) {
    return errorJson(e.message, e.code === "not_found" ? 404 : e.code === "bad_input" ? 400 : 502);
  }
  console.error(e);
  return errorJson("行情服務暫時無法使用，請稍後再試", 502);
}
