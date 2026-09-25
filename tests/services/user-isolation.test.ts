import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY } from "@/domain/policy";
import { addMessage, listMessages } from "@/services/conversation-store";
import { getPolicy, savePolicy } from "@/services/policy-store";

describe("anonymous user isolation", () => {
  it("keeps conversation history and policy in the user namespace", async () => {
    const a = randomUUID();
    const b = randomUUID();
    await addMessage(a, "default", "user", "A only");
    await addMessage(b, "default", "user", "B only");
    expect((await listMessages(a)).map((m) => m.text)).toEqual(["A only"]);
    expect((await listMessages(b)).map((m) => m.text)).toEqual(["B only"]);

    await savePolicy({ ...DEFAULT_POLICY, limits: { ...DEFAULT_POLICY.limits, singleStockPct: 7 } }, a);
    expect((await getPolicy(a)).limits.singleStockPct).toBe(7);
    expect((await getPolicy(b)).limits.singleStockPct).toBe(DEFAULT_POLICY.limits.singleStockPct);
  });
});
