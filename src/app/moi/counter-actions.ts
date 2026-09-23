"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
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
    await audit("intent.counter.refused", "intent", intentId, { before: it.counter, after: { state: "recue" }, reason: lapsed ? "échéance dépassée" : "refus du client" });
    await r.logEvent({ kind: "intent", intentId, offerId: it.offerId, html: `${it.ref} (${it.clientName}) : contre-proposition <b>${lapsed ? "caduque" : "refusée"}</b>${terms ? ` · ${terms}` : ""}` });
    if (offer && !lapsed) await notifyIntentUpdated(updated, offer, "recue");
    revalidatePath("/moi");
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
  await audit("intent.counter.accepted", "intent", intentId, { before: { amount: it.amount, limitPrice: it.limitPrice }, after: { amount: updated.amount, limitPrice: updated.limitPrice }, reason: terms });
  await r.logEvent({ kind: "intent", intentId, offerId: it.offerId, html: `${it.ref} (${it.clientName}) : contre-proposition <b>acceptée</b>${terms ? ` · ${terms}` : ""}` });
  if (offer) await notifyIntentUpdated(updated, offer, "confirmee");
  revalidatePath("/moi");
  revalidatePath("/desk");
}
