"use client";

import type { AgentStreamEvent, RoutingDecision } from "@/domain/agent";
import { cn } from "@/lib/utils";

export type StepState = Extract<AgentStreamEvent, { type: "step" }>;

/** Node vocabulary: what each step is, in the user's words. The graph shape mirrors src/orchestration/graph.ts. */
const NODES: Record<string, { label: string; role: string; engine: "decision" | "code" | "llm" }> = {
  router: { label: "Router", role: "무엇이 필요한지 판단", engine: "decision" },
  "exposure-engine": { label: "Exposure", role: "노출 계산", engine: "code" },
  "simulation-engine": { label: "Simulation", role: "What-if 계산", engine: "code" },
  "policy-engine": { label: "Policy", role: "원칙 점검", engine: "code" },
  "portfolio-agent": { label: "Portfolio", role: "나에게 어떤 의미인가", engine: "llm" },
  "evidence-agent": { label: "Evidence", role: "외부에서 확인된 사실", engine: "llm" },
  "template-synthesizer": { label: "Template", role: "규칙 기반 답변", engine: "code" },
  synthesizer: { label: "Synthesizer", role: "근거·대안·위험·비용 구조화", engine: "llm" },
  verification: { label: "Verification", role: "근거 없는 주장·예측 검사", engine: "decision" },
  "llm-critic": { label: "Critic", role: "문제 있을 때만 비평", engine: "llm" },
  "synthesizer-revision": { label: "Revision", role: "비평 반영 수정", engine: "llm" },
};

type Stage = { nodes: string[]; layout: "single" | "chain" | "parallel" | "conditional"; caption?: string };
const STAGES: Stage[] = [
  { nodes: ["router"], layout: "single" },
  { nodes: ["exposure-engine", "simulation-engine", "policy-engine"], layout: "chain", caption: "결정론적 계산" },
  { nodes: ["portfolio-agent", "evidence-agent"], layout: "parallel", caption: "동시 실행" },
  { nodes: ["synthesizer", "template-synthesizer"], layout: "single" },
  { nodes: ["verification"], layout: "single" },
  { nodes: ["llm-critic", "synthesizer-revision"], layout: "conditional", caption: "검증에 걸렸을 때만" },
];

const ENGINE_LABEL = { decision: "Jev", code: "code", llm: "LLM" } as const;

type Status = "idle" | "running" | "ok" | "skipped" | "error";
const GLYPH: Record<Status, string> = { idle: "○", running: "●", ok: "✓", skipped: "⊘", error: "✕" };
const GLYPH_CLASS: Record<Status, string> = {
  idle: "text-muted-foreground/60",
  running: "text-primary motion-safe:animate-pulse",
  ok: "text-emerald-600",
  skipped: "text-muted-foreground",
  error: "text-red-600",
};

function statusOf(s?: StepState): Status {
  if (!s) return "idle";
  return s.status === "started" ? "running" : s.status;
}

function Node({ name, step, compact }: { name: string; step?: StepState; compact?: boolean }) {
  const meta = NODES[name] ?? { label: name, role: "", engine: "code" as const };
  const status = statusOf(step);
  const where = step?.provider ?? (status !== "idle" && status !== "skipped" && meta.engine === "code" ? "code" : undefined);
  const detail =
    status === "skipped"
      ? `건너뜀 · ${step?.detail ?? ""}`
      : status === "error"
        ? `실패 · ${step?.detail ?? ""}`
        : status === "running"
          ? `${meta.role} · 실행 중`
          : status === "ok"
            ? `${meta.role}${step?.latencyMs !== undefined ? ` · ${step.latencyMs} ms` : ""}`
            : meta.role;
  const box = cn(
    "rounded-lg border bg-card transition-colors duration-300",
    status === "running" && "border-primary ring-2 ring-primary/30",
    status === "skipped" && "border-dashed text-muted-foreground",
    status === "idle" && "text-muted-foreground/70",
    status === "error" && "border-red-400",
  );
  const glyph = (
    <span aria-hidden className={cn("w-3 shrink-0 text-center text-xs font-semibold", GLYPH_CLASS[status])}>
      {GLYPH[status]}
    </span>
  );
  const badge = <span className="ml-auto shrink-0 rounded bg-muted px-1 text-[11px] leading-4 text-muted-foreground">{ENGINE_LABEL[meta.engine]}</span>;
  const label = <span className={cn("shrink-0 text-sm font-medium", status === "skipped" && "line-through decoration-muted-foreground/60")}>{meta.label}</span>;

  if (compact) {
    return (
      <div role="listitem" aria-label={`${meta.label}: ${status}${step?.detail ? `, ${step.detail}` : ""}`} className={cn(box, "flex items-center gap-2 px-2.5 py-1.5")}>
        {glyph}
        {label}
        <span className="min-w-0 truncate text-xs text-muted-foreground">{detail}</span>
        {badge}
      </div>
    );
  }
  return (
    <div role="listitem" aria-label={`${meta.label}: ${status}${step?.detail ? `, ${step.detail}` : ""}`} className={cn(box, "px-2.5 py-2")}>
      <div className="flex items-center gap-1.5">
        {glyph}
        {label}
        {badge}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
      {(where || step?.model) && status !== "idle" && status !== "skipped" && (
        <p className="truncate text-[11px] leading-4 text-muted-foreground">
          {where}
          {step?.model ? ` · ${step.model}` : ""}
        </p>
      )}
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return <div aria-hidden className={cn("mx-auto h-3 w-px transition-colors duration-300", active ? "bg-foreground/60" : "bg-border")} />;
}

/**
 * Live flow chart of one agent run. Nodes light up as SSE step events arrive; the same component replays a persisted run.
 * Status is carried by glyph + text, never by color alone; the only motion is a pulse on the running node (off under reduced motion).
 */
export function RunFlow({ steps, routing }: { steps: StepState[]; routing?: RoutingDecision }) {
  const byName = new Map(steps.map((s) => [s.name, s]));
  const stageDone = (st: Stage) => st.nodes.some((n) => ["ok", "error", "skipped"].includes(statusOf(byName.get(n))));
  const visible = STAGES.map((st) => ({ ...st, nodes: st.layout === "single" && st.nodes.length > 1 ? [st.nodes.find((n) => byName.has(n)) ?? st.nodes[0]] : st.nodes }));

  return (
    <div role="list" aria-label="에이전트 실행 흐름" className="text-sm">
      {routing && (
        <p className="mb-2 text-xs text-muted-foreground">
          {routing.decidedBy}
          {routing.escalated ? " → LLM" : ""} · 확신 {Math.round(routing.confidence * 100)}% ·{" "}
          {Object.entries(routing.scores)
            .filter(([, v]) => v >= 0.5)
            .map(([k]) => k.replace("needs_", ""))
            .join(" · ") || "lookup only"}
        </p>
      )}
      {visible.map((st, i) => (
        <div key={st.nodes.join("+")}>
          {i > 0 && <Connector active={stageDone(visible[i - 1])} />}
          {st.caption && <p className="mb-1 text-center text-[11px] leading-4 text-muted-foreground">{st.caption}</p>}
          {st.layout === "parallel" ? (
            <div className="grid grid-cols-2 gap-2">
              {st.nodes.map((n) => (
                <Node key={n} name={n} step={byName.get(n)} />
              ))}
            </div>
          ) : st.layout === "chain" || st.layout === "conditional" ? (
            <div className={cn("space-y-1 rounded-xl p-1", st.layout === "conditional" && "border border-dashed")}>
              {st.nodes.map((n) => (
                <Node key={n} name={n} step={byName.get(n)} compact />
              ))}
            </div>
          ) : (
            <Node name={st.nodes[0]} step={byName.get(st.nodes[0])} />
          )}
        </div>
      ))}
    </div>
  );
}
