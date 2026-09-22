import { NextResponse } from "next/server";
import { indexPageData, indexRows } from "@/lib/market/index-data";

export const dynamic = "force-dynamic";

/** The index series as read from the bulletins, with the equity trading of each session. Public, like the page. */
export async function GET() {
  const d = await indexPageData();
  const rows = indexRows(d);
  const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = ["date;niveau;variation_pct;titres_echanges;montant_fcfa;transactions;ce_qui_a_bouge", ...rows.map((r) => [r.date, r.value.toFixed(2), r.variationPct == null ? "" : r.variationPct.toFixed(2), String(r.titles), String(Math.round(r.amount)), String(r.trades), esc(r.movers)].join(";"))];
  const last = rows[rows.length - 1]?.date ?? "";
  return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="indice-bvmac-${last}.csv"`, "cache-control": "public, max-age=600" },
  });
}
