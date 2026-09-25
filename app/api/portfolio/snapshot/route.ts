import { NextResponse } from "next/server";
import { getPortfolioSnapshot } from "@/services/portfolio-aggregator";
import { userIdFromRequest } from "@/lib/user-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  return NextResponse.json(await getPortfolioSnapshot(userIdFromRequest(req), { fresh }));
}
