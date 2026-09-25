import type { AgentAnswer, RoutingDecision } from "@/domain/agent";
import type { PolicyCheck } from "@/domain/policy";
import type { SimulationResult } from "@/domain/simulation";
import type { Tracer } from "@/orchestration/tracer";
import type { SimulationView } from "@/tools/simulation-tools";
import type { snapshotView } from "@/tools/portfolio-tools";

export type SnapshotView = Awaited<ReturnType<typeof snapshotView>>;

/** Everything an agent may need; deterministic parts are computed by the orchestrator before any LLM runs. */
export interface RunContext {
  userId: string;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  routing: RoutingDecision;
  tracer: Tracer;
  snapshot: SnapshotView;
  policyChecks: PolicyCheck[];
  simulation?: SimulationResult;
  simulationView?: SimulationView;
  policy: unknown;
}

export interface PortfolioFindings {
  meaning: string;
  keyFacts: string[];
  alternatives: string[];
}

export interface EvidenceFindings {
  evidence: AgentAnswer["evidence"];
  risks: string[];
  limitations: string[];
}
