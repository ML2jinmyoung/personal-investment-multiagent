import { createHash } from "node:crypto";
import type { Account, AccountType, Money, Position } from "@/domain/portfolio";
import { buildPosition, cashPosition, type PortfolioProvider } from "./interface";
import { TOSS_SOURCE, type TossTransport } from "./toss-api";

// ---- Raw Toss Open API shapes. Never exported past this file. ----
type TossAccount = { accountNo: string; accountSeq: number; accountType: string };
type TossHoldingItem = {
  symbol: string;
  name: string;
  marketCountry: string;
  currency: string;
  quantity: string;
  lastPrice: string;
  averagePurchasePrice: string;
  dailyProfitLoss: { amount: string; rate: string };
};
type TossHoldings = { items: TossHoldingItem[] };
type TossBuyingPower = { currency: string; cashBuyingPower: string };
type TossExchangeRate = { rate: string; midRate: string; rateChangeType: "UP" | "EQUAL" | "DOWN"; validFrom: string };
type TossCommission = { marketCountry: string; commissionRate: string };

const ACCOUNT_TYPE: Record<string, { type: AccountType; label: string }> = {
  BROKERAGE: { type: "brokerage", label: "종합매매계좌" },
  PENSION_SAVINGS: { type: "pension", label: "연금저축" },
};

export class TossPortfolioProvider implements PortfolioProvider {
  readonly id = "toss";
  readonly source: string;
  readonly isMock: boolean;
  private seqById = new Map<string, number>();
  private accounts?: Account[];

  constructor(private t: TossTransport) {
    this.isMock = !t.isLive;
    this.source = t.isLive ? TOSS_SOURCE : "Toss Securities (demo fixture)";
  }

  /** Real account numbers never leave this provider. */
  private opaqueId(accountNo: string) {
    return "toss-" + createHash("sha1").update(accountNo).digest("hex").slice(0, 8);
  }

  private provenance() {
    return { source: this.source, asOf: new Date().toISOString(), retrievedAt: new Date().toISOString(), isMock: this.isMock };
  }

  async getAccounts(): Promise<Account[]> {
    if (this.accounts) return this.accounts;
    const rows = await this.t.get<TossAccount[]>("/api/v1/accounts");
    this.accounts = rows.map((a) => {
      const id = this.opaqueId(a.accountNo);
      this.seqById.set(id, a.accountSeq);
      const kind = ACCOUNT_TYPE[a.accountType] ?? { type: "other" as const, label: a.accountType };
      return { id, provider: "토스증권", name: `토스증권 ${kind.label}`, type: kind.type, isLive: this.t.isLive, channel: "open_api" as const };
    });
    return this.accounts;
  }

  private async seq(accountId: string): Promise<number> {
    if (!this.seqById.size) await this.getAccounts();
    const s = this.seqById.get(accountId);
    if (s === undefined) throw new Error(`unknown account ${accountId}`);
    return s;
  }

  async getFxRates(): Promise<Record<string, number>> {
    const r = await this.t.get<TossExchangeRate>("/api/v1/exchange-rate", { baseCurrency: "USD", quoteCurrency: "KRW" });
    return { KRW: 1, USD: Number(r.midRate) };
  }

  async getPositions(accountId?: string): Promise<Position[]> {
    const accounts = (await this.getAccounts()).filter((a) => !accountId || a.id === accountId);
    const fx = await this.getFxRates();
    const out: Position[] = [];
    for (const a of accounts) {
      const seq = await this.seq(a.id);
      const prov = this.provenance();
      const h = await this.t.get<TossHoldings>("/api/v1/holdings", undefined, seq);
      for (const it of h.items) {
        out.push(
          buildPosition(
            {
              accountId: a.id,
              symbol: it.symbol,
              quantity: Number(it.quantity),
              averagePrice: Number(it.averagePurchasePrice),
              currentPrice: Number(it.lastPrice),
              dailyChangePct: Number(it.dailyProfitLoss.rate) * 100,
              name: it.name,
              currency: it.currency,
            },
            fx,
            prov,
          ),
        );
      }
      // cash is not part of holdings; buying power is the cash balance per currency
      for (const currency of ["KRW", "USD"]) {
        const bp = await this.t.get<TossBuyingPower>("/api/v1/buying-power", { currency }, seq);
        const amount = Number(bp.cashBuyingPower);
        if (amount > 0 || currency === "KRW") out.push(cashPosition(a.id, currency, amount, fx, prov));
      }
    }
    return out;
  }

  async getBuyingPower(accountId: string): Promise<Money> {
    const bp = await this.t.get<TossBuyingPower>("/api/v1/buying-power", { currency: "KRW" }, await this.seq(accountId));
    return { amount: Number(bp.cashBuyingPower), currency: "KRW" };
  }

  /** market -> commission rate (decimal), e.g. { KR: 0.00015, US: 0.001 } */
  async getCommissionRates(accountId: string): Promise<Record<string, number>> {
    const rows = await this.t.get<TossCommission[]>("/api/v1/commissions", undefined, await this.seq(accountId));
    return Object.fromEntries(rows.map((r) => [r.marketCountry, Number(r.commissionRate)]));
  }
}
