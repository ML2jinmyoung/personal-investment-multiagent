"use client";

import { useState } from "react";
import { PolicyChecks } from "@/components/policy-checks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SimulationResult } from "@/domain/simulation";
import { krw } from "@/lib/format";

const selectCls = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function SimulationPanel({ heldSymbols }: { heldSymbols: string[] }) {
  const [mode, setMode] = useState<"trade" | "scenario">("trade");
  const [symbol, setSymbol] = useState(heldSymbols[0] ?? "NVDA");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState(5_000_000);
  const [kind, setKind] = useState<"symbol" | "sector" | "fx" | "market">("symbol");
  const [target, setTarget] = useState(heldSymbols[0] ?? "NVDA");
  const [changePct, setChangePct] = useState(-30);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = mode === "trade" ? { type: "trade", symbol, action, amountKRW: amount } : { type: "scenario", shocks: [{ kind, target, changePct }] };
    const res = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (res.ok) setResult(json);
    else setError(json.error ?? "시뮬레이션 실패");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        {(["trade", "scenario"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-md border px-3 py-1 ${mode === m ? "bg-primary text-primary-foreground" : ""}`}>
            {m === "trade" ? "매수/매도" : "시나리오"}
          </button>
        ))}
      </div>
      <form onSubmit={run} className="grid grid-cols-2 gap-3">
        {mode === "trade" ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="sym">종목</Label>
              <Input id="sym" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} list="held" />
              <datalist id="held">
                {heldSymbols.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label htmlFor="act">방향</Label>
              <select id="act" className={selectCls} value={action} onChange={(e) => setAction(e.target.value as "buy" | "sell")}>
                <option value="buy">매수</option>
                <option value="sell">매도</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="amt">금액 (원)</Label>
              <Input id="amt" type="number" min={1} step={10000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="kind">대상</Label>
              <select id="kind" className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                <option value="symbol">종목</option>
                <option value="sector">섹터</option>
                <option value="fx">환율</option>
                <option value="market">시장</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="target">값</Label>
              <Input id="target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={kind === "fx" ? "USD" : kind === "market" ? "US | KR | ALL" : kind === "sector" ? "Technology" : "NVDA"} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pct">변화 (%)</Label>
              <Input id="pct" type="number" step={1} value={changePct} onChange={(e) => setChangePct(Number(e.target.value))} />
            </div>
          </>
        )}
        <Button type="submit" className="col-span-2" disabled={busy}>
          시뮬레이션 (실제 주문 없음)
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="space-y-3 rounded-lg border p-3 text-sm">
          <table className="w-full tabular-nums">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-normal">항목</th>
                <th className="text-right font-normal">현재</th>
                <th className="text-right font-normal">이후</th>
              </tr>
            </thead>
            <tbody>
              {result.changes.map((c) => (
                <tr key={c.key} className="border-t">
                  <td className="py-1">{c.label}</td>
                  <td className="text-right">{c.unit === "krw" ? krw(c.before) : `${c.before}%`}</td>
                  <td className="text-right font-medium">{c.unit === "krw" ? krw(c.after) : `${c.after}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.impactKRW !== undefined && <p>가정 시 평가액 영향: <span className={result.impactKRW < 0 ? "text-blue-600" : "text-red-600"}>{krw(result.impactKRW)}</span></p>}
          {result.cost && (
            <p className="text-xs text-muted-foreground">
              예상 비용 {krw(result.cost.totalKRW)} (수수료 {krw(result.cost.commissionKRW)} · 세금 {krw(result.cost.taxKRW)} · 환전 {krw(result.cost.fxKRW)}) — {result.cost.note}
            </p>
          )}
          <PolicyChecks checks={result.policyChecks} />
          {result.warnings.map((w) => (
            <p key={w} className="text-xs text-amber-700">
              {w}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">deterministic simulation · 예측 아님 · {new Date(result.computedAt).toLocaleTimeString("ko-KR")}</p>
        </div>
      )}
    </div>
  );
}
