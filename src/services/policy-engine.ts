import { type InvestmentPolicy, type PolicyCheck } from "@/domain/policy";
import type { PortfolioMetrics } from "@/domain/simulation";

export interface PolicyCheckContext {
  /** the check is for a hypothetical trade (enables horizon / fx-preference notes) */
  isTrade?: boolean;
  /** scenario loss as a positive % of the portfolio, enables maxDrawdown check */
  scenarioLossPct?: number;
}

const WARN_RATIO = 0.9; // within 90% of a limit -> "warning" (policy proximity)
const r1 = (n: number) => Math.round(n * 10) / 10;

function maxCheck(rule: string, label: string, limit: number | undefined, before: number, after: number, subject?: string): PolicyCheck | undefined {
  if (limit === undefined) return undefined;
  const status = after > limit ? "violation" : after >= limit * WARN_RATIO ? "warning" : "ok";
  return { rule, label, status, limit, before: r1(before), after: r1(after), subject };
}

function largest(weights: Record<string, number>): [string, number] {
  return Object.entries(weights).reduce<[string, number]>((m, e) => (e[1] > m[1] ? e : m), ["-", 0]);
}

/**
 * Deterministic policy check. `before` and `after` are the same object when checking a single snapshot.
 * Never calls a model.
 */
export function checkPolicy(before: PortfolioMetrics, after: PortfolioMetrics, policy: InvestmentPolicy, ctx: PolicyCheckContext = {}): PolicyCheck[] {
  const checks: PolicyCheck[] = [];
  const { limits, preferences } = policy;

  if (limits.singleStockPct !== undefined) {
    const stocks = after.symbols.filter((s) => s.kind === "stock");
    const flagged = stocks.filter((s) => s.portfolioWeightPct >= limits.singleStockPct! * WARN_RATIO);
    const targets = flagged.length ? flagged : stocks.slice(0, 1);
    for (const s of targets) {
      const b = before.symbols.find((x) => x.key === s.key)?.portfolioWeightPct ?? 0;
      checks.push(maxCheck("singleStockPct", "단일 종목 최대 비중", limits.singleStockPct, b, s.portfolioWeightPct, s.key)!);
    }
    if (!targets.length) checks.push({ rule: "singleStockPct", label: "단일 종목 최대 비중", status: "ok", limit: limits.singleStockPct, before: 0, after: 0 });
  }

  if (limits.sectorPct !== undefined) {
    const [sector, w] = largest(after.weights.bySector);
    checks.push(maxCheck("sectorPct", "단일 섹터 최대 비중", limits.sectorPct, before.weights.bySector[sector] ?? 0, w, sector)!);
  }

  if (limits.overseasPct !== undefined) checks.push(maxCheck("overseasPct", "해외자산 최대 비중", limits.overseasPct, before.overseasPct, after.overseasPct)!);
  if (limits.riskyAssetPct !== undefined) checks.push(maxCheck("riskyAssetPct", "위험자산 최대 비중", limits.riskyAssetPct, before.riskyAssetPct, after.riskyAssetPct)!);

  if (limits.minLiquidityPct !== undefined) {
    const min = limits.minLiquidityPct;
    const status = after.cashPct < min ? "violation" : after.cashPct < min / WARN_RATIO ? "warning" : "ok";
    checks.push({ rule: "minLiquidityPct", label: "최소 유동성", status, limit: min, before: r1(before.cashPct), after: r1(after.cashPct) });
  }

  if (policy.maxDrawdownPct !== undefined && ctx.scenarioLossPct !== undefined) {
    const loss = ctx.scenarioLossPct;
    checks.push({
      rule: "maxDrawdownPct",
      label: "최대 허용 손실",
      status: loss > policy.maxDrawdownPct ? "violation" : loss >= policy.maxDrawdownPct * WARN_RATIO ? "warning" : "ok",
      limit: policy.maxDrawdownPct,
      before: 0,
      after: r1(loss),
      note: "시나리오 손실 기준",
    });
  }

  if (ctx.isTrade) {
    const fxBefore = 100 - (before.weights.byCurrency.KRW ?? 0);
    const fxAfter = 100 - (after.weights.byCurrency.KRW ?? 0);
    const delta = fxAfter - fxBefore;
    const threshold = { low: 0, medium: 3, high: Infinity }[preferences.fxRisk];
    if (delta > 0) {
      checks.push({
        rule: "fxRisk",
        label: "환위험 선호",
        status: delta > threshold ? "warning" : "ok",
        before: r1(fxBefore),
        after: r1(fxAfter),
        note: `외화 노출 ${delta > 0 ? "증가" : "감소"} (선호: ${preferences.fxRisk})`,
      });
    }
    checks.push({
      rule: "horizon",
      label: "투자 기간",
      status: "ok",
      note: `${policy.horizonYears}년 이상 장기 투자 목적에 부합하는지 스스로 확인하세요`,
    });
  }

  return checks;
}

export const hasViolation = (checks: PolicyCheck[]) => checks.some((c) => c.status === "violation");
