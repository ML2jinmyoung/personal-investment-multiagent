import { tool } from "ai";
import { z } from "zod";
import { ScenarioShock, SimulationResult } from "@/domain/simulation";
import { runSimulation, SimulationError } from "@/services/simulation-engine";
import { r1 } from "./shared";

/** Compact simulation view for the model: no raw metric dumps. */
export const SimulationView = z.object({
  kind: z.literal("simulation"),
  changes: z.array(z.object({ label: z.string(), before: z.number(), after: z.number(), unit: z.string() })),
  cost: z.object({ commissionKRW: z.number(), taxKRW: z.number(), fxKRW: z.number(), totalKRW: z.number(), note: z.string() }).optional(),
  impactKRW: z.number().optional(),
  policyChecks: z.array(z.object({ rule: z.string(), label: z.string(), status: z.string(), limit: z.number().optional(), before: z.number().optional(), after: z.number().optional(), subject: z.string().optional(), note: z.string().optional() })),
  buyingPowerAfterKRW: z.number(),
  warnings: z.array(z.string()),
});
export type SimulationView = z.infer<typeof SimulationView>;

export function simulationView(r: SimulationResult): SimulationView {
  return SimulationView.parse({
    kind: "simulation",
    changes: r.changes.map((c) => ({ label: c.label, before: c.before, after: c.after, unit: c.unit })),
    cost: r.cost,
    impactKRW: r.impactKRW,
    policyChecks: r.policyChecks,
    buyingPowerAfterKRW: Math.round(r.after.buyingPowerKRW),
    warnings: r.warnings,
  });
}

async function run(req: Parameters<typeof runSimulation>[0], userId: string) {
  try {
    return simulationView(await runSimulation(req, { userId }));
  } catch (e) {
    return { error: e instanceof SimulationError ? e.message : "시뮬레이션을 수행하지 못했습니다.", source: "simulation" };
  }
}

export function simulationToolsFor(userId = "demo") { return {
  simulateTrade: tool({
    description: "가상의 매수/매도를 현재 포트폴리오에 적용해 비중·노출·비용·투자 원칙 위반 여부를 결정론적으로 계산한다. 실제 주문은 발생하지 않는다.",
    inputSchema: z.object({ symbol: z.string(), action: z.enum(["buy", "sell"]), amountKRW: z.number().positive().optional(), quantity: z.number().positive().optional() }),
    execute: (input) => run({ type: "trade", ...input }, userId),
  }),
  simulateScenario: tool({
    description: "가정 시나리오(종목/섹터/환율/시장 ±X%)가 현재 포트폴리오에 주는 영향을 계산한다. 예측이 아니라 가정이다.",
    inputSchema: z.object({ shocks: z.array(ScenarioShock).min(1).max(5) }),
    execute: ({ shocks }) => run({ type: "scenario", shocks }, userId),
  }),
}; }

export const simulationTools = simulationToolsFor();

export { r1 };
