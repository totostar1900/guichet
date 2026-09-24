"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { packReason, reasonForDesk } from "@/lib/domain/cancel-reasons";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { INTENT_STATE_LABEL, nextStates } from "@/lib/domain/intent";
import { generateForIntent } from "@/lib/documents/generate";
import { docsForTransition } from "@/lib/documents/registry";
import { notifyIntentUpdated } from "@/lib/notify/dispatch";

const schema = z.object({
  intentId: z.string().min(1),
  state: z.enum(["recue", "confirmee", "transmise", "servie", "non_servie", "reglee", "annulee"]),
});

/** Desk moves an intent along its lifecycle; every move is logged. */
export async function transitionIntent(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const { intentId, state } = parsed.data;
  // Clore sans suite demande un motif : c’est lui que le client lit, et lui que le
  // journal garde. Un ordre clos sans raison ne s’explique plus six mois après.
  const reasonKey = String(form.get("reason") ?? "").trim();
  const reasonNote = String(form.get("reasonNote") ?? "").trim();
  const closedReason = state === "annulee" && reasonKey ? packReason(reasonKey, reasonNote) : undefined;
  const r = repo();
  const intents = await r.listIntents();
  const it = intents.find((x) => x.id === intentId);
  if (!it || !nextStates(it.state, it.type).includes(state)) return;
  if (state === "annulee" && !closedReason) return;
  const updated = await r.setIntentState(intentId, state, closedReason);
  await audit("intent.transition", "intent", intentId, { before: { state: it.state }, after: { state, closedReason }, reason: closedReason ? reasonForDesk(closedReason) : `${it.ref} · ${it.clientName}` });
  const offer = await r.getOffer(updated.offerId);
  await r.logEvent({
    kind: "desk",
    intentId,
    offerId: updated.offerId,
    html: `${updated.ref} (${updated.clientName}) : <b>${INTENT_STATE_LABEL[state]}</b>${closedReason ? ` · ${reasonForDesk(closedReason)}` : ""}${offer ? ` · ${offer.title}` : ""} · par ${desk.name}`,
  });
  // The lifecycle produces its paperwork: bulletin + appel de fonds on confirmation, avis on results, avis d'opéré on settlement.
  for (const type of docsForTransition(updated.type, state)) {
    try {
      await generateForIntent(type, intentId, { advisor: desk.name });
    } catch (e) {
      await r.logEvent({ kind: "system", intentId, html: `Document non généré (${type}) : ${e instanceof Error ? e.message : "erreur"}` });
    }
  }
  // Le règlement d'un ordre sort les espèces : le journal l'inscrit lui-même,
  // parce qu'une comptabilité qui dépend d'un geste finit par manquer celui-là.
  // Le montant est celui que l'avis d'opéré imprime, pas une estimation ; si
  // aucune provision n'a été inscrite, le solde passe en négatif et le desk voit
  // qu'il lui manque une écriture, ce qui est exactement le service attendu.
  if (state === "reglee" && offer && updated.clientId) {
    try {
      const { positionFor } = await import("@/lib/documents/position");
      const paid = Math.round(Math.abs(positionFor(updated, offer).total));
      const out = updated.type === "vente" || updated.type === "cession" || updated.type === "rachat";
      if (paid > 0) await r.addCash({ userId: updated.clientId, amount: paid, kind: out ? "produit_vente" : "souscription", label: `${out ? "Produit de" : "Règlement de"} ${updated.ref} · ${offer.title}`, intentId: updated.id, createdBy: desk.name });
    } catch (e) {
      await r.logEvent({ kind: "system", intentId, html: `Mouvement d'espèces non inscrit pour ${updated.ref} : ${e instanceof Error ? e.message : "erreur"}` });
    }
  }
  if (offer) await notifyIntentUpdated(updated, offer, state, desk.name);
  revalidatePath("/desk");
  revalidatePath("/desk/documents");
}
