"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { INTENT_STATE_LABEL, nextStates } from "@/lib/domain/intent";

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
  const r = repo();
  const intents = await r.listIntents();
  const it = intents.find((x) => x.id === intentId);
  if (!it || !nextStates(it.state, it.type).includes(state)) return;
  const updated = await r.setIntentState(intentId, state);
  const offer = await r.getOffer(updated.offerId);
  await r.logEvent({
    kind: "desk",
    intentId,
    offerId: updated.offerId,
    html: `${updated.ref} (${updated.clientName}) — <b>${INTENT_STATE_LABEL[state]}</b>${offer ? ` · ${offer.title}` : ""} · par ${desk.name}`,
  });
  revalidatePath("/desk");
}
