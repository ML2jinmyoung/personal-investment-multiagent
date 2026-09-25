import Link from "next/link";
import { PolicyChecks } from "@/components/policy-checks";
import type { AgentAnswer } from "@/domain/agent";
import { krw } from "@/lib/format";

const SEVERITY = { low: "text-muted-foreground", medium: "text-amber-700", high: "text-red-700" } as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** Renders the structured AgentAnswer section by section: Evidence -> Alternatives -> Risk -> Cost -> Policy -> Recommendation. */
export function AnswerCard({ answer, runId, showTrace }: { answer: AgentAnswer; runId?: string; showTrace?: boolean }) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 text-sm">
      <p className="font-medium">{answer.summary}</p>
      <Section title="Evidence">
        <ul className="space-y-1">
          {answer.evidence.map((e, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>
                {e.claim}
                <span className="block text-xs text-muted-foreground">
                  {e.source}
                  {e.asOf ? ` · ${e.asOf.slice(0, 10)}` : ""}
                  {e.isMock ? " · DEMO" : ""}
                  {e.url && (
                    <>
                      {" · "}
                      <a href={e.url} target="_blank" rel="noreferrer" className="underline">
                        원문
                      </a>
                    </>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Alternatives">
        <ul className="space-y-1">
          {answer.alternatives.map((a, i) => (
            <li key={i}>
              <span className="font-medium">{a.title}</span> <span className="text-muted-foreground">— {a.description}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Risk & Uncertainty">
        <ul className="space-y-1">
          {answer.risks.map((r, i) => (
            <li key={i}>
              <span className={`font-medium ${SEVERITY[r.severity]}`}>{r.title}</span> <span className="text-muted-foreground">— {r.description}</span>
            </li>
          ))}
        </ul>
      </Section>
      {answer.costs.length > 0 && (
        <Section title="Cost">
          <ul className="space-y-0.5 tabular-nums">
            {answer.costs.map((c, i) => (
              <li key={i} className="flex justify-between">
                <span>{c.label}</span>
                <span>
                  {c.amountKRW !== undefined ? krw(c.amountKRW) : ""}
                  {c.note ? <span className="ml-1 text-xs text-muted-foreground">{c.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Investment Policy Check">
        <PolicyChecks checks={answer.policyChecks} />
      </Section>
      <Section title="Recommendation">
        <p>{answer.recommendation}</p>
      </Section>
      {answer.limitations.length > 0 && (
        <Section title="Limitations">
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
            {answer.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </Section>
      )}
      {showTrace && runId && (
        <Link href={`/trace/${runId}`} className="block text-xs text-muted-foreground underline underline-offset-4">
          Developer trace
        </Link>
      )}
    </div>
  );
}
