import { generateObject } from "ai";
import { AgentAnswer } from "@/domain/agent";
import { modelFor } from "@/providers/llm/registry";
import type { EvidenceFindings, PortfolioFindings, RunContext } from "./context";
import { SYNTHESIZER_SYSTEM } from "./prompts";

export interface SynthesisInput {
  portfolio?: PortfolioFindings;
  evidence?: EvidenceFindings;
  critique?: string;
  previous?: AgentAnswer;
}

/** Produces the structured AgentAnswer; numbers come only from the deterministic inputs. */
export async function runSynthesizer(ctx: RunContext, input: SynthesisInput): Promise<AgentAnswer> {
  const name = input.critique ? "synthesizer-revision" : "synthesizer";
  return ctx.tracer.step(
    name,
    "llm",
    async (rec) => {
      const { model, config } = await modelFor("synthesizer");
      rec.provider = config.provider;
      rec.model = config.model;
      const parts = [
        ctx.history.length ? `RECENT CONVERSATION: ${JSON.stringify(ctx.history)}` : "",
        `USER: ${ctx.message}`,
        ctx.routing.isPredictionRequest ? "NOTE: 사용자가 가격 예측을 요청했습니다. 예측하지 말고 시나리오와 불확실성으로 답하세요." : "",
        `PORTFOLIO (as of ${ctx.snapshot.asOf}): ${JSON.stringify(ctx.snapshot)}`,
        `POLICY CHECKS (code, must be reflected verbatim): ${JSON.stringify(ctx.policyChecks)}`,
        ctx.simulationView ? `SIMULATION (deterministic): ${JSON.stringify(ctx.simulationView)}` : "SIMULATION: none",
        input.portfolio ? `PORTFOLIO AGENT: ${JSON.stringify(input.portfolio)}` : "",
        input.evidence ? `EVIDENCE AGENT: ${JSON.stringify(input.evidence)}` : "EVIDENCE AGENT: skipped (not needed for this question)",
        input.critique ? `CRITIC (fix these issues in the revision): ${input.critique}\nPREVIOUS ANSWER: ${JSON.stringify(input.previous)}` : "",
      ].filter(Boolean);
      const r = await generateObject({ model, schema: AgentAnswer, system: SYNTHESIZER_SYSTEM, prompt: parts.join("\n\n") });
      ctx.tracer.usage(rec, r.usage, config.model);
      // policy checks are code-owned: never let the model add or drop one
      return { ...r.object, policyChecks: ctx.simulation ? ctx.simulation.policyChecks : ctx.policyChecks };
    },
    { input: { hasPortfolio: Boolean(input.portfolio), hasEvidence: Boolean(input.evidence), revision: Boolean(input.critique) } },
  );
}
