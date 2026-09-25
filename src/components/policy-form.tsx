"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvestmentPolicy } from "@/domain/policy";

const OBJECTIVES: Record<InvestmentPolicy["objective"], string> = {
  wealth_growth: "장기 자산 증식",
  retirement: "은퇴 준비",
  home_purchase: "주택 구입",
  capital_preservation: "자산 보전",
};
const LEVELS = { low: "낮음", medium: "중간", high: "높음" } as const;
const LIMITS: [keyof InvestmentPolicy["limits"], string][] = [
  ["singleStockPct", "단일 종목 최대 비중 (%)"],
  ["sectorPct", "단일 섹터 최대 비중 (%)"],
  ["overseasPct", "해외자산 최대 비중 (%)"],
  ["riskyAssetPct", "위험자산 최대 비중 (%)"],
  ["minLiquidityPct", "최소 유동성 (%)"],
];
const selectCls = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";
const num = (v: string) => (v === "" ? undefined : Number(v));

export function PolicyForm({ initial }: { initial: InvestmentPolicy }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/policy", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="objective">투자 목적</Label>
        <select id="objective" className={selectCls} value={p.objective} onChange={(e) => setP({ ...p, objective: e.target.value as InvestmentPolicy["objective"] })}>
          {Object.entries(OBJECTIVES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="horizon">투자 기간 (년)</Label>
          <Input id="horizon" type="number" min={1} max={60} required value={p.horizonYears} onChange={(e) => setP({ ...p, horizonYears: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mdd">최대 허용 손실 (%)</Label>
          <Input id="mdd" type="number" min={0} max={100} value={p.maxDrawdownPct ?? ""} onChange={(e) => setP({ ...p, maxDrawdownPct: num(e.target.value) })} />
        </div>
      </div>
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-1 text-sm font-medium">비중 한도</legend>
        {LIMITS.map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key}>{label}</Label>
            <Input id={key} type="number" min={0} max={100} value={p.limits[key] ?? ""} onChange={(e) => setP({ ...p, limits: { ...p.limits, [key]: num(e.target.value) } })} />
          </div>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="turnover">매매 빈도 선호</Label>
          <select id="turnover" className={selectCls} value={p.preferences.turnover} onChange={(e) => setP({ ...p, preferences: { ...p.preferences, turnover: e.target.value as keyof typeof LEVELS } })}>
            {Object.entries(LEVELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fxRisk">환위험 허용</Label>
          <select id="fxRisk" className={selectCls} value={p.preferences.fxRisk} onChange={(e) => setP({ ...p, preferences: { ...p.preferences, fxRisk: e.target.value as keyof typeof LEVELS } })}>
            {Object.entries(LEVELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === "saving"}>저장</Button>
        <span className="text-sm text-muted-foreground">
          {status === "saved" && "저장되었습니다"}
          {status === "error" && "저장에 실패했습니다"}
        </span>
      </div>
    </form>
  );
}
