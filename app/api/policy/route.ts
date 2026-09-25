import { NextResponse } from "next/server";
import { InvestmentPolicy } from "@/domain/policy";
import { getPolicy, savePolicy } from "@/services/policy-store";
import { userIdFromRequest } from "@/lib/user-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NextResponse.json(await getPolicy(userIdFromRequest(req)));
}

export async function PUT(req: Request) {
  const parsed = InvestmentPolicy.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid policy", issues: parsed.error.issues }, { status: 400 });
  await savePolicy(parsed.data, userIdFromRequest(req));
  return NextResponse.json(parsed.data);
}
