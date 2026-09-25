import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DEFAULT_POLICY, InvestmentPolicy } from "@/domain/policy";

const idFor = (userId: string) => `${userId}:default`;

export async function getPolicy(userId = "demo"): Promise<InvestmentPolicy> {
  const db = await getDb();
  const row = await db.query.investmentPolicies.findFirst({ where: eq(schema.investmentPolicies.id, idFor(userId)) });
  if (!row) return DEFAULT_POLICY;
  const parsed = InvestmentPolicy.safeParse(JSON.parse(row.json));
  return parsed.success ? parsed.data : DEFAULT_POLICY;
}

export async function savePolicy(policy: InvestmentPolicy, userId = "demo"): Promise<void> {
  const db = await getDb();
  const row = { id: idFor(userId), json: JSON.stringify(policy), updatedAt: new Date().toISOString() };
  await db.insert(schema.investmentPolicies).values(row).onConflictDoUpdate({ target: schema.investmentPolicies.id, set: row });
}
