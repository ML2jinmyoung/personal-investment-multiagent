import { describe, expect, it } from "vitest";
import { MockMyDataProvider } from "@/providers/finance/mock-mydata";
import { TossPortfolioProvider } from "@/providers/finance/toss";
import { FixtureTossTransport } from "@/providers/finance/toss-api";
import { MockMarketDataProvider } from "@/providers/market/mock";
import { buildSnapshot } from "@/services/portfolio-aggregator";

describe("portfolio normalization", () => {
  it("Toss fixture + mock MyData -> PortfolioSnapshot", async () => {
    const snap = await buildSnapshot(
      [new TossPortfolioProvider(new FixtureTossTransport()), new MockMyDataProvider()],
      new MockMarketDataProvider(),
    );
    expect(snap.accounts).toHaveLength(4);
    expect(snap.accounts.find((a) => a.provider === "토스증권")?.isLive).toBe(false);
    expect(snap.positions.every((p) => p.marketValueKRW > 0)).toBe(true);
    const sum = snap.positions.reduce((s, p) => s + p.marketValueKRW, 0);
    expect(snap.totals.marketValueKRW).toBeCloseTo(sum, 0);
    expect(snap.totals.byBroker["토스증권"]).toBeGreaterThan(0);
    expect(snap.warnings).toEqual([]);
    // real account numbers never leak into the domain
    expect(JSON.stringify(snap)).not.toContain("8888-01");
    // Toss cash comes from buying-power, not holdings
    const tossId = snap.accounts.find((a) => a.provider === "토스증권")!.id;
    expect(snap.positions.find((p) => p.accountId === tossId && p.symbol === "KRW")?.marketValueKRW).toBe(12_000_000);
    expect(snap.positions.find((p) => p.accountId === tossId && p.symbol === "NVDA")?.dailyChangePct).toBeCloseTo(-7, 5);
  });
});
