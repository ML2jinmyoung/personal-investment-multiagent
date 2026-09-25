import { type Candle, DataProviderError, type FxRate, type Quote } from "@/domain/portfolio";
import { TOSS_SOURCE, type TossTransport } from "@/providers/finance/toss-api";
import type { MarketDataProvider } from "./interface";

type TossPrice = { symbol: string; timestamp: string | null; lastPrice: string; currency: string };
type TossCandle = { timestamp: string; openPrice: string; highPrice: string; lowPrice: string; closePrice: string; volume: string };
type TossExchangeRate = { rate: string; midRate: string; validFrom: string };

const PERIOD_DAYS: Record<string, number> = { "1w": 5, "1m": 22, "3m": 66, "6m": 132, "1y": 200 };

export class TossMarketDataProvider implements MarketDataProvider {
  readonly source = TOSS_SOURCE;
  readonly isMock = false;
  constructor(private t: TossTransport) {}

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (let i = 0; i < symbols.length; i += 200) {
      const rows = await this.t.get<TossPrice[]>("/api/v1/prices", { symbols: symbols.slice(i, i + 200).join(",") });
      for (const r of rows) {
        // daily change is not part of /prices; held positions carry it from /holdings
        out.push({ symbol: r.symbol, price: Number(r.lastPrice), currency: r.currency, provenance: { source: this.source, asOf: r.timestamp ?? undefined, retrievedAt: new Date().toISOString(), isMock: false } });
      }
    }
    return out;
  }

  async getQuote(symbol: string): Promise<Quote> {
    const q = (await this.getQuotes([symbol]))[0];
    if (!q) throw new DataProviderError("NOT_AVAILABLE", this.source, symbol);
    return q;
  }

  async getPriceHistory(symbol: string, period: string): Promise<Candle[]> {
    const r = await this.t.get<{ candles: TossCandle[] }>("/api/v1/candles", { symbol, interval: "1d", count: String(PERIOD_DAYS[period] ?? 60), adjusted: "true" });
    return r.candles
      .map((c) => ({ date: c.timestamp.slice(0, 10), open: Number(c.openPrice), high: Number(c.highPrice), low: Number(c.lowPrice), close: Number(c.closePrice), volume: Number(c.volume) }))
      .reverse(); // API is newest-first
  }

  async getFxRates(): Promise<FxRate[]> {
    const params = { baseCurrency: "USD", quoteCurrency: "KRW" };
    const now = await this.t.get<TossExchangeRate>("/api/v1/exchange-rate", params);
    let changePct: number | undefined;
    try {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString();
      const prev = await this.t.get<TossExchangeRate>("/api/v1/exchange-rate", { ...params, dateTime: yesterday });
      changePct = (Number(now.midRate) / Number(prev.midRate) - 1) * 100;
    } catch {
      changePct = undefined; // not fabricated
    }
    return [{ currency: "USD", rateKRW: Number(now.midRate), buyRateKRW: Number(now.rate), changePct, provenance: { source: this.source, asOf: now.validFrom, retrievedAt: new Date().toISOString(), isMock: false } }];
  }
}
