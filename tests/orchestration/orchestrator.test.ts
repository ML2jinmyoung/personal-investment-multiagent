import { describe, expect, it } from "vitest";
import { AgentAnswer } from "@/domain/agent";
import { runAgent } from "@/orchestration/orchestrator";

describe("orchestrator (no LLM configured -> deterministic path)", () => {
  it("NVDA 500만원 buy: simulation + policy violation, evidence/critic avoided, trace persisted", async () => {
    const events: string[] = [];
    const r = await runAgent("NVDA 500만원 더 살까?", (e) => events.push(e.type === "step" ? `${e.name}:${e.status}` : e.type));
    expect(AgentAnswer.safeParse(r.answer).success).toBe(true);
    expect(r.answer.policyChecks.find((c) => c.rule === "singleStockPct")?.status).toBe("violation");
    expect(r.answer.recommendation).toContain("추가 거래를 하지 않");
    expect(r.answer.alternatives.some((a) => a.title.includes("아무것도"))).toBe(true);
    expect(r.answer.costs.length).toBeGreaterThan(0);
    expect(events).toContain("simulation-engine:ok");
    expect(events).toContain("evidence-agent:skipped");
    expect(events).toContain("llm-critic:skipped");
    expect(r.summary.llmCalls).toBe(0);
    expect(r.summary.agentsAvoided).toBeGreaterThan(0);
  });

  it("prediction request is refused as prediction and answered with limitations", async () => {
    const r = await runAgent("삼성전자 오를까?");
    expect(r.routing.isPredictionRequest).toBe(true);
    expect(r.answer.limitations[0]).toContain("예측하지 않습니다");
  });

  it("fx scenario runs the deterministic simulation", async () => {
    const r = await runAgent("환율이 10% 떨어지면 내 자산은?");
    expect(r.routing.scenario).toEqual({ kind: "fx", target: "USD", changePct: -10 });
    expect(r.answer.evidence.some((e) => e.kind === "simulation" && e.claim.includes("영향"))).toBe(true);
  });
});
