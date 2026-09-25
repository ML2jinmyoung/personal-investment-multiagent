import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { todayModelHooks } from "@/agents/today-hooks";
import { krw } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getToday } from "@/services/today-service";
import { currentUserId } from "@/lib/user-session";

export const dynamic = "force-dynamic";

const TYPE_LABEL = { price_move: "가격 변동", fx_move: "환율", policy: "투자 원칙", warning: "투자 유의", filing: "공시" } as const;

export default async function HomePage() {
  const today = await getToday(await currentUserId(), todayModelHooks());
  const pnlColor = today.dailyPnLKRW < 0 ? "text-blue-600" : today.dailyPnLKRW > 0 ? "text-red-600" : "";

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">My AI PB</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          연결 자산 {krw(today.totalValueKRW)} · 오늘 <span className={cn("font-medium tabular-nums", pnlColor)}>{krw(today.dailyPnLKRW)}</span>
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium">오늘 내 돈에 중요한 변화 {today.items.length}개</h2>
        {today.items.length === 0 && <p className="text-sm text-muted-foreground">오늘은 특별히 중요한 변화가 없습니다.</p>}
        {today.items.map((item, i) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2 text-base">
                <span>
                  {i + 1}. {item.title}
                </span>
                <Badge variant="outline">{TYPE_LABEL[item.type]}</Badge>
              </CardTitle>
              {item.portfolioImpactKRW !== 0 && (
                <p className={cn("text-sm tabular-nums", item.portfolioImpactKRW < 0 ? "text-blue-600" : "text-red-600")}>
                  내 자산 영향 {krw(item.portfolioImpactKRW)}
                  {item.exposurePct !== undefined && <span className="text-muted-foreground"> · 노출 {item.exposurePct}%</span>}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{item.explanation}</p>
              <p className="text-xs text-muted-foreground">
                중요도 {Math.round(item.importance * 100)}% · {item.explanationBy === "llm" ? "AI 설명" : "규칙 기반 설명"}
                {item.sources.some((s) => s.isMock) && " · DEMO 데이터"}
              </p>
              <Link href={{ pathname: "/agent", query: { q: item.symbol ? `${item.title} 나에게 어떤 의미야?` : `${item.title} 내 포트폴리오에 어떤 영향이야?` } }} className="text-xs underline underline-offset-4">
                AI PB에게 물어보기
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>

      <Link href="/agent" className="block rounded-md border p-3 text-sm text-muted-foreground">
        Ask your PB… 예) NVDA 500만원 더 살까?
      </Link>

      {today.limitations.length > 0 && (
        <section className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">확인하지 못한 데이터</p>
          <ul className="mt-1 list-disc pl-4">
            {today.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-muted-foreground">미래 가격 예측이 아니라 현재 보유 자산 기준의 계산입니다.</p>
    </div>
  );
}
