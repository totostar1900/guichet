import { NextResponse, type NextRequest } from "next/server";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadRegistry } from "@/lib/reference";
import { positionsFrom } from "@/lib/positions";
import { CODES_KIND, exportAnonyme, registreDesParts } from "@/lib/domain/registre-des-parts";

/**
 * LE FICHIER QUE LE GESTIONNAIRE REÇOIT : un code porteur et des parts, rien d'autre. Aucun nom, aucun identifiant interne. Les porteurs sans code
 * n'y sont pas, et leur nombre est dit dans un en-tête pour que l'écart avec le total ne soit pas caché.
 */
export async function GET(req: NextRequest) {
  await requireDesk("/desk/registre");
  await loadRegistry();
  const fondsId = req.nextUrl.searchParams.get("fonds");
  if (!fondsId) return new NextResponse("Fonds manquant.", { status: 400 });
  const r = repo();
  const [intents, offers, codesRows] = await Promise.all([r.listIntents(), r.listOffers(), r.listPrive(CODES_KIND)]);
  const offre = offers.find((o) => o.id === fondsId && o.kind === "FONDS");
  if (!offre) return new NextResponse("Fonds inconnu.", { status: 404 });
  const codes = new Map(codesRows.flatMap((x) => ((x.data as { code?: string } | null)?.code ? [[x.key, (x.data as { code: string }).code] as [string, string]] : [])));
  const detenues = positionsFrom(intents, offers).filter((p) => p.offer.id === offre.id && p.intent.clientId).map((p) => ({ clientId: p.intent.clientId as string, offerId: p.offer.id, units: p.units }));
  const [registre] = registreDesParts(detenues, [{ id: offre.id, title: offre.title, isin: offre.isin ?? "" }], new Map(), codes);
  const { csv, sansCode } = exportAnonyme(registre);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="parts-${(offre.isin ?? offre.id).replace(/[^A-Za-z0-9_-]/g, "")}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "x-porteurs-sans-code": String(sansCode),
      "cache-control": "no-store",
    },
  });
}
