export type Range = "6m" | "1y" | "2y";

export const RANGE_MONTHS: Record<Range, number> = { "6m": 6, "1y": 12, "2y": 24 };

export type DataSource = "twse" | "yahoo";

export interface PricePoint {
  /** ISO date, YYYY-MM-DD */
  date: string;
  close: number;
}

export interface PriceSeries {
  symbol: string;
  name: string;
  currency: string;
  source: DataSource;
  points: PricePoint[];
}

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  /** ISO date of the price */
  asOf: string;
  source: DataSource;
}

export class MarketError extends Error {
  constructor(
    message: string,
    public readonly code: "not_found" | "upstream" | "bad_input",
  ) {
    super(message);
  }
}

/** Taiwan listed / OTC codes: 4–6 digits, optional trailing letter (e.g. 0050, 00878, 00400A). */
export function isTaiwanCode(symbol: string): boolean {
  return /^\d{4,6}[A-Z]?$/.test(symbol);
}

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}
