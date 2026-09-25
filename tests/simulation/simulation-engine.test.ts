import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY } from "@/domain/policy";
import { MockMyDataProvider } from "@/providers/finance/mock-mydata";
import { TossPortfolioProvider } from "@/providers/finance/toss";
import { FixtureTossTransport } from "@/providers/finance/toss-api";
import { MockMarketDataProvider } from "@/providers/market/mock";
import { getMetrics } from "@/services/exposure-engine";
import { buildSnapshot } from "@/services/portfolio-aggregator";
import { simulate, type SimulationInputs } from "@/services/simulation-engine";

async function inputs(): Promise<SimulationInputs> {
  const snapshot = await buildSnapshot([new TossPortfolioProvider(new FixtureTossTransport()), new MockMyDataProvider()], new MockMarketDataProvider());
  const { etf } = await getMetrics(snapshot);
  return { snapshot, policy: DEFAULT_POLICY, etf };
}

const w = (r: { symbols: { key: string; portfolioWeightPct: number }[] }, k: string) => r.symbols.find((s) => s.key === k)!.portfolioWeightPct;

describe("simulation engine", () => {
  it("buy NVDA 5,000,000 KRW raises real exposure and breaks the 15% single-stock limit", async () => {
    const r = simulate({ type: "trade", symbol: "NVDA", action: "buy", amountKRW: 5_000_000 }, await inputs());
    expect(r.kind).toBe("simulation");
    expect(w(r.after, "NVDA")).toBeGreaterThan(w(r.before, "NVDA"));
    expect(r.after.totalValueKRW).toBeCloseTo(r.before.totalValueKRW - r.cost!.totalKRW, 0); // cash -> stock, minus cost
    expect(r.before.buyingPowerKRW - r.after.buyingPowerKRW).toBeCloseTo(5_000_000 + r.cost!.totalKRW, 0);
    expect(r.cost!.fxKRW).toBeGreaterThan(0); // KRW -> USD conversion beyond the USD cash on hand
    expect(r.policyChecks.find((c) => c.rule === "singleStockPct")).toMatchObject({ status: "violation", subject: "NVDA", limit: 15 });
    expect(r.changes.find((c) => c.key === "currency:USD")!.after).toBeGreaterThan(r.changes.find((c) => c.key === "currency:USD")!.before);
    expect(r.warnings).toEqual([]);
  });

  it("rejects a buy that exceeds buying power instead of creating negative cash", async () => {
    await expect(async () => simulate({ type: "trade", symbol: "NVDA", action: "buy", amountKRW: 50_000_000 }, await inputs())).rejects.toThrow(/부족/);
  });

  it("sell all 삼성전자 removes the position and adds KRW cash net of cost", async () => {
    const inp = await inputs();
    const r = simulate({ type: "trade", symbol: "005930", action: "sell", quantity: 80 }, inp);
    expect(w(r.after, "005930")).toBeLessThan(w(r.before, "005930"));
    expect(r.after.buyingPowerKRW - r.before.buyingPowerKRW).toBeCloseTo(80 * 87000 - r.cost!.totalKRW, 0);
    expect(r.cost!.taxKRW).toBeGreaterThan(0);
  });

  it("does not apply stock transaction tax to a KR-listed ETF", async () => {
    const r = simulate({ type: "trade", symbol: "069500", action: "sell", quantity: 1 }, await inputs());
    expect(r.cost?.taxKRW).toBe(0);
  });

  it("rejects a sell of a symbol that is not held", async () => {
    await expect(async () => simulate({ type: "trade", symbol: "MSFT", action: "sell", quantity: 1 }, await inputs())).rejects.toThrow(/보유/);
  });

  it("NVDA -30% scenario impact equals 30% of look-through exposure", async () => {
    const r = simulate({ type: "scenario", shocks: [{ kind: "symbol", target: "NVDA", changePct: -30 }] }, await inputs());
    const nvda = r.before.symbols.find((s) => s.key === "NVDA")!;
    expect(r.impactKRW).toBeCloseTo(-0.3 * nvda.totalValueKRW, -2);
    expect(r.impactKRW!).toBeLessThan(-0.3 * nvda.directValueKRW); // ETF holdings amplify the loss
  });

  it("USD -10% scenario hits every USD-exposed asset including KR-listed US ETFs", async () => {
    const inp = await inputs();
    const r = simulate({ type: "scenario", shocks: [{ kind: "fx", target: "USD", changePct: -10 }] }, inp);
    const usdValue = (r.before.weights.byCurrency.USD / 100) * r.before.totalValueKRW;
    expect(r.impactKRW).toBeCloseTo(-0.1 * usdValue, -2);
    expect(r.policyChecks.find((c) => c.rule === "maxDrawdownPct")?.status).toBe("ok");
  });

  it("a -40% US market crash trips the max drawdown check", async () => {
    const r = simulate({ type: "scenario", shocks: [{ kind: "market", target: "US", changePct: -40 }] }, await inputs());
    expect(r.policyChecks.find((c) => c.rule === "maxDrawdownPct")?.status).toBe("violation");
  });
});
