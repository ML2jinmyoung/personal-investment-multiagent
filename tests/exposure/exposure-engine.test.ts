import { describe, expect, it } from "vitest";
import { MockMyDataProvider } from "@/providers/finance/mock-mydata";
import { TossPortfolioProvider } from "@/providers/finance/toss";
import { FixtureTossTransport } from "@/providers/finance/toss-api";
import { MockMarketDataProvider } from "@/providers/market/mock";
import { computeMetrics, getMetrics } from "@/services/exposure-engine";
import { buildSnapshot } from "@/services/portfolio-aggregator";

const fixtureSnapshot = () =>
  buildSnapshot([new TossPortfolioProvider(new FixtureTossTransport()), new MockMyDataProvider()], new MockMarketDataProvider());

describe("exposure engine", () => {
  it("adds ETF look-through to direct NVDA exposure", async () => {
    const snap = await fixtureSnapshot();
    const { metrics, etf, warnings } = await getMetrics(snap);
    const nvda = metrics.symbols.find((s) => s.key === "NVDA")!;
    const direct = snap.positions.filter((p) => p.symbol === "NVDA").reduce((s, p) => s + p.marketValueKRW, 0);
    const indirect = snap.positions
      .filter((p) => p.assetType === "etf")
      .reduce((s, p) => s + (p.marketValueKRW * (etf.get(p.symbol)?.holdings.find((h) => h.symbol === "NVDA")?.weightPct ?? 0)) / 100, 0);
    expect(nvda.directValueKRW).toBeCloseTo(direct, 0);
    expect(nvda.indirectValueKRW).toBeCloseTo(indirect, 0);
    expect(nvda.indirectValueKRW).toBeGreaterThan(0);
    expect(nvda.portfolioWeightPct).toBeCloseTo(((direct + indirect) / snap.totals.marketValueKRW) * 100, 5);
    // bond ETF without constituents is not an equity look-through warning
    expect(warnings).toEqual([]);
  });

  it("buckets sum to 100% and KR-listed US ETFs count as USD/US exposure", async () => {
    const snap = await fixtureSnapshot();
    const { metrics } = await getMetrics(snap);
    const sum = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
    expect(sum(metrics.weights.byCountry)).toBeCloseTo(100, 6);
    expect(sum(metrics.weights.byCurrency)).toBeCloseTo(100, 6);
    expect(sum(metrics.weights.byAssetClass)).toBeCloseTo(100, 6);
    const tiger = snap.positions.find((p) => p.symbol === "360750")!;
    expect(metrics.weights.byCurrency.USD).toBeGreaterThan((tiger.marketValueKRW / snap.totals.marketValueKRW) * 100);
    expect(metrics.overseasPct).toBeCloseTo(100 - metrics.weights.byCountry.KR, 6);
    expect(metrics.buyingPowerKRW).toBe(12_000_000 + 500 * 1380 + 1_500_000); // brokerage cash only
  });

  it("excludes an ETF from look-through and warns when constituents are missing", async () => {
    const snap = await fixtureSnapshot();
    const { metrics, warnings } = computeMetrics(snap, new Map());
    expect(metrics.symbols.find((s) => s.key === "NVDA")!.indirectValueKRW).toBe(0);
    expect(metrics.symbols.some((s) => s.key === "QQQ:residual")).toBe(true);
    expect(warnings.some((w) => w.includes("QQQ"))).toBe(true);
  });
});
