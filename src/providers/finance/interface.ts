import type { Account, Money, Position, Provenance } from "@/domain/portfolio";
import { valueKRW } from "@/domain/portfolio";
import { securityMetaOrUnknown } from "@/providers/market/securities";

export interface PortfolioProvider {
  readonly id: string;
  readonly source: string;
  readonly isMock: boolean;
  getAccounts(): Promise<Account[]>;
  getPositions(accountId?: string): Promise<Position[]>;
  getBuyingPower?(accountId: string): Promise<Money>;
}

export function buildPosition(
  input: {
    accountId: string;
    symbol: string;
    quantity: number;
    averagePrice?: number;
    currentPrice?: number;
    dailyChangePct?: number;
    name?: string;
    currency?: string;
  },
  fxRates: Record<string, number>,
  provenance: Provenance,
): Position {
  const meta = securityMetaOrUnknown(input.symbol, { name: input.name, currency: input.currency });
  const price = input.currentPrice ?? input.averagePrice;
  return {
    accountId: input.accountId,
    symbol: input.symbol,
    name: meta.name,
    assetType: meta.assetType,
    market: meta.market,
    currency: meta.currency,
    quantity: input.quantity,
    averagePrice: input.averagePrice,
    currentPrice: input.currentPrice,
    dailyChangePct: input.dailyChangePct,
    marketValueKRW: price === undefined ? 0 : (valueKRW(input.quantity, price, meta.currency, fxRates) ?? 0),
    provenance,
  };
}

export function cashPosition(accountId: string, currency: string, amount: number, fxRates: Record<string, number>, provenance: Provenance): Position {
  return buildPosition({ accountId, symbol: currency, quantity: amount, currentPrice: 1, currency }, fxRates, provenance);
}
