import { SourceBadge } from "@/components/source-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { krw, pct, signedPct } from "@/lib/format";
import { getPortfolioSnapshot } from "@/services/portfolio-aggregator";
import { currentUserId } from "@/lib/user-session";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const snap = await getPortfolioSnapshot(await currentUserId());
  const total = snap.totals.marketValueKRW;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">분석 대상 자산</h1>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{krw(total)}</p>
        <p className="text-xs text-muted-foreground">
          {snap.accounts.length}개 계좌 · 기준 {new Date(snap.asOf).toLocaleString("ko-KR")}
        </p>
      </header>

      {snap.accounts.map((acct) => {
        const positions = snap.positions
          .filter((p) => p.accountId === acct.id)
          .sort((a, b) => b.marketValueKRW - a.marketValueKRW);
        const acctTotal = positions.reduce((s, p) => s + p.marketValueKRW, 0);
        return (
          <Card key={acct.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{acct.name}</span>
                <SourceBadge account={acct} />
              </CardTitle>
              <p className="text-sm text-muted-foreground tabular-nums">
                {krw(acctTotal)} · 전체의 {pct((acctTotal / total) * 100)}
              </p>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {positions.map((p) => (
                  <li key={p.symbol} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.symbol}
                        {p.assetType !== "cash" && ` · ${p.quantity.toLocaleString()}주`}
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <p>{krw(p.marketValueKRW)}</p>
                      <p className="text-xs text-muted-foreground">
                        {pct((p.marketValueKRW / total) * 100)}
                        {p.dailyChangePct !== undefined && p.assetType !== "cash" && (
                          <span className={cn("ml-1", p.dailyChangePct < 0 ? "text-blue-600" : p.dailyChangePct > 0 ? "text-red-600" : "")}>
                            {signedPct(p.dailyChangePct)}
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      {snap.warnings.length > 0 && (
        <section className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">데이터 안내</p>
          <ul className="mt-1 list-disc pl-4">
            {snap.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-xs text-muted-foreground">
        <p className="font-medium">데이터 출처</p>
        <ul>
          {snap.sources.map((s) => (
            <li key={s.source}>
              {s.source}
              {s.isMock ? " (DEMO)" : ""}
              {s.asOf ? ` · 기준 ${new Date(s.asOf).toLocaleString("ko-KR")}` : ""}
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
