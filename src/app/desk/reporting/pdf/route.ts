import { NextResponse, type NextRequest } from "next/server";
import { requireDesk } from "@/lib/auth";
import { renderActivityReport } from "@/lib/documents/generate";
import { defaultPeriod } from "@/lib/reporting";

/** Rapport d'activité périodique (PDF) : same period selector as the reporting page. */
export async function GET(req: NextRequest) {
  await requireDesk("/desk/reporting");
  const sp = req.nextUrl.searchParams;
  const d = defaultPeriod();
  const ok = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const period = { from: ok(sp.get("from")) ?? d.from, to: ok(sp.get("to")) ?? d.to };
  const { pdf, number } = await renderActivityReport(period);
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${number}.pdf"` } });
}
