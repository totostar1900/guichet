import { NextResponse, type NextRequest } from "next/server";
import { loadRegistry } from "@/lib/reference";
import { repo } from "@/lib/data";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { instalmentLabel, isDue, standingBlock } from "@/lib/domain/standing";
import { notifyIntentUpdated } from "@/lib/notify/dispatch";

/**
 * Le robot de l'épargne programmée : un versement par instruction et par mois.
 *
 * Il ne décide de rien, et c'est sa raison d'être. Chaque instruction porte déjà
 * son montant, sa destination, son jour et ce qu'il advient quand l'exécution
 * est impossible : le robot lit, et exécute. Le jour où il faudrait lui faire
 * choisir quelque chose, ce ne serait plus de l'exécution mais de la gestion, et
 * la maison n'a pas cet agrément.
 *
 * Deux garanties valent d'être dites, parce que les manquer coûterait cher dans
 * les deux sens.
 *
 * Il rattrape. Une instruction au 5 dont le robot n'a pas tourné le 5 part le 6,
 * ou le 9 : le client a demandé un versement par mois, pas un versement à la
 * seconde. Sans cela, une panne d'une nuit sauterait un mois d'épargne.
 *
 * Il ne double jamais. Le mois est consommé dès qu'il a été traité, qu'un ordre
 * en soit sorti ou non : deux versements le même mois seraient un prélèvement
 * que le client n'a pas demandé, et c'est la faute à ne pas commettre.
 *
 * À appeler chaque jour, avec « Authorization: Bearer <CRON_SECRET> ».
 */
export async function GET(req: NextRequest) {
  await loadRegistry();
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  const r = repo();
  const today = localIso(new Date());
  const [orders, offers] = await Promise.all([r.listStandingOrders(), r.listOffers()]);
  const byId = new Map(offers.map((o) => [o.id, o]));
  let placed = 0;
  let skipped = 0;
  let ended = 0;

  for (const s of orders) {
    if (s.state !== "active") continue;

    // Une instruction dont le terme est passé s'éteint d'elle-même : elle a fait ce qu'on lui a demandé.
    if (s.endsOn && today > s.endsOn) {
      await r.updateStandingOrder(s.id, { state: "terminee" });
      await r.logEvent({ kind: "system", html: `Épargne programmée ${s.ref} (${s.clientName}) : <b>terminée</b>, le terme du ${fmtDate(s.endsOn)} est passé` });
      ended += 1;
      continue;
    }

    if (!isDue(s, today)) continue;

    const o = byId.get(s.offerId);
    const wrong = standingBlock(o, { amount: s.amount, dayOfMonth: s.dayOfMonth, startsOn: s.startsOn, endsOn: s.endsOn });
    if (wrong.length) {
      const why = wrong.join(" ");
      if (s.onBlocked === "arreter") {
        await r.updateStandingOrder(s.id, { state: "annulee", stopReason: why });
        await r.logEvent({ kind: "system", html: `Épargne programmée ${s.ref} (${s.clientName}) : <b>arrêtée</b> · ${why}` });
      } else {
        // Le mois est consommé même sans ordre : sinon le robot réessaierait chaque
        // jour jusqu'à la fin du mois et remplirait le journal de la même phrase.
        await r.updateStandingOrder(s.id, { lastRunOn: today });
        await r.logEvent({ kind: "system", html: `Épargne programmée ${s.ref} (${s.clientName}) : versement du mois <b>passé</b> · ${why}` });
      }
      skipped += 1;
      continue;
    }

    const intent = await r.createIntent({
      offerId: s.offerId,
      type: "souscription",
      amount: s.amount,
      channel: s.channel,
      contactPhone: s.contactPhone,
      contactEmail: s.contactEmail,
      clientName: s.clientName,
      clientSegment: s.clientSegment,
      clientId: s.userId,
      message: instalmentLabel(s, today),
      standingId: s.id,
    });
    // Le client a donné son ordre à la signature de l'instruction : ce versement
    // n'attend pas une seconde confirmation, il attend le règlement.
    const confirmed = await r.updateIntent(intent.id, { state: "confirmee" });
    await r.updateStandingOrder(s.id, { lastRunOn: today });
    await r.logEvent({
      kind: "intent",
      intentId: intent.id,
      offerId: s.offerId,
      html: `${intent.ref} (${s.clientName}) : <b>versement programmé</b> de ${fmt(s.amount)} FCFA sur ${o?.title ?? s.offerId} · ${s.ref}`,
    });
    try {
      await notifyIntentUpdated(confirmed, o!, "confirmee");
    } catch {
      // Un message qui ne part pas ne doit pas empêcher le versement suivant.
    }
    placed += 1;
  }

  return NextResponse.json({ ok: true, day: today, placed, skipped, ended, considered: orders.length });
}
