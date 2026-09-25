import type { EtfHoldings } from "@/domain/evidence";

export interface EtfHoldingsProvider {
  readonly source: string;
  /** Throws DataProviderError(NOT_AVAILABLE) when constituents are unknown; never guesses. */
  getHoldings(etfSymbol: string): Promise<EtfHoldings>;
}
