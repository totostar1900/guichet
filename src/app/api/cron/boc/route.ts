import type { NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { backfill, catchUp } from "@/lib/market/boc";
import { alertDesk, ARRIERE_PAR_TOUR, relireArriere } from "@/lib/health";

// Six bulletins to catch up after a holiday week take ~1 min; Vercel Fluid compute allows up to 300 s.
export const maxDuration = 300;

/**
 * Daily BVMAC bulletin ingestion : call after the session (≈ 18:30 UTC) with
 * `Authorization: Bearer <CRON_SECRET>`. Tries today, then the business days of
 * the last week that were never ingested (holidays, late publication). Idempotent.
 */
export async function GET(req: NextRequest) {
  return routeDuRobot("boc", req, async () => {
    /* « ?from=&to= » remonte l'historique : cotations et VL seulement, le PDF
       n'est pas archivé. « &relire=1 » repasse en plus sur les séances déjà
       lues, ce qu'il faut après une correction du lecteur. */
    const sp = req.nextUrl.searchParams;

    /* « ?arriere=1 » : reprendre l'arriéré, et lui seul.

       « relire » sur une plage repasse sur TOUTES les séances de la plage, y
       compris les cinq cent vingt et une qui n'ont rien à gagner : c'est ce
       qui a fait durer vingt minutes une reprise qui en concernait deux cent
       quatre-vingt-sept. Ici on part de la liste des séances incomplètes,
       dans l'ordre de la file, et on en prend ce que le tour permet. */
    if (sp.get("arriere") === "1") {
      const demande = Number(sp.get("n"));
      const n = Math.min(ARRIERE_PAR_TOUR, Math.max(1, Number.isFinite(demande) && demande > 0 ? demande : ARRIERE_PAR_TOUR));
      return await relireArriere("cron", n);
    }

    const ok = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
    const from = ok(sp.get("from"));
    const results = from ? await backfill("cron", from, ok(sp.get("to")) ?? new Date().toISOString().slice(0, 10), false, sp.get("relire") === "1") : await catchUp("cron");
    // The daily run doubles as the health check that warns the desk.
    const health = from ? undefined : await alertDesk();
    return ({
      health,
      tried: results.length,
      ingested: results.filter((r) => r.found && r.bulletin).map((r) => ({ sessionDate: r.sessionDate, number: r.bulletin?.number, status: r.bulletin?.status, created: r.created.length, refreshed: r.refreshed.length, anomalies: r.bulletin?.anomalies.length ?? 0 })),
      missing: results.filter((r) => !r.found).map((r) => r.sessionDate),
      errors: results.filter((r) => r.error).map((r) => ({ sessionDate: r.sessionDate, error: r.error })),
    });
  });
}
