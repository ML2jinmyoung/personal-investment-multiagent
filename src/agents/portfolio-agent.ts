import { generateText, Output, stepCountIs } from "ai";
import { z } from "zod";
import { AgentAnswer } from "@/domain/agent";
import { modelFor } from "@/providers/llm/registry";
import { portfolioToolsFor } from "@/tools/portfolio-tools";
import { simulationToolsFor } from "@/tools/simulation-tools";
import type { PortfolioFindings, RunContext } from "./context";
import { PORTFOLIO_SYSTEM } from "./prompts";

const Findings = z.object({ meaning: z.string(), keyFacts: z.array(z.string()), alternatives: z.array(z.string()) });

function contextBlock(ctx: RunContext) {
  return [
    ctx.history.length ? `RECENT CONVERSATION:\n${ctx.history.map((m) => `${m.role}: ${m.content}`).join("\n")}` : "",
    `USER: ${ctx.message}`,
    `PORTFOLIO (deterministic, as of ${ctx.snapshot.asOf}):\n${JSON.stringify(ctx.snapshot)}`,
    `POLICY: ${JSON.stringify(ctx.policy)}`,
    `POLICY CHECKS (code): ${JSON.stringify(ctx.policyChecks)}`,
    ctx.simulationView ? `SIMULATION (deterministic): ${JSON.stringify(ctx.simulationView)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** "나에게 어떤 의미인가?" Uses tools only for details not already in the context. */
export async function runPortfolioAgent(ctx: RunContext): Promise<PortfolioFindings> {
  const portfolioTools = portfolioToolsFor(ctx.userId);
  const simulationTools = simulationToolsFor(ctx.userId);
  return ctx.tracer.step(
    "portfolio-agent",
    "llm",
    async (rec) => {
      const { model, config } = await modelFor("portfolio");
      rec.provider = config.provider;
      rec.model = config.model;
      const r = await generateText({
        model,
        system: PORTFOLIO_SYSTEM,
        prompt: `${contextBlock(ctx)}\n\n위 데이터를 바탕으로 사용자 질문이 사용자에게 어떤 의미인지 해석하세요. keyFacts는 숫자를 포함한 사실 문장, alternatives는 사용자가 택할 수 있는 행동들입니다.`,
        tools: ctx.tracer.traceTools({ ...portfolioTools, ...simulationTools }, rec.id),
        stopWhen: stepCountIs(5),
        output: Output.object({ schema: Findings }),
      });
      ctx.tracer.usage(rec, r.totalUsage, config.model);
      return r.output ?? { meaning: r.text, keyFacts: [], alternatives: [] };
    },
    { parallelGroup: "analysis", input: { message: ctx.message } },
  );
}

/** Simple-query path: portfolio data only, no synthesizer. */
export async function answerDirectly(ctx: RunContext): Promise<AgentAnswer> {
  const portfolioTools = portfolioToolsFor(ctx.userId);
  return ctx.tracer.step(
    "portfolio-agent",
    "llm",
    async (rec) => {
      const { model, config } = await modelFor("portfolio");
      rec.provider = config.provider;
      rec.model = config.model;
      const r = await generateText({
        model,
        system: PORTFOLIO_SYSTEM,
        prompt: `${contextBlock(ctx)}\n\n질문에 직접 답하되 AgentAnswer 구조로 작성하세요. evidence의 source는 데이터 출처 문자열을 사용하고, policyChecks는 제공된 것을 그대로 넣습니다.`,
        tools: ctx.tracer.traceTools(portfolioTools, rec.id),
        stopWhen: stepCountIs(4),
        output: Output.object({ schema: AgentAnswer }),
      });
      ctx.tracer.usage(rec, r.totalUsage, config.model);
      if (!r.output) throw new Error("portfolio agent produced no structured answer");
      return { ...r.output, policyChecks: ctx.policyChecks };
    },
    { input: { message: ctx.message } },
  );
}
