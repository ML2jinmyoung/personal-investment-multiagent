import { describe, expect, it } from "vitest";
import type { DecisionModel, ManyDecision, YesNoQuestion } from "@/decision";
import { buildPlan } from "@/orchestration/graph";
import { parseAmountKRW, parseMessage, route } from "@/orchestration/router";
import { Tracer } from "@/orchestration/tracer";

const held = ["NVDA", "QQQ", "VOO", "AAPL", "005930", "000660", "069500", "TSLA", "360750", "152380", "133690"];
const input = (message: string) => ({ message, hasPortfolio: true, hasPolicy: true, heldSymbols: held });

function fakeModel(p: number): DecisionModel {
  return {
    name: "jev",
    async choice() {
      throw new Error("unused");
    },
    async score() {
      throw new Error("unused");
    },
    async evaluate() {
      return { probability: p, meta: { model: "fake", latencyMs: 1 } };
    },
    async evaluateMany<K extends string>(_s: unknown, statements: Record<K, YesNoQuestion>): Promise<ManyDecision<K>> {
      return { probabilities: Object.fromEntries(Object.keys(statements).map((k) => [k, p])) as Record<K, number>, meta: { model: "fake", latencyMs: 1 } };
    },
  };
}

describe("message parsing", () => {
  it("parses Korean amounts", () => {
    expect(parseAmountKRW("NVDA 500만원 더 살까?")).toBe(5_000_000);
    expect(parseAmountKRW("삼성전자 1,000만 매수")).toBe(10_000_000);
    expect(parseAmountKRW("1억 정도")).toBe(100_000_000);
    expect(parseAmountKRW("3000000원어치")).toBe(3_000_000);
    expect(parseAmountKRW("10% 떨어지면")).toBeUndefined();
  });

  it("detects a trade with symbol aliases", () => {
    const p = parseMessage("요즘 엔비디아 실적 좋다던데 500만원 더 살까?", held);
    expect(p.symbols).toEqual(["NVDA"]);
    expect(p.trade).toEqual({ symbol: "NVDA", action: "buy", amountKRW: 5_000_000, quantity: undefined });
    expect(p.isPredictionRequest).toBe(false);
  });

  it("detects fx and symbol scenarios", () => {
    expect(parseMessage("환율이 10% 떨어지면?", held).scenario).toEqual({ kind: "fx", target: "USD", changePct: -10 });
    expect(parseMessage("NVDA가 30% 하락하면 내 포트폴리오는?", held).scenario).toEqual({ kind: "symbol", target: "NVDA", changePct: -30 });
    expect(parseMessage("기술주가 20% 빠지는 경우", held).scenario).toEqual({ kind: "sector", target: "Technology", changePct: -20 });
  });

  it("flags prediction requests and simple lookups", () => {
    expect(parseMessage("삼성전자 오를까?", held).isPredictionRequest).toBe(true);
    const simple = parseMessage("내가 제일 많이 가진 종목은?", held);
    expect(simple.symbols).toEqual([]);
    expect(simple.trade).toBeUndefined();
  });

  it("resolves a follow-up trade from recent conversation", () => {
    const parsed = parseMessage("그중 절반만 사면?", held, [
      { role: "user", content: "NVDA 500만원 더 살까?" },
      { role: "assistant", content: "현재 원칙상 비중 한도를 넘습니다." },
    ]);
    expect(parsed.trade).toEqual({ symbol: "NVDA", action: "buy", amountKRW: 2_500_000, quantity: undefined });
  });
});

describe("routing + plan", () => {
  it("rule routing: simple lookup avoids evidence, simulation and critic", async () => {
    const r = await route(input("내가 제일 많이 가진 종목은?"), null, new Tracer("t"));
    expect(r.decidedBy).toBe("rule");
    const plan = buildPlan(r);
    expect(plan).toMatchObject({ portfolio: true, simulation: false, evidence: false, simple: true });
  });

  it("rule routing: trade question runs portfolio + simulation + policy + evidence", async () => {
    const r = await route(input("NVDA 500만원 더 살까?"), null, new Tracer("t"));
    expect(buildPlan(r)).toMatchObject({ portfolio: true, simulation: true, evidence: true, policy: true, riskReview: true, simple: false });
  });

  it("jev routing with high confidence is not escalated", async () => {
    const r = await route(input("NVDA 500만원 더 살까?"), fakeModel(0.97), new Tracer("t"));
    expect(r.decidedBy).toBe("jev");
    expect(r.confidence).toBeCloseTo(0.94, 2);
    expect(r.escalated).toBe(false);
  });

  it("ambiguous jev answers fall below the threshold (escalation candidate)", async () => {
    const r = await route(input("이거 어때?"), fakeModel(0.55), new Tracer("t"));
    expect(r.confidence).toBeLessThan(0.7);
    expect(r.escalated).toBe(false); // no LLM configured in tests -> stays with jev
  });
});
