import { describeError, PortfolioSnapshot, type Position, type Provenance, type Quote, valueKRW } from "@/domain/portfolio";
import { flag } from "@/lib/env";
import type { PortfolioProvider } from "@/providers/finance/interface";
import { MockMyDataProvider } from "@/providers/finance/mock-mydata";
import { TossPortfolioProvider } from "@/providers/finance/toss";
import { FixtureTossTransport, liveTossTransport } from "@/providers/finance/toss-api";
import type { MarketDataProvider } from "@/providers/market/interface";
import { MockMarketDataProvider } from "@/providers/market/mock";
import { TossMarketDataProvider } from "@/providers/market/toss";

const MARKET_PRICED = new Set(["stock", "etf", "fund", "bond"]);
const TTL_MS = 60_000; // ponytail: short in-memory TTL only; holdings are never persisted

/** Live Toss when ENABLE_REAL_TOSS and credentials exist; otherwise the recorded demo fixture (shown as DEMO). */
const tossTransport = () => (flag("ENABLE_REAL_TOSS") && liveTossTransport()) || new FixtureTossTransport();
let providers: PortfolioProvider[] | undefined;
let marketProvider: MarketDataProvider | undefined;

export function portfolioProviders(): PortfolioProvider[] {
  if (!providers) {
    providers = [new TossPortfolioProvider(tossTransport())];
    if (flag("ENABLE_MOCK_MYDATA", true)) providers.push(new MockMyDataProvider());
  }
  return providers;
}

export function marketDataProvider(): MarketDataProvider {
  if (!marketProvider) {
    const t = tossTransport();
    marketProvider = t.isLive ? new TossMarketDataProvider(t) : new MockMarketDataProvider();
  }
  return marketProvider;
}

const cache = new Map<string, { at: number; snap: PortfolioSnapshot }>();

export async function getPortfolioSnapshot(userId = "demo", opts: { fresh?: boolean } = {}): Promise<PortfolioSnapshot> {
  const hit = cache.get(userId);
  if (!opts.fresh && hit && Date.now() - hit.at < TTL_MS) return hit.snap;
  const snap = await buildSnapshot(portfolioProviders(), marketDataProvider());
  cache.set(userId, { at: Date.now(), snap });
  return snap;
}

export async function getCommissionRates(accountId: string): Promise<Record<string, number> | undefined> {
  const toss = portfolioProviders().find((p): p is TossPortfolioProvider => p instanceof TossPortfolioProvider);
  return accountId.startsWith("toss-") ? toss?.getCommissionRates(accountId) : undefined;
}

export async function buildSnapshot(providers: PortfolioProvider[], market: MarketDataProvider): Promise<PortfolioSnapshot> {
  const now = new Date().toISOString();
  const warnings: string[] = [];
  const sources: Provenance[] = [];
  const accounts: PortfolioSnapshot["accounts"] = [];
  const raw: Position[] = [];

  for (const p of providers) {
    try {
      // Toss ACCOUNT endpoints are limited to 1 TPS. The provider reuses this account result.
      const a = await p.getAccounts();
      const pos = await p.getPositions();
      accounts.push(...a);
      raw.push(...pos);
      sources.push({ source: p.source, retrievedAt: now, isMock: p.isMock, asOf: pos[0]?.provenance.asOf });
    } catch (e) {
      warnings.push(`${p.source}: ${describeError(e)} — 이 계좌는 이번 분석에서 제외되었습니다.`);
    }
  }

  const fxRates: Record<string, number> = { KRW: 1 };
  const fxBuyRates: Record<string, number> = { KRW: 1 };
  try {
    for (const f of await market.getFxRates()) {
      fxRates[f.currency] = f.rateKRW;
      if (f.buyRateKRW !== undefined) fxBuyRates[f.currency] = f.buyRateKRW;
    }
  } catch (e) {
    warnings.push(`환율: ${describeError(e)} — 외화 자산의 원화 환산이 불완전할 수 있습니다.`);
  }

  const quotes = new Map<string, Quote>();
  try {
    const symbols = [...new Set(raw.filter((p) => MARKET_PRICED.has(p.assetType)).map((p) => p.symbol))];
    for (const q of await market.getQuotes(symbols)) quotes.set(q.symbol, q);
    const first = quotes.values().next().value;
    sources.push({ source: market.source, retrievedAt: now, isMock: market.isMock, asOf: first?.provenance.asOf });
  } catch (e) {
    warnings.push(`시세: ${describeError(e)} — 제공자의 평가금액을 사용합니다.`);
  }

  const positions = raw.map((p) => {
    const q = quotes.get(p.symbol);
    const price = q?.price ?? p.currentPrice ?? p.averagePrice;
    if (!q && MARKET_PRICED.has(p.assetType)) {
      warnings.push(`${p.name}(${p.symbol}): 최신 시세를 확인하지 못해 ${p.currentPrice ? "제공자 평가가" : "매입가"} 기준으로 계산했습니다.`);
    }
    const v = price === undefined ? undefined : valueKRW(p.quantity, price, p.currency, fxRates);
    if (v === undefined) warnings.push(`${p.name}: ${p.currency} 환율 정보가 없어 원화 환산이 불완전합니다.`);
    return { ...p, currentPrice: price, dailyChangePct: q?.changePct ?? p.dailyChangePct, marketValueKRW: v ?? p.marketValueKRW };
  });

  return PortfolioSnapshot.parse({
    asOf: now,
    accounts,
    positions,
    totals: computeTotals(accounts, positions),
    fxRates,
    fxBuyRates,
    sources,
    warnings: [...new Set(warnings)],
  });
}

export function computeTotals(accounts: PortfolioSnapshot["accounts"], positions: Position[]): PortfolioSnapshot["totals"] {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const sum = (key: (p: Position) => string) =>
    positions.reduce<Record<string, number>>((acc, p) => ((acc[key(p)] = (acc[key(p)] ?? 0) + p.marketValueKRW), acc), {});
  return {
    marketValueKRW: positions.reduce((s, p) => s + p.marketValueKRW, 0),
    byBroker: sum((p) => accountById.get(p.accountId)?.provider ?? "unknown"),
    byCurrency: sum((p) => p.currency),
    byAccountType: sum((p) => accountById.get(p.accountId)?.type ?? "other"),
  };
}
