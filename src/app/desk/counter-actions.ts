"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { nextStates } from "@/lib/domain/intent";
import { counterTerms, type Counter } from "@/lib/domain/counter";
import { notifyIntentUpdated } from "@/lib/notify/dispatch";

const schema = z.object({
  intentId: z.string().min(1),
  amount: z.coerce.number().positive().optional(),
  limitPrice: z.coerce.number().positive().optional(),
  note: z.string().trim().max(240).optional(),
  until: z.string().min(10),
});

/**
 * Le desk propose d'autres conditions.
 *
 * Il ne les applique pas : il les soumet. L'ordre passe en « contre-proposition »
 * et y reste jusqu'à ce que le client réponde ou que l'échéance tombe. Rien
 * n'est écrit sur la quantité ni sur le prix de l'ordre tant qu'il n'a pas dit
 * oui : c'est son acceptation qui engage, pas ce bouton.
 *
 * Une proposition qui ne change rien n'est pas une proposition : sans quantité
 * ni prix différents, on ne fait rien.
 */
export async function proposeCounter(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim() !== "") raw[k] = v.trim();
  });
  const p = schema.safeParse(raw);
  if (!p.success) return;
  const { intentId, amount, limitPrice, note, until } = p.data;

  const r = repo();
  const intents = await r.listIntents();
  const it = intents.find((x) => x.id === intentId);
  if (!it || !nextStates(it.state, it.type).includes("contre_proposee")) return;
  const changesAmount = amount != null && amount !== it.amount;
  const changesPrice = limitPrice != null && limitPrice !== it.limitPrice;
  if (!changesAmount && !changesPrice) return;

  const at = new Date(until);
  if (isNaN(at.getTime()) || at.getTime() <= Date.now()) return;

  const counter: Counter = {
    ...(changesAmount ? { amount } : {}),
    ...(changesPrice ? { limitPrice } : {}),
    ...(note ? { note } : {}),
    until: at.toISOString(),
    by: desk.name,
    at: new Date().toISOString(),
  };

  const offer = await r.getOffer(it.offerId);
  const updated = await r.updateIntent(intentId, { state: "contre_proposee", counter });
  await audit("intent.counter", "intent", intentId, { before: { amount: it.amount, limitPrice: it.limitPrice }, after: counter, reason: offer ? counterTerms(counter, it, offer) : undefined });
  await r.logEvent({
    kind: "desk",
    intentId,
    offerId: it.offerId,
    html: `${it.ref} (${it.clientName}) : <b>contre-proposition</b>${offer ? ` · ${counterTerms(counter, it, offer)}` : ""} · par ${desk.name}`,
  });
  if (offer) await notifyIntentUpdated(updated, offer, "contre_proposee", desk.name);
  revalidatePath("/desk");
  revalidatePath(`/desk/intentions/${intentId}`);
}
