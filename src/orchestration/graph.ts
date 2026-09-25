import type { RoutingDecision } from "@/domain/agent";

/** Which nodes run. The graph shape itself is fixed in code; models only answer atomic questions. */
export interface Plan {
  portfolio: boolean;
  simulation: boolean;
  evidence: boolean;
  policy: boolean;
  riskReview: boolean;
  /** portfolio lookup only: Router -> Portfolio Agent -> Answer */
  simple: boolean;
}

const ON = 0.5;

export function buildPlan(r: RoutingDecision): Plan {
  const simulation = r.scores.needs_simulation >= ON && Boolean(r.trade || r.scenario);
  const evidence = r.scores.needs_external_evidence >= ON && r.symbols.length > 0;
  const policy = r.scores.needs_policy_check >= ON || simulation;
  const riskReview = r.scores.needs_risk_review >= ON || r.isPredictionRequest;
  const portfolio = r.scores.needs_portfolio_data >= ON || simulation || policy;
  return { portfolio, simulation, evidence, policy, riskReview, simple: portfolio && !simulation && !evidence && !riskReview };
}

/** Static description used by the trace UI. */
export const GRAPH = [
  { node: "router", kind: "decision", after: [] },
  { node: "exposure-engine", kind: "deterministic", after: ["router"] },
  { node: "simulation-engine", kind: "deterministic", after: ["exposure-engine"] },
  { node: "policy-engine", kind: "deterministic", after: ["simulation-engine"] },
  { node: "portfolio-agent", kind: "llm", after: ["policy-engine"], parallelGroup: "analysis" },
  { node: "evidence-agent", kind: "llm", after: ["router"], parallelGroup: "analysis" },
  { node: "synthesizer", kind: "llm", after: ["portfolio-agent", "evidence-agent"] },
  { node: "verification", kind: "decision", after: ["synthesizer"] },
  { node: "llm-critic", kind: "llm", after: ["verification"] },
  { node: "synthesizer-revision", kind: "llm", after: ["llm-critic"] },
] as const;
