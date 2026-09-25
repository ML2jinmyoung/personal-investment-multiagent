import { llmAvailable } from "@/providers/llm/registry";
import type { DecisionModel } from "./interface";
import { JevDecisionModel } from "./jev";
import { LLMDecisionModel } from "./llm-fallback";

export * from "./interface";

/** DECISION_PROVIDER=jev (default) with TYPESAFE_API_KEY -> Jev; otherwise LLM structured output; null when nothing is configured. */
export function decisionModel(): DecisionModel | null {
  const pref = process.env.DECISION_PROVIDER ?? "jev";
  if (pref === "jev" && process.env.TYPESAFE_API_KEY) return new JevDecisionModel(process.env.TYPESAFE_API_KEY);
  if (llmAvailable()) return new LLMDecisionModel();
  return null;
}

export const ROUTING_THRESHOLD = Number(process.env.ROUTING_THRESHOLD ?? 0.7);
export const VERIFICATION_THRESHOLD = Number(process.env.VERIFICATION_THRESHOLD ?? 0.3);
