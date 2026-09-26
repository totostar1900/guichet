import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { toCsv } from "@/lib/reporting";
import { applyFilter, sortRows, toRow, type SortKey, type TableFilter } from "@/lib/market/auction-table";

/**
 * Les séances de la zone en CSV : desk seulement.
 *
 * Mêmes filtres et même ordre que la table, pour que le fichier soit ce qu'on
 * voyait à l'écran et non un autre découpage. Les montants sortent en francs,
 * qui est l'unité de la base : une feuille de calcul n'a pas d'intuition sur les
 * millions, et la conversion faite deux fois est la faute qu'on ne retrouve plus.
 *
 * La colonne « relue par » est la plus importante du fichier. Une ligne sans
 * elle n'a été vérifiée par personne, et rien ne doit s'appuyer dessus, pas plus
 * dans un tableur que dans l'application.
 */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });

  const p = req.nextUrl.searchParams;
  const f: TableFilter = {
    pays: p.get("pays") ?? undefined,
    instrument: p.get("instrument") ?? undefined,
    duree: p.get("duree") ?? undefined,
    etat: p.get("etat") ?? undefined,
    du: p.get("du") ?? undefined,
    au: p.get("au") ?? undefined,
  };
  const tri = p.get("tri") ?? "date";
  const rev = tri.endsWith("-");
  const all = await repo().listAuctionResults({ limit: 5000 });
  const rows = sortRows(applyFilter(all, f).map(toRow), tri.replace(/-$/, "") as SortKey, rev);

  const csv = toCsv(
    [
      "Séance", "Trésor", "Instrument", "Durée", "Abondement", "Code émission",
      "Taux min", "Taux max", "Taux limite", "Taux moyen pondéré",
      "Prix min", "Prix max", "Prix limite", "Prix moyen pondéré",
      "Couverture %", "SVT réseau", "SVT soumissionnaires",
      "Annoncé FCFA", "Soumis FCFA", "Servi FCFA",
      "Séance mince", "Relue par", "Relue le", "Notre ligne", "Communiqué",
    ],
    rows.map(({ r, couverture, mince }) => [
      r.sessionOn, r.country, r.instrument, r.tenor, r.abondement ? "oui" : "non", r.codeEmission ?? "",
      r.rateMin, r.rateMax, r.rateLimit, r.rateAvg,
      r.priceMin, r.priceMax, r.priceLimit, r.priceAvg,
      couverture ?? undefined, r.networkSize, r.bidders,
      r.announced, r.bid, r.served,
      mince ? "oui" : "non", r.confirmedBy ?? "", r.confirmedAt ?? "", r.offerId ?? "", r.sourceUrl,
    ]),
  );

  const nom = ["adjudications", f.pays, f.instrument, f.duree, f.du, f.au].filter(Boolean).join("_").replace(/[^a-zA-Z0-9_.-]+/g, "-");
  return new NextResponse(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${nom}.csv"` },
  });
}
