"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { allowedIntents } from "@/lib/domain/intent";
import { displayStatus } from "@/lib/domain/status";
import { parseAmount } from "@/lib/format";
import { estimate } from "@/lib/domain/estimate";
import { notifyIntentReceived } from "@/lib/notify/dispatch";
import { INDIVISION_CEILING, isIndivision } from "@/lib/kyc/checklist";
import { positionsFrom } from "@/lib/positions";
import { fmt } from "@/lib/format";

const schema = z.object({
  offerId: z.string().min(1),
  type: z.enum(["appetit", "ferme", "info", "rappel", "cession"]),
  amount: z.string().optional(),
  channel: z.enum(["WhatsApp", "Appel", "E-mail"]),
  message: z.string().max(1000).optional(),
});

export type IntentResult = { ok: true; ref: string; type: z.infer<typeof schema>["type"]; channel: z.infer<typeof schema>["channel"]; needsAccount?: boolean } | { ok: false; error: string };

/**
 * Creates an intent at the offer's current published version, attributed to
 * the signed-in client. Anonymous visitors are sent to the login page by the form.
 */
export async function submitIntent(_prev: IntentResult | null, form: FormData): Promise<IntentResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Connectez-vous pour envoyer une intention." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Formulaire incomplet — vérifiez le type et le canal." };
  const { offerId, type, amount, channel, message } = parsed.data;

  const r = repo();
  const offer = await r.getOffer(offerId);
  if (!offer) return { ok: false, error: "Offre introuvable." };
  if (!allowedIntents(offer, displayStatus(offer)).includes(type)) return { ok: false, error: "Cette intention n'est plus possible sur cette offre." };

  const amt = parseAmount(amount);
  if ((type === "ferme" || type === "cession") && !amt) return { ok: false, error: "Indiquez un montant pour une prise ferme ou une cession." };

  if (type === "ferme" && amt) {
    const file = await r.getClientFileByUser(session.userId);
    if (file && isIndivision(file)) {
      const [allIntents, offers] = await Promise.all([r.listIntents(), r.listOffers()]);
      const held = positionsFrom(allIntents.filter((i) => i.clientId === session.userId), offers).reduce((s, p) => s + p.nominalAmount, 0);
      if (held + amt > INDIVISION_CEILING) return { ok: false, error: `Un groupement en indivision est limité à ${fmt(INDIVISION_CEILING)} FCFA de nominal (déjà détenu : ${fmt(held)}). Au-delà, le groupe doit être une association déclarée — parlez-en au desk.` };
    }
  }
  const needsAccount = (type === "ferme" || type === "cession") && session.tier < 2;
  const intent = await r.createIntent({
    offerId,
    type,
    amount: amt || null,
    channel,
    message: needsAccount ? `[compte-titres à ouvrir] ${message ?? ""}`.trim() : message,
    clientId: session.userId,
    clientName: session.name,
    clientSegment: session.segment,
  });
  if (needsAccount) await r.logEvent({ kind: "system", intentId: intent.id, offerId, html: `${intent.ref} — <b>en attente d'ouverture de compte</b> (${session.name}, niveau ${session.tier}) : à prioriser avant la clôture` });
  await notifyIntentReceived(intent, offer, amt ? estimate(offer, amt).text : undefined);
  revalidatePath("/desk");
  return { ok: true, ref: intent.ref, type, channel, needsAccount };
}
