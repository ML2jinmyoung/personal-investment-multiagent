import { tool } from "ai";
import { z } from "zod";
import { marketDataProvider } from "@/services/portfolio-aggregator";
import { getEvidenceService } from "@/services/evidence-service";
import { safeTool } from "./shared";

const QuoteView = z.object({ symbol: z.string(), price: z.number(), currency: z.string(), changePct: z.number().optional(), source: z.string(), asOf: z.string().optional(), isMock: z.boolean() });

export const marketTools = {
  getQuotes: tool({
    description: "현재가 조회 (출처와 기준 시각 포함)",
    inputSchema: z.object({ symbols: z.array(z.string()).min(1).max(20) }),
    execute: ({ symbols }) =>
      safeTool(z.array(QuoteView), "market", async () =>
        (await marketDataProvider().getQuotes(symbols)).map((q) => ({ symbol: q.symbol, price: q.price, currency: q.currency, changePct: q.changePct, source: q.provenance.source, asOf: q.provenance.asOf, isMock: q.provenance.isMock })),
      ),
  }),
  getPriceHistory: tool({
    description: "일봉 가격 이력 (period: 1w|1m|3m|6m|1y). 최근 추세 설명용이며 예측에 쓰지 않는다.",
    inputSchema: z.object({ symbol: z.string(), period: z.enum(["1w", "1m", "3m", "6m", "1y"]).default("1m") }),
    execute: ({ symbol, period }) =>
      safeTool(z.object({ symbol: z.string(), candles: z.array(z.object({ date: z.string(), close: z.number() })), changePct: z.number().optional() }), "market", async () => {
        const candles = await marketDataProvider().getPriceHistory(symbol, period);
        const first = candles[0]?.close;
        const last = candles.at(-1)?.close;
        return { symbol, candles: candles.map((c) => ({ date: c.date, close: c.close })), changePct: first && last ? Math.round((last / first - 1) * 1000) / 10 : undefined };
      }),
  }),
  getStockWarnings: tool({
    description: "거래소 매수 유의사항(투자경고, 단기과열 등)",
    inputSchema: z.object({ symbol: z.string() }),
    execute: ({ symbol }) => safeTool(z.array(z.object({ type: z.string(), message: z.string(), since: z.string().optional(), source: z.string() })), "market", async () => (await getEvidenceService().getStockWarnings(symbol)).map((w) => ({ type: w.type, message: w.message, since: w.since, source: w.provenance.source }))),
  }),
};
