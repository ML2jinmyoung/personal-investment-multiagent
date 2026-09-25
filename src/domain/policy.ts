import { z } from "zod";

export const InvestmentPolicy = z.object({
  objective: z.enum(["wealth_growth", "retirement", "home_purchase", "capital_preservation"]),
  horizonYears: z.number().int().min(1).max(60),
  maxDrawdownPct: z.number().min(0).max(100).optional(),
  limits: z.object({
    singleStockPct: z.number().min(0).max(100).optional(),
    sectorPct: z.number().min(0).max(100).optional(),
    overseasPct: z.number().min(0).max(100).optional(),
    riskyAssetPct: z.number().min(0).max(100).optional(),
    minLiquidityPct: z.number().min(0).max(100).optional(),
  }),
  preferences: z.object({
    turnover: z.enum(["low", "medium", "high"]),
    fxRisk: z.enum(["low", "medium", "high"]),
  }),
});
export type InvestmentPolicy = z.infer<typeof InvestmentPolicy>;

export const DEFAULT_POLICY: InvestmentPolicy = {
  objective: "wealth_growth",
  horizonYears: 10,
  maxDrawdownPct: 20,
  limits: { singleStockPct: 15, sectorPct: 35, overseasPct: 70, minLiquidityPct: 10 },
  preferences: { turnover: "low", fxRisk: "medium" },
};

export const PolicyCheckStatus = z.enum(["ok", "warning", "violation", "unknown"]);
export type PolicyCheckStatus = z.infer<typeof PolicyCheckStatus>;

export const PolicyCheck = z.object({
  rule: z.string(), // singleStockPct | sectorPct | overseasPct | riskyAssetPct | minLiquidityPct | maxDrawdownPct | horizon
  label: z.string(),
  status: PolicyCheckStatus,
  limit: z.number().optional(),
  before: z.number().optional(),
  after: z.number().optional(),
  subject: z.string().optional(), // NVDA, Technology, ...
  note: z.string().optional(),
});
export type PolicyCheck = z.infer<typeof PolicyCheck>;
