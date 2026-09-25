import type { Account, AccountType, Money, Position } from "@/domain/portfolio";
import { loadFixture } from "@/lib/fixtures";
import { MockMarketDataProvider } from "@/providers/market/mock";
import { buildPosition, cashPosition, type PortfolioProvider } from "./interface";

type MyDataFixture = {
  asOf: string;
  accounts: {
    id: string;
    org: string;
    name: string;
    type: AccountType;
    holdings: { symbol: string; quantity: number; avgPrice: number }[];
    cash: { currency: string; amount: number }[];
  }[];
};

/** Simulates a MyData aggregated view: 삼성증권, 메리츠 IRP, DC 퇴직연금. Always DEMO. */
export class MockMyDataProvider implements PortfolioProvider {
  readonly id = "mydata";
  readonly source = "Mock MyData";
  readonly isMock = true;
  private data = loadFixture<MyDataFixture>("mydata/accounts.json");
  private market = new MockMarketDataProvider();

  async getAccounts(): Promise<Account[]> {
    return this.data.accounts.map((a) => ({
      id: a.id,
      provider: a.org,
      name: a.name,
      type: a.type,
      isLive: false,
      channel: "mydata" as const,
    }));
  }

  async getPositions(accountId?: string): Promise<Position[]> {
    const provenance = { source: this.source, asOf: this.data.asOf, retrievedAt: new Date().toISOString(), isMock: true };
    const fx: Record<string, number> = { KRW: 1 };
    for (const f of await this.market.getFxRates()) fx[f.currency] = f.rateKRW;
    const quotes = new Map((await this.market.getQuotes(this.data.accounts.flatMap((a) => a.holdings.map((h) => h.symbol)))).map((q) => [q.symbol, q]));
    return this.data.accounts
      .filter((a) => !accountId || a.id === accountId)
      .flatMap((a) => [
        ...a.holdings.map((h) =>
          buildPosition(
            { accountId: a.id, symbol: h.symbol, quantity: h.quantity, averagePrice: h.avgPrice, currentPrice: quotes.get(h.symbol)?.price, dailyChangePct: quotes.get(h.symbol)?.changePct },
            fx,
            provenance,
          ),
        ),
        ...a.cash.map((c) => cashPosition(a.id, c.currency, c.amount, fx, provenance)),
      ]);
  }

  async getBuyingPower(accountId: string): Promise<Money> {
    const a = this.data.accounts.find((x) => x.id === accountId);
    return { amount: a?.cash.filter((c) => c.currency === "KRW").reduce((s, c) => s + c.amount, 0) ?? 0, currency: "KRW" };
  }
}
