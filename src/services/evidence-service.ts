import type { EtfHoldings, Filing, FinancialStatements, StockWarning } from "@/domain/evidence";
import { DataProviderError } from "@/domain/portfolio";
import { flag } from "@/lib/env";
import { DartProvider } from "@/providers/disclosure/dart";
import { SecProvider } from "@/providers/disclosure/sec";
import { etfHoldingsProvider } from "@/providers/etf/issuer";
import { liveTossTransport } from "@/providers/finance/toss-api";

const isKR = (symbol: string) => /^\d{6}$|^\d{5}[A-Z0-9]$/.test(symbol);
const WARNING_LABEL: Record<string, string> = {
  LIQUIDATION_TRADING: "정리매매",
  OVERHEATED: "단기과열",
  INVESTMENT_WARNING: "투자경고",
  INVESTMENT_RISK: "투자위험",
  VI_STATIC_AND_DYNAMIC: "변동성완화장치(정적·동적)",
  VI_STATIC: "변동성완화장치(정적)",
  VI_DYNAMIC: "변동성완화장치(동적)",
  STOCK_WARRANTS: "신주인수권",
};

/** Routes evidence requests: KR -> OpenDART, US -> SEC EDGAR, warnings -> Toss, ETF -> holdings provider. */
export class EvidenceService {
  private dart = new DartProvider(process.env.DART_API_KEY);
  private sec = new SecProvider(process.env.SEC_USER_AGENT);
  private etf = etfHoldingsProvider();

  private guard() {
    if (!flag("ENABLE_EXTERNAL_EVIDENCE", true)) throw new DataProviderError("NOT_AVAILABLE", "evidence", "external evidence disabled");
  }

  getRecentFilings(symbol: string, days = 30): Promise<Filing[]> {
    this.guard();
    return isKR(symbol) ? this.dart.getRecentFilings(symbol, days) : this.sec.getRecentFilings(symbol, days);
  }

  getFinancialStatements(symbol: string): Promise<FinancialStatements> {
    this.guard();
    return isKR(symbol) ? this.dart.getFinancialStatements(symbol) : this.sec.getFinancialStatements(symbol);
  }

  async getStockWarnings(symbol: string): Promise<StockWarning[]> {
    const t = flag("ENABLE_REAL_TOSS") && liveTossTransport();
    if (!t) return []; // demo: no recorded warnings
    const rows = await t.get<{ warningType: string; exchange: string | null; startDate: string | null }[]>(`/api/v1/stocks/${encodeURIComponent(symbol)}/warnings`);
    const retrievedAt = new Date().toISOString();
    return rows.map((w) => ({
      symbol,
      type: WARNING_LABEL[w.warningType] ?? w.warningType,
      message: `${w.exchange ?? "거래소"} 매수 유의사항`,
      since: w.startDate ?? undefined,
      provenance: { source: "Toss Securities Open API", asOf: w.startDate ?? undefined, retrievedAt, isMock: false },
    }));
  }

  getEtfHoldings(symbol: string): Promise<EtfHoldings> {
    return this.etf.getHoldings(symbol);
  }
}

let instance: EvidenceService | undefined;
export const getEvidenceService = () => (instance ??= new EvidenceService());
