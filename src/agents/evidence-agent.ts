import { generateText, Output, stepCountIs } from "ai";
import { z } from "zod";
import { EvidenceItem } from "@/domain/evidence";
import { modelFor } from "@/providers/llm/registry";
import { evidenceTools } from "@/tools/evidence-tools";
import { marketTools } from "@/tools/market-tools";
import type { EvidenceFindings, RunContext } from "./context";
import { EVIDENCE_SYSTEM } from "./prompts";

const Findings = z.object({ evidence: z.array(EvidenceItem), risks: z.array(z.string()), limitations: z.array(z.string()) });

/** "외부에서 확인 가능한 사실은 무엇인가?" KR -> OpenDART, US -> SEC via the tools. */
export async function runEvidenceAgent(ctx: RunContext): Promise<EvidenceFindings> {
  return ctx.tracer.step(
    "evidence-agent",
    "llm",
    async (rec) => {
      const { model, config } = await modelFor("evidence");
      rec.provider = config.provider;
      rec.model = config.model;
      const r = await generateText({
        model,
        system: EVIDENCE_SYSTEM,
        prompt: `${ctx.history.length ? `RECENT CONVERSATION:\n${ctx.history.map((m) => `${m.role}: ${m.content}`).join("\n")}\n` : ""}USER: ${ctx.message}\nSYMBOLS: ${ctx.routing.symbols.join(", ") || "(none)"}\n\n관련 종목의 최근 공시, 재무 지표, 최근 가격 흐름, 유의사항, (ETF면) 구성 종목을 tool로 확인하고 근거 목록을 만드세요. tool이 error를 반환하면 그 사실을 limitations에 적습니다.`,
        tools: ctx.tracer.traceTools({ ...evidenceTools, ...marketTools }, rec.id),
        stopWhen: stepCountIs(6),
        output: Output.object({ schema: Findings }),
      });
      ctx.tracer.usage(rec, r.totalUsage, config.model);
      return r.output ?? { evidence: [], risks: [], limitations: ["Evidence Agent가 구조화된 결과를 만들지 못했습니다."] };
    },
    { parallelGroup: "analysis", input: { symbols: ctx.routing.symbols } },
  );
}
