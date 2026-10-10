"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { noter } from "@/lib/journal";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { packReason } from "@/lib/domain/cancel-reasons";
import { counterLapsed, counterTerms } from "@/lib/domain/counter";
import { notifyIntentUpdated } from "@/lib/notify/dispatch";

/**
 * Le client répond à une contre-proposition.
 *
 * C'est ici que l'ordre change, et nulle part ailleurs : accepter reporte les
 * conditions proposées sur l'ordre, refuser le rend tel qu'il était. Le desk a
 * fait une offre ; c'est ce clic-ci qui engage.
 *
 * Trois gardes, chacune pour une façon de se tromper :
 *
 * - l'ordre doit être celui de la personne connectée, et non un identifiant
 *   deviné ;
 * - il doit être en attente de réponse, sans quoi on rejouerait une décision
 *   déjà prise ;
 * - l'échéance doit tenir. Passée l'heure, la proposition ne vaut plus, et
 *   l'accepter reviendrait à donner un prix qui n'a plus cours.
 */
export async function answerCounter(form: FormData): Promise<void> {
  const s = await getSession();
  if (!s) return;
  const intentId = String(form.get("intentId") ?? "");
  const answer = String(form.get("answer") ?? "");
  if (!intentId || (answer !== "oui" && answer !== "non")) return;

  const r = repo();
  const intents = await r.listIntents();
  const it = intents.find((x) => x.id === intentId);
  if (!it || it.clientId !== s.userId || it.state !== "contre_proposee" || !it.counter) return;

  const offer = await r.getOffer(it.offerId);
  const lapsed = counterLapsed(it.counter);
  const terms = offer ? counterTerms(it.counter, it, offer) : "";

  if (answer === "non" || lapsed) {
    const updated = await r.updateIntent(intentId, { state: "recue", counter: undefined });
    await noter("ordre.contre.refusee", { objet: it.ref });
    await audit("intent.counter.refused", "intent", intentId, { before: it.counter, after: { state: "recue" }, reason: lapsed ? "échéance dépassée" : "refus du client" });
    await r.logEvent({ kind: "intent", intentId, offerId: it.offerId, html: `${it.ref} (${it.clientName}) : contre-proposition <b>${lapsed ? "caduque" : "refusée"}</b>${terms ? ` · ${terms}` : ""}` });
    if (offer && !lapsed) await notifyIntentUpdated(updated, offer, "recue");
    revalidatePath("/");
    revalidatePath("/desk");
    return;
  }

  // Accepté : les conditions proposées deviennent celles de l'ordre.
  const updated = await r.updateIntent(intentId, {
    state: "confirmee",
    amount: it.counter.amount ?? it.amount,
    limitPrice: it.counter.limitPrice ?? it.limitPrice,
    counter: undefined,
  });
  await noter("ordre.contre.acceptee", { objet: it.ref, detail: terms });
  await audit("intent.counter.accepted", "intent", intentId, { before: { amount: it.amount, limitPrice: it.limitPrice }, after: { amount: updated.amount, limitPrice: updated.limitPrice }, reason: terms });
  await r.logEvent({ kind: "intent", intentId, offerId: it.offerId, html: `${it.ref} (${it.clientName}) : contre-proposition <b>acceptée</b>${terms ? ` · ${terms}` : ""}` });
  if (offer) await notifyIntentUpdated(updated, offer, "confirmee");
  revalidatePath("/");
  revalidatePath("/desk");
}

/**
 * Le client retire son propre ordre.
 *
 * Il pouvait répondre à une contre-proposition et rien d'autre : une fois
 * l'intention partie, elle lui échappait, et se raviser demandait d'appeler.
 * C'est son ordre ; tant qu'il n'a pas quitté la maison, il peut le reprendre.
 *
 * LA LIMITE EST CELLE DU DESK, ET ELLE EST LA MÊME POUR TOUT LE MONDE : reçue
 * ou en attente de réponse, l'ordre est encore chez nous et se retire. Confirmé,
 * le bordereau est édité et l'ordre est au carnet : il faut une personne, donc
 * un appel. Transmis, il est parti avec ceux des autres investisseurs, et il ne
 * se retire plus de nulle part, par personne. Un écran qui laisserait croire le
 * contraire mentirait sur ce qui est déjà engagé.
 *
 * Le motif s'écrit « à votre demande » du côté du client, parce que c'est
 * exactement ce que c'est, et le desk le lit comme tel dans son journal.
 */
export async function retirerMonOrdre(form: FormData): Promise<void> {
  const s = await getSession();
  if (!s) return;
  const intentId = String(form.get("intentId") ?? "");
  if (!intentId) return;

  const r = repo();
  const intents = await r.listIntents();
  const it = intents.find((x) => x.id === intentId);
  // L'ordre doit être le sien : un identifiant deviné ne retire rien.
  if (!it || it.clientId !== s.userId) return;
  if (it.state !== "recue" && it.state !== "contre_proposee") return;

  const updated = await r.setIntentState(intentId, "annulee", packReason("client"));
  await noter("ordre.retire", { objet: it.ref });
  await audit("intent.withdraw", "intent", intentId, {
    before: { state: it.state },
    after: { state: "annulee" },
    reason: `retiré par le client ${it.clientName}`,
  });
  const offer = await r.getOffer(it.offerId);
  await r.logEvent({
    kind: "intent",
    intentId,
    offerId: it.offerId,
    html: `${updated.ref} (${updated.clientName}) : <b>retiré par le client</b>${offer ? ` · ${offer.title}` : ""}`,
  });
  if (offer) await notifyIntentUpdated(updated, offer, "annulee");
  revalidatePath("/");
  revalidatePath("/desk");
}
