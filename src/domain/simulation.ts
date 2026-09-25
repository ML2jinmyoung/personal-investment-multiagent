import { z } from "zod";
import { PolicyCheck } from "./policy";

export const TradeSimulationRequest = z.object({
  type: z.literal("trade"),
  symbol: z.string().min(1),
  action: z.enum(["buy", "sell"]),
  amountKRW: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  accountId: z.string().optional(),
}).refine((r) => (r.amountKRW !== undefined) !== (r.quantity !== undefined), { message: "provide exactly one of amountKRW or quantity" });
export type TradeSimulationRequest = z.infer<typeof TradeSimulationRequest>;

export const ScenarioShock = z.object({
  kind: z.enum(["symbol", "sector", "fx", "market"]),
  /** symbol: "NVDA" | sector: "Technology" | fx: "USD" | market: "US" | "KR" | "ALL" */
  target: z.string().min(1),
  changePct: z.number().min(-100).max(1000),
});
export type ScenarioShock = z.infer<typeof ScenarioShock>;

export const ScenarioSimulationRequest = z.object({
  type: z.literal("scenario"),
  shocks: z.array(ScenarioShock).min(1).max(10),
});
export type ScenarioSimulationRequest = z.infer<typeof ScenarioSimulationRequest>;

export const SimulationRequest = z.discriminatedUnion("type", [
  TradeSimulationRequest,
  ScenarioSimulationRequest,
]);
export type SimulationRequest = z.infer<typeof SimulationRequest>;

const Weights = z.record(z.string(), z.number());

export const Exposure = z.object({
  key: z.string(), // symbol, or "<etf>:residual" for the part of an ETF we cannot look through
  name: z.string(),
  kind: z.enum(["stock", "etf-residual", "bond", "cash", "other"]),
  directValueKRW: z.number(),
  indirectValueKRW: z.number(),
  totalValueKRW: z.number(),
  portfolioWeightPct: z.number(),
});
export type Exposure = z.infer<typeof Exposure>;

export const PortfolioMetrics = z.object({
  totalValueKRW: z.number(),
  buyingPowerKRW: z.number(),
  cashPct: z.number(),
  overseasPct: z.number(),
  riskyAssetPct: z.number(),
  /** look-through exposure per symbol, sorted by weight desc */
  symbols: z.array(Exposure),
  weights: z.object({
    bySector: Weights, // equity exposure only, % of total portfolio
    byCountry: Weights,
    byCurrency: Weights, // economic FX exposure (KR-listed USD ETF counts as USD)
    byAssetClass: Weights,
  }),
});
export type PortfolioMetrics = z.infer<typeof PortfolioMetrics>;

export const MetricChange = z.object({
  key: z.string(),
  label: z.string(),
  before: z.number(),
  after: z.number(),
  unit: z.enum(["pct", "krw"]),
});
export type MetricChange = z.infer<typeof MetricChange>;

export const TradeCost = z.object({
  commissionKRW: z.number(),
  taxKRW: z.number(),
  fxKRW: z.number(),
  totalKRW: z.number(),
  note: z.string(),
});
export type TradeCost = z.infer<typeof TradeCost>;

export const SimulationResult = z.object({
  request: SimulationRequest,
  before: PortfolioMetrics,
  after: PortfolioMetrics,
  changes: z.array(MetricChange),
  cost: TradeCost.optional(),
  /** scenario P&L in KRW (negative = loss) */
  impactKRW: z.number().optional(),
  policyChecks: z.array(PolicyCheck),
  warnings: z.array(z.string()),
  computedAt: z.string(),
  kind: z.literal("simulation"), // never a prediction
});
export type SimulationResult = z.infer<typeof SimulationResult>;
