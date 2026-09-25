import { NextResponse } from "next/server";
import { SimulationRequest } from "@/domain/simulation";
import { runSimulation, SimulationError } from "@/services/simulation-engine";
import { userIdFromRequest } from "@/lib/user-session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = SimulationRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid request", issues: parsed.error.issues }, { status: 400 });
  try {
    return NextResponse.json(await runSimulation(parsed.data, { userId: userIdFromRequest(req) }));
  } catch (e) {
    if (e instanceof SimulationError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
