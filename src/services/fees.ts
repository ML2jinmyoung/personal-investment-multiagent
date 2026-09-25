import type { TradeCost } from "@/domain/simulation";

// ponytail: static POC schedule. Live mode should use TossPortfolioProvider.getCommissionRates(accountId).
export const FEES = {
  commissionRate: { KR: 0.00015, US: 0.001 } as Record<string, number>,
  sellTaxRate: { KR: 0.0015, US: 0 } as Record<string, number>, // 증권거래세+농특세 (KR), none on US sells
  fxSpreadRate: 0.005, // 환전 스프레드 가정 (매수환율 vs 매매기준율)
};

export function tradeCost(input: {
  market: string;
  action: "buy" | "sell";
  grossKRW: number;
  fxAmountKRW: number; // portion of the trade that requires converting KRW -> foreign currency
  assetType?: string;
  commissionRate?: number;
  fxSpreadRate?: number;
}): TradeCost {
  const commissionRate = input.commissionRate ?? FEES.commissionRate[input.market] ?? FEES.commissionRate.US;
  const commissionKRW = input.grossKRW * commissionRate;
  const taxable = input.market === "KR" && input.assetType === "stock";
  const taxKRW = input.action === "sell" && taxable ? input.grossKRW * (FEES.sellTaxRate[input.market] ?? 0) : 0;
  const fxKRW = input.fxAmountKRW * (input.fxSpreadRate ?? FEES.fxSpreadRate);
  const notes = [`수수료 ${(commissionRate * 100).toFixed(3)}%`];
  if (taxKRW) notes.push(`거래세 ${(FEES.sellTaxRate[input.market] * 100).toFixed(2)}%`);
  if (fxKRW) notes.push(`환전 스프레드 ${((input.fxSpreadRate ?? FEES.fxSpreadRate) * 100).toFixed(2)}% 가정`);
  if (input.market === "US" && input.action === "sell") notes.push("해외주식 양도소득세(연 250만원 초과분 22%)는 별도");
  return {
    commissionKRW: Math.round(commissionKRW),
    taxKRW: Math.round(taxKRW),
    fxKRW: Math.round(fxKRW),
    totalKRW: Math.round(commissionKRW + taxKRW + fxKRW),
    note: notes.join(" · "),
  };
}
