import { type Candle, DataProviderError, type FxRate, type Quote } from "@/domain/portfolio";
import { loadFixture } from "@/lib/fixtures";
import type { MarketDataProvider } from "./interface";
import { securityMetaOrUnknown } from "./securities";

type QuotesFixture = {
  asOf: string;
  fx: Record<string, { rateKRW: number; changePct: number }>;
  quotes: Record<string, { price: number; changePct: number }>;
};

export class MockMarketDataProvider implements MarketDataProvider {
  readonly source = "Mock market data (fixture)";
  readonly isMock = true;
  private data = loadFixture<QuotesFixture>("market/quotes.json");

  private provenance() {
    return { source: this.source, asOf: this.data.asOf, retrievedAt: new Date().toISOString(), isMock: true };
  }

  async getQuote(symbol: string): Promise<Quote> {
    const q = this.data.quotes[symbol];
    if (!q) throw new DataProviderError("NOT_AVAILABLE", this.source, `no quote for ${symbol}`);
    return { symbol, price: q.price, changePct: q.changePct, currency: securityMetaOrUnknown(symbol).currency, provenance: this.provenance() };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (const s of symbols) if (this.data.quotes[s]) out.push(await this.getQuote(s));
    return out;
  }

  // ponytail: period ignored, fixture returns whatever history exists (NVDA only)
  async getPriceHistory(symbol: string): Promise<Candle[]> {
    try {
      return loadFixture<Candle[]>(`market/history/${symbol}.json`);
    } catch {
      throw new DataProviderError("NOT_AVAILABLE", this.source, `no history for ${symbol}`);
    }
  }

  async getFxRates(): Promise<FxRate[]> {
    return Object.entries(this.data.fx).map(([currency, f]) => ({
      currency,
      rateKRW: f.rateKRW,
      changePct: f.changePct,
      provenance: this.provenance(),
    }));
  }
}
