import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPlan } from "@/orchestration/graph";
import { route } from "@/orchestration/router";
import { Tracer } from "@/orchestration/tracer";

type Golden = { query: string; expected: Record<"portfolio" | "simulation" | "evidence" | "policy" | "riskReview" | "simple" | "prediction" | "scenario", boolean | string> };
const golden = JSON.parse(readFileSync("tests/evals/golden.json", "utf8")) as Golden[];
const held = ["NVDA", "QQQ", "VOO", "AAPL", "005930", "000660", "069500", "TSLA", "360750", "152380", "133690"];

const ALWAYS_ON: Record<string, boolean | string> = {
  portfolio: true,
  simulation: true,
  evidence: true,
  policy: true,
  riskReview: true,
  simple: false,
  prediction: false,
  scenario: "",
};

/** Reproducible comparison against the naive "run every specialist" orchestration baseline. */
describe("golden routing eval", () => {
  it("adaptive routing beats always-on and matches >= 90% of labeled workflows", async () => {
    const failures: string[] = [];
    let baselinePass = 0;
    for (const g of golden) {
      const r = await route({ message: g.query, hasPortfolio: true, hasPolicy: true, heldSymbols: held }, null, new Tracer("eval"));
      const plan = buildPlan(r);
      const actual: Record<string, boolean | string> = { ...plan, prediction: r.isPredictionRequest, scenario: r.scenario?.kind ?? "" };
      const bad = Object.entries(g.expected).filter(([k, v]) => actual[k] !== v);
      if (bad.length) failures.push(`${g.query} -> ${bad.map(([k, v]) => `${k}: expected ${v}, got ${actual[k]}`).join("; ")}`);
      if (Object.entries(g.expected).every(([k, v]) => ALWAYS_ON[k] === v)) baselinePass++;
    }
    const accuracy = 1 - failures.length / golden.length;
    const baselineAccuracy = baselinePass / golden.length;
    console.log(`adaptive exact-match ${(accuracy * 100).toFixed(1)}% (${golden.length - failures.length}/${golden.length}); always-on baseline ${(baselineAccuracy * 100).toFixed(1)}% (${baselinePass}/${golden.length})`);
    if (failures.length) console.log(failures.join("\n"));
    expect(accuracy).toBeGreaterThanOrEqual(0.9);
    expect(accuracy).toBeGreaterThan(baselineAccuracy);
  });
});
