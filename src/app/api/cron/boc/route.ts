import { NextResponse, type NextRequest } from "next/server";
import { catchUp } from "@/lib/market/boc";

// Six bulletins to catch up after a holiday week take ~1 min; Vercel Fluid compute allows up to 300 s.
export const maxDuration = 300;

/**
 * Daily BVMAC bulletin ingestion — call after the session (≈ 18:30 UTC) with
 * `Authorization: Bearer <CRON_SECRET>`. Tries today, then the business days of
 * the last week that were never ingested (holidays, late publication). Idempotent.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const results = await catchUp("cron");
  return NextResponse.json({
    tried: results.length,
    ingested: results.filter((r) => r.found && r.bulletin).map((r) => ({ sessionDate: r.sessionDate, number: r.bulletin?.number, status: r.bulletin?.status, created: r.created.length, refreshed: r.refreshed.length, anomalies: r.bulletin?.anomalies.length ?? 0 })),
    missing: results.filter((r) => !r.found).map((r) => r.sessionDate),
    errors: results.filter((r) => r.error).map((r) => ({ sessionDate: r.sessionDate, error: r.error })),
  });
}
