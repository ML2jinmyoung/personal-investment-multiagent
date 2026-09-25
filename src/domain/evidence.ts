import { z } from "zod";
import { Provenance } from "./portfolio";

export const Filing = z.object({
  id: z.string(),
  symbol: z.string().optional(),
  title: z.string(),
  type: z.string(), // 10-K | 10-Q | 8-K | 사업보고서 | ...
  filedAt: z.string(),
  url: z.string().optional(),
  provenance: Provenance,
});
export type Filing = z.infer<typeof Filing>;

export const FinancialMetric = z.object({
  metric: z.string(), // Revenue, NetIncome, ...
  period: z.string(), // FY2025 | 2026Q2
  value: z.number(),
  unit: z.string(), // USD | KRW
});
export type FinancialMetric = z.infer<typeof FinancialMetric>;

export const FinancialStatements = z.object({
  symbol: z.string(),
  items: z.array(FinancialMetric),
  provenance: Provenance,
});
export type FinancialStatements = z.infer<typeof FinancialStatements>;

export const EtfHolding = z.object({
  symbol: z.string(),
  name: z.string(),
  weightPct: z.number(),
});
export type EtfHolding = z.infer<typeof EtfHolding>;

export const EtfHoldings = z.object({
  etf: z.string(),
  holdings: z.array(EtfHolding),
  asOf: z.string(),
  provenance: Provenance,
});
export type EtfHoldings = z.infer<typeof EtfHoldings>;

export const StockWarning = z.object({
  symbol: z.string(),
  type: z.string(), // 투자주의 | 투자경고 | 관리종목 | ...
  message: z.string(),
  since: z.string().optional(),
  provenance: Provenance,
});
export type StockWarning = z.infer<typeof StockWarning>;

export const EvidenceItem = z.object({
  kind: z.enum(["portfolio", "market", "filing", "financials", "etf", "simulation", "policy", "warning"]),
  claim: z.string(),
  source: z.string(),
  asOf: z.string().optional(),
  url: z.string().optional(),
  isMock: z.boolean().optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItem>;
