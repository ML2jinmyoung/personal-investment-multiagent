import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PolicyChecks } from "@/components/policy-checks";
import { RunFlow, type StepState } from "@/components/run-flow";
import { getDb, schema } from "@/db";
import { AgentAnswer, RoutingDecision, VerificationResult } from "@/domain/agent";
import { currentUserId } from "@/lib/user-session";

export const dynamic = "force-dynamic";

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t pt-3">
      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function TracePage({ params }: PageProps<"/trace/[runId]">) {
  const { runId } = await params;
  const db = await getDb();
  const run = await db.query.agentRuns.findFirst({ where: and(eq(schema.agentRuns.id, runId), eq(schema.agentRuns.userId, await currentUserId())) });
  if (!run) notFound();
  const steps = await db.select().from(schema.agentSteps).where(eq(schema.agentSteps.runId, runId)).orderBy(asc(schema.agentSteps.startedAt));
  const tools = await db.select().from(schema.toolCalls).where(eq(schema.toolCalls.runId, runId)).orderBy(asc(schema.toolCalls.createdAt));
  const routing = run.routing ? RoutingDecision.safeParse(JSON.parse(run.routing)) : undefined;
  const answer = run.answer ? AgentAnswer.safeParse(JSON.parse(run.answer)) : undefined;
  const verificationStep = steps.find((s) => s.name === "verification");
  const verification = verificationStep?.output ? VerificationResult.safeParse(JSON.parse(verificationStep.output)) : undefined;
  const groups = new Map<string, typeof steps>();
  for (const s of steps) if (s.parallelGroup) groups.set(s.parallelGroup, [...(groups.get(s.parallelGroup) ?? []), s]);

  return (
    <div className="space-y-4 text-sm">
      <header>
        <p className="text-xs text-muted-foreground">
          <Link href="/trace" className="underline">
            Runs
          </Link>{" "}
          / Run {run.id.slice(0, 8)}
        </p>
        <h1 className="text-lg font-semibold">&ldquo;{run.userMessage}&rdquo;</h1>
        <p className="text-xs text-muted-foreground">
          {new Date(run.startedAt).toLocaleString("ko-KR")} · {run.latencyMs ?? 0} ms{run.error ? ` · ERROR: ${run.error}` : ""}
        </p>
      </header>

      <Block title="ROUTING">
        {routing?.success ? (
          <div>
            <p>
              {routing.data.decidedBy}
              {routing.data.escalated ? " → LLM escalation" : ""} · {routing.data.latencyMs} ms · confidence {pct(routing.data.confidence)}
            </p>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 tabular-nums">
              {Object.entries(routing.data.scores).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k.replace("needs_", "")}</span>
                  <span>{pct(v)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">
              symbols: {routing.data.symbols.join(", ") || "-"}
              {routing.data.trade ? ` · trade: ${JSON.stringify(routing.data.trade)}` : ""}
              {routing.data.scenario ? ` · scenario: ${JSON.stringify(routing.data.scenario)}` : ""}
              {routing.data.isPredictionRequest ? " · prediction request" : ""}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">no routing recorded</p>
        )}
      </Block>

      <Block title="EXECUTION">
        <RunFlow
          routing={routing?.success ? routing.data : undefined}
          steps={steps.map<StepState>((s) => ({
            type: "step",
            name: s.name,
            status: s.status as StepState["status"],
            kind: s.kind as StepState["kind"],
            provider: s.provider ?? undefined,
            model: s.model ?? undefined,
            latencyMs: s.latencyMs ?? undefined,
            parallelGroup: s.parallelGroup ?? undefined,
            detail: s.status === "skipped" && s.output ? (JSON.parse(s.output).reason as string) : undefined,
          }))}
        />
        <ul className="space-y-1 pt-2">
          {steps.map((s) => (
            <li key={s.id} className={`flex items-baseline justify-between gap-2 ${s.status === "skipped" ? "text-muted-foreground" : ""}`}>
              <span>
                {s.status === "skipped" ? "⊘ " : s.status === "error" ? "✕ " : "✓ "}
                {s.name}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  · {s.kind}
                  {s.provider ? ` · ${s.provider}` : ""}
                  {s.model ? ` · ${s.model}` : ""}
                  {s.parallelGroup ? ` · ∥ ${s.parallelGroup}` : ""}
                  {s.status === "skipped" && s.output ? ` · ${JSON.parse(s.output).reason}` : ""}
                </span>
              </span>
              <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                {s.latencyMs ?? 0} ms{s.inputTokens ? ` · ${s.inputTokens}/${s.outputTokens ?? 0} tok` : ""}
              </span>
            </li>
          ))}
        </ul>
        {[...groups.entries()].map(([g, list]) => (
          <p key={g} className="text-xs text-muted-foreground">
            {list.map((s) => s.name).join(" + ")} executed in parallel ({g})
          </p>
        ))}
        {tools.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer">Tool calls ({tools.length})</summary>
            <ul className="mt-1 space-y-1">
              {tools.map((t) => (
                <li key={t.id}>
                  {t.status === "error" ? "✕" : "✓"} {t.tool}({t.input}) · {t.latencyMs} ms
                </li>
              ))}
            </ul>
          </details>
        )}
      </Block>

      <Block title="POLICY">{answer?.success ? <PolicyChecks checks={answer.data.policyChecks} /> : <p className="text-muted-foreground">-</p>}</Block>

      <Block title="VERIFICATION">
        {verification?.success ? (
          <div>
            <p>
              {verification.data.decidedBy} · {verification.data.latencyMs} ms · {verification.data.needsCritic ? "→ LLM Critic" : "pass"}
            </p>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 tabular-nums">
              {Object.entries(verification.data.scores).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span>{pct(v)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">LLM Critic: {steps.find((s) => s.name === "llm-critic")?.status ?? "-"}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">-</p>
        )}
      </Block>

      <Block title="TOTAL">
        <ul className="grid grid-cols-2 gap-x-4 tabular-nums">
          <li className="flex justify-between"><span>Decision calls</span><span>{run.decisionCalls}</span></li>
          <li className="flex justify-between"><span>LLM calls</span><span>{run.llmCalls}</span></li>
          <li className="flex justify-between"><span>Tool calls</span><span>{run.toolCalls}</span></li>
          <li className="flex justify-between"><span>Agents avoided</span><span>{steps.filter((s) => s.status === "skipped").length}</span></li>
          <li className="flex justify-between"><span>Tokens in/out</span><span>{run.inputTokens ?? 0}/{run.outputTokens ?? 0}</span></li>
          <li className="flex justify-between"><span>Est. cost</span><span>${(run.estimatedCost ?? 0).toFixed(4)}</span></li>
        </ul>
      </Block>
    </div>
  );
}
