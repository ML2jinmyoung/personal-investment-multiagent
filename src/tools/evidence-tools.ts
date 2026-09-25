import { tool } from "ai";
import { z } from "zod";
import { getEvidenceService } from "@/services/evidence-service";
import { safeTool } from "./shared";

export const evidenceTools = {
  getRecentFilings: tool({
    description: "최근 공시 (한국: OpenDART, 미국: SEC EDGAR 10-K/10-Q/8-K). 확인 가능한 사실만 반환.",
    inputSchema: z.object({ symbol: z.string(), days: z.number().int().min(1).max(365).default(30) }),
    execute: ({ symbol, days }) =>
      safeTool(z.array(z.object({ title: z.string(), type: z.string(), filedAt: z.string(), url: z.string().optional(), source: z.string(), isMock: z.boolean() })), "filings", async () =>
        (await getEvidenceService().getRecentFilings(symbol, days)).map((f) => ({ title: f.title, type: f.type, filedAt: f.filedAt, url: f.url, source: f.provenance.source, isMock: f.provenance.isMock })),
      ),
  }),
  getFinancialStatements: tool({
    description: "최근 확정 재무 지표 (매출, 영업이익, 순이익). 미래 실적은 포함하지 않는다.",
    inputSchema: z.object({ symbol: z.string() }),
    execute: ({ symbol }) =>
      safeTool(z.object({ symbol: z.string(), items: z.array(z.object({ metric: z.string(), period: z.string(), value: z.number(), unit: z.string() })), source: z.string(), asOf: z.string().optional() }), "financials", async () => {
        const f = await getEvidenceService().getFinancialStatements(symbol);
        return { symbol: f.symbol, items: f.items, source: f.provenance.source, asOf: f.provenance.asOf };
      }),
  }),
  getEtfHoldings: tool({
    description: "ETF 구성 종목과 비중 (as_of 포함). 데이터가 없으면 error를 반환하며 추정하지 않는다.",
    inputSchema: z.object({ symbol: z.string() }),
    execute: ({ symbol }) =>
      safeTool(z.object({ etf: z.string(), asOf: z.string(), source: z.string(), holdings: z.array(z.object({ symbol: z.string(), name: z.string(), weightPct: z.number() })) }), "etf", async () => {
        const h = await getEvidenceService().getEtfHoldings(symbol);
        return { etf: h.etf, asOf: h.asOf, source: h.provenance.source, holdings: h.holdings };
      }),
  }),
};
