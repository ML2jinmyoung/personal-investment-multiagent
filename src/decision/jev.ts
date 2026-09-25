import {
  type ChoiceDecision,
  type DecisionMeta,
  type DecisionModel,
  DecisionUnavailableError,
  type ManyDecision,
  type ProbabilityDecision,
  type ScoreCriteria,
  type ScoreDecision,
  toChoiceMap,
  type YesNoQuestion,
} from "./interface";

// TypeSafe System-One API: POST /v1/systemone  (https://docs.typesafe.ai/api)
type JevQuestion =
  | { type: "noul"; instructions: unknown; criteria?: { true?: unknown; false?: unknown } }
  | { type: "choice"; instructions: unknown; criteria: Record<string, unknown> }
  | { type: "score"; instructions: unknown; criteria: unknown[] };
type JevAnswer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; confidence: number; probabilities: Record<string, number> }
  | { type: "score"; score: number; confidence: number; probabilities?: Record<string, number> };
type JevResponse = { model: string; answers: Record<string, JevAnswer>; usage?: { input_tokens: number; output_tokens: number } };

export class JevDecisionModel implements DecisionModel {
  readonly name = "jev" as const;

  constructor(
    private apiKey: string,
    private model = process.env.JEV_MODEL || "jev-latest",
    private baseUrl = process.env.JEV_BASE_URL || "https://api.typesafe.ai",
    private timeoutMs = Number(process.env.JEV_TIMEOUT_MS ?? 20_000),
    private maxStateChars = Number(process.env.JEV_MAX_STATE_CHARS ?? 6000),
  ) {}

  private async ask(state: unknown, questions: Record<string, JevQuestion>): Promise<{ answers: Record<string, JevAnswer>; meta: DecisionMeta }> {
    const started = Date.now();
    // System-One models are fast only on compact state; oversized state is sent as truncated text rather than stalling
    const json = JSON.stringify(state);
    if (json.length > this.maxStateChars) state = json.slice(0, this.maxStateChars) + " …[truncated]";
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/v1/systemone`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, state, questions }),
        cache: "no-store",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      throw new DecisionUnavailableError(`jev: ${(e as Error).name === "TimeoutError" ? `timeout after ${this.timeoutMs}ms` : "network error"}`);
    }
    if (!res.ok) throw new DecisionUnavailableError(`jev: HTTP ${res.status}`);
    const j = (await res.json()) as JevResponse;
    return { answers: j.answers, meta: { model: j.model, latencyMs: Date.now() - started, inputTokens: j.usage?.input_tokens, outputTokens: j.usage?.output_tokens } };
  }

  async choice<T extends string>(state: unknown, choices: readonly T[] | Record<T, string | null>, question: string): Promise<ChoiceDecision<T>> {
    const { answers, meta } = await this.ask(state, { q: { type: "choice", instructions: question, criteria: toChoiceMap(choices) } });
    const a = answers.q;
    if (a.type !== "choice") throw new DecisionUnavailableError("jev: unexpected answer type");
    return { choice: a.choice as T, confidence: a.confidence, probabilities: a.probabilities as Record<T, number>, meta };
  }

  async score(state: unknown, criteria: ScoreCriteria): Promise<ScoreDecision> {
    const { answers, meta } = await this.ask(state, { q: { type: "score", instructions: criteria.question, criteria: criteria.levels } });
    const a = answers.q;
    if (a.type !== "score") throw new DecisionUnavailableError("jev: unexpected answer type");
    return { score: a.score, confidence: a.confidence, probabilities: a.probabilities, meta };
  }

  async evaluate(state: unknown, statement: string, criteria?: { true?: string; false?: string }): Promise<ProbabilityDecision> {
    const r = await this.evaluateMany(state, { q: { question: statement, ...criteria } });
    return { probability: r.probabilities.q, meta: r.meta };
  }

  async evaluateMany<K extends string>(state: unknown, statements: Record<K, YesNoQuestion>): Promise<ManyDecision<K>> {
    const questions = Object.fromEntries(
      Object.entries<YesNoQuestion>(statements).map(([k, q]) => [
        k,
        typeof q === "string" ? { type: "noul", instructions: q } : { type: "noul", instructions: q.question, criteria: q.true || q.false ? { true: q.true, false: q.false } : undefined },
      ]),
    ) as Record<string, JevQuestion>;
    const { answers, meta } = await this.ask(state, questions);
    const probabilities = {} as Record<K, number>;
    for (const k of Object.keys(statements) as K[]) {
      const a = answers[k];
      if (!a || a.type !== "noul") throw new DecisionUnavailableError(`jev: missing answer ${k}`);
      probabilities[k] = a.noul;
    }
    return { probabilities, meta };
  }
}
