import { generateObject } from "ai";
import { z } from "zod";
import { decisionModel } from "@/decision";
import type { TodayItem } from "@/domain/today";
import { llmAvailable, modelFor } from "@/providers/llm/registry";
import type { TodayModelHooks } from "@/services/today-service";
import { TODAY_EXPLAIN_SYSTEM } from "./prompts";

/** Every number in an explanation must already appear in the deterministic facts. */
export function numbersGrounded(text: string, facts: string[]): boolean {
  const allowed = new Set((facts.join(" ").match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/,/g, "")));
  return (text.match(/\d[\d,.]*/g) ?? []).every((n) => allowed.has(n.replace(/,/g, "").replace(/\.$/, "")));
}

export function todayModelHooks(): TodayModelHooks {
  const hooks: TodayModelHooks = {};
  const dm = decisionModel();
  if (dm) {
    hooks.relevance = async (all) => {
      // keep the System-One call small: top candidates by deterministic score, short facts
      const candidates = [...all].sort((a, b) => b.scores.financialImpact + b.scores.policyRelevance - a.scores.financialImpact - a.scores.policyRelevance).slice(0, 6);
      const state = { candidates: candidates.map((c) => ({ id: c.id, type: c.type, title: c.title, facts: c.facts.slice(0, 3).map((f) => f.slice(0, 120)) })) };
      const questions = Object.fromEntries(
        candidates.map((c) => [
          c.id,
          {
            question: `Is candidate \`${c.id}\` materially relevant to this investor today and worth surfacing on the home screen?`,
            true: "Meaningful money impact, policy concern, or a fact the investor should know today",
            false: "Noise, tiny impact, or nothing actionable",
          },
        ]),
      );
      return (await dm.evaluateMany(state, questions)).probabilities;
    };
  }
  if (llmAvailable()) {
    hooks.explain = async (items: TodayItem[]) => {
      const { model } = await modelFor("synthesizer");
      const { object } = await generateObject({
        model,
        schema: z.object({ explanations: z.array(z.object({ id: z.string(), explanation: z.string() })) }),
        system: TODAY_EXPLAIN_SYSTEM,
        prompt: JSON.stringify(items.map((i) => ({ id: i.id, title: i.title, facts: i.facts }))),
      });
      return items.map((i) => {
        const e = object.explanations.find((x) => x.id === i.id)?.explanation;
        return e && numbersGrounded(e, i.facts) ? { ...i, explanation: e, explanationBy: "llm" as const } : i;
      });
    };
  }
  return hooks;
}
