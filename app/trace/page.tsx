import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { currentUserId } from "@/lib/user-session";

export const dynamic = "force-dynamic";

/** Developer-only list of recent runs; not linked from the bottom navigation. */
export default async function TraceListPage() {
  const db = await getDb();
  const runs = await db.select().from(schema.agentRuns).where(eq(schema.agentRuns.userId, await currentUserId())).orderBy(desc(schema.agentRuns.startedAt)).limit(50);
  return (
    <div className="space-y-3 text-sm">
      <h1 className="text-lg font-semibold">Agent runs</h1>
      {runs.length === 0 && <p className="text-muted-foreground">아직 실행 기록이 없습니다.</p>}
      <ul className="divide-y">
        {runs.map((r) => (
          <li key={r.id} className="py-2">
            <Link href={`/trace/${r.id}`} className="block">
              <p className="font-medium">{r.userMessage}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.startedAt).toLocaleString("ko-KR")} · {r.latencyMs ?? 0} ms · decision {r.decisionCalls} · llm {r.llmCalls} · tools {r.toolCalls}
                {r.error ? " · error" : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
