import type { Candle, FxRate, Quote } from "@/domain/portfolio";

export interface MarketDataProvider {
  readonly source: string;
  readonly isMock: boolean;
  getQuote(symbol: string): Promise<Quote>;
  /** Symbols without a quote are omitted, never invented. */
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getPriceHistory(symbol: string, period: string): Promise<Candle[]>;
  getFxRates(): Promise<FxRate[]>;
}
