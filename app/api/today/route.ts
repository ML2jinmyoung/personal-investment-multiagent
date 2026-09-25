import { NextResponse } from "next/server";
import { todayModelHooks } from "@/agents/today-hooks";
import { getToday } from "@/services/today-service";
import { userIdFromRequest } from "@/lib/user-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  return NextResponse.json(await getToday(userIdFromRequest(req), todayModelHooks(), { fresh }));
}
