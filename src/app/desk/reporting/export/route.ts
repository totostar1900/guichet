import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { positionsFrom } from "@/lib/positions";
import { clientRegister, defaultPeriod, orderJournal, toCsv, type Period } from "@/lib/reporting";

/** CSV exports for the regulator and the auditors — desk only. */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== "desk") return new NextResponse("Accès desk requis", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "ordres";
  const d = defaultPeriod();
  const p: Period = { from: sp.get("from") ?? d.from, to: sp.get("to") ?? d.to };
  const r = repo();
  const [offers, intents, events, files] = await Promise.all([r.listOffers(), r.listIntents(), r.listEvents(5000), r.listClientFiles()]);

  let csv = "";
  let name = "";
  if (type === "ordres") {
    const rows = orderJournal(intents, offers, events, p);
    csv = toCsv(
      ["Référence", "Reçu le", "Client", "Segment", "Instrument", "Ligne", "ISIN", "Sens", "Quantité", "Montant (FCFA)", "Prix", "Canal", "État", "Confirmé le", "Transmis le", "Exécuté le", "Réglé le", "Conseiller"],
      rows.map((o) => [o.ref, o.receivedAt, o.client, o.segment, o.instrument, o.line, o.isin, o.sens, o.quantity, Math.round(o.amount), o.price, o.channel, o.state, o.confirmedAt, o.transmittedAt, o.executedAt, o.settledAt, o.advisor]),
    );
    name = `journal-des-ordres_${p.from}_${p.to}.csv`;
  } else if (type === "clients") {
    const rows = clientRegister(files);
    csv = toCsv(
      ["Client", "Type", "Statut", "Risque", "Ville", "Pays", "Créé le", "Soumis le", "Approuvé le", "Prochaine revue", "Sous-compte", "Sanctions / PPE"],
      rows.map((c) => [c.name, c.kind, c.status, c.risk, c.city, c.country, c.createdAt, c.submittedAt, c.approvedAt, c.nextReviewOn, c.custodianAccount, c.screening]),
    );
    name = `registre-clients_${d.to}.csv`;
  } else if (type === "positions") {
    const rows = positionsFrom(intents, offers);
    csv = toCsv(
      ["Client", "Segment", "Ligne", "ISIN", "Quantité", "Unité", "Nominal (FCFA)", "Valeur (FCFA)", "Valorisé le", "Coût (FCFA)", "Prochain flux", "Montant du flux", "Échéance", "Réf. ordre"],
      rows.map((x) => [x.intent.clientName, x.intent.clientSegment, x.offer.title, x.offer.isin, x.units, x.unitWord, Math.round(x.nominalAmount), x.marketValue != null ? Math.round(x.marketValue) : undefined, x.valuedOn, Math.round(x.costBasis), x.nextFlow?.date, x.nextFlow ? Math.round(x.nextFlow.amount) : undefined, x.maturityOn, x.intent.ref]),
    );
    name = `positions_${d.to}.csv`;
  } else {
    return new NextResponse("type inconnu", { status: 400 });
  }
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"` } });
}
