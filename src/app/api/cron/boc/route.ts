import { NextResponse, type NextRequest } from "next/server";
import { backfill, catchUp } from "@/lib/market/boc";

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
  // ?from=YYYY-MM-DD&to=YYYY-MM-DD backfills history (quotes and NAVs only, PDFs not archived).
  const sp = req.nextUrl.searchParams;
  const ok = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const from = ok(sp.get("from"));
  const results = from ? await backfill("cron", from, ok(sp.get("to")) ?? new Date().toISOString().slice(0, 10)) : await catchUp("cron");
  return NextResponse.json({
    tried: results.length,
    ingested: results.filter((r) => r.found && r.bulletin).map((r) => ({ sessionDate: r.sessionDate, number: r.bulletin?.number, status: r.bulletin?.status, created: r.created.length, refreshed: r.refreshed.length, anomalies: r.bulletin?.anomalies.length ?? 0 })),
    missing: results.filter((r) => !r.found).map((r) => r.sessionDate),
    errors: results.filter((r) => r.error).map((r) => ({ sessionDate: r.sessionDate, error: r.error })),
  });
}
