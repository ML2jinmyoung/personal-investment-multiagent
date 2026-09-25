import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY, type InvestmentPolicy } from "@/domain/policy";
import type { PortfolioMetrics } from "@/domain/simulation";
import { checkPolicy, hasViolation } from "@/services/policy-engine";

function metrics(over: Partial<PortfolioMetrics> & { nvda?: number; usd?: number; cash?: number }): PortfolioMetrics {
  const nvda = over.nvda ?? 11.2;
  const usd = over.usd ?? 61;
  const cash = over.cash ?? 12;
  return {
    totalValueKRW: 100_000_000,
    buyingPowerKRW: cash * 1_000_000,
    cashPct: cash,
    overseasPct: usd,
    riskyAssetPct: 80,
    symbols: [
      { key: "NVDA", name: "NVIDIA", kind: "stock", directValueKRW: 0, indirectValueKRW: 0, totalValueKRW: nvda * 1e6, portfolioWeightPct: nvda },
      { key: "005930", name: "삼성전자", kind: "stock", directValueKRW: 0, indirectValueKRW: 0, totalValueKRW: 8.4e6, portfolioWeightPct: 8.4 },
      { key: "QQQ:residual", name: "QQQ (기타)", kind: "etf-residual", directValueKRW: 0, indirectValueKRW: 0, totalValueKRW: 20e6, portfolioWeightPct: 20 },
    ],
    weights: { bySector: { Technology: 30, Financials: 5 }, byCountry: { KR: 100 - usd, US: usd }, byCurrency: { KRW: 100 - usd, USD: usd }, byAssetClass: { equity: 80, cash } },
    ...over,
  };
}

const policy: InvestmentPolicy = { ...DEFAULT_POLICY, limits: { singleStockPct: 15, sectorPct: 35, overseasPct: 70, minLiquidityPct: 10 } };

describe("policy engine", () => {
  it("flags a single-stock violation after a simulated buy", () => {
    const checks = checkPolicy(metrics({}), metrics({ nvda: 16.7 }), policy, { isTrade: true });
    const c = checks.find((x) => x.rule === "singleStockPct")!;
    expect(c).toMatchObject({ status: "violation", limit: 15, before: 11.2, after: 16.7, subject: "NVDA" });
    expect(hasViolation(checks)).toBe(true);
  });

  it("warns on policy proximity (within 90% of a limit)", () => {
    const c = checkPolicy(metrics({ nvda: 14 }), metrics({ nvda: 14 }), policy).find((x) => x.rule === "singleStockPct")!;
    expect(c.status).toBe("warning");
  });

  it("ETF residual buckets are never treated as a single stock", () => {
    const checks = checkPolicy(metrics({ nvda: 1 }), metrics({ nvda: 1 }), policy);
    expect(checks.filter((c) => c.rule === "singleStockPct").every((c) => c.status === "ok")).toBe(true);
  });

  it("checks minimum liquidity, overseas and sector limits", () => {
    const checks = checkPolicy(metrics({ cash: 8, usd: 72 }), metrics({ cash: 8, usd: 72 }), policy);
    expect(checks.find((c) => c.rule === "minLiquidityPct")?.status).toBe("violation");
    expect(checks.find((c) => c.rule === "overseasPct")?.status).toBe("violation");
    expect(checks.find((c) => c.rule === "sectorPct")).toMatchObject({ status: "ok", subject: "Technology", after: 30 });
  });

  it("applies max drawdown only to scenario losses and fx preference only to trades", () => {
    const dd = checkPolicy(metrics({}), metrics({}), policy, { scenarioLossPct: 25 }).find((c) => c.rule === "maxDrawdownPct");
    expect(dd?.status).toBe("violation");
    const low = { ...policy, preferences: { turnover: "low", fxRisk: "low" } } as InvestmentPolicy;
    const fx = checkPolicy(metrics({ usd: 61 }), metrics({ usd: 65 }), low, { isTrade: true }).find((c) => c.rule === "fxRisk");
    expect(fx?.status).toBe("warning");
    expect(checkPolicy(metrics({}), metrics({ usd: 65 }), low).find((c) => c.rule === "fxRisk")).toBeUndefined();
  });

  it("skips rules the user did not set", () => {
    const checks = checkPolicy(metrics({}), metrics({}), { ...policy, limits: {} });
    expect(checks).toEqual([]);
  });
});
