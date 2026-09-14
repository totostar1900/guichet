"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/lib/data";
import { allowedIntents } from "@/lib/domain/intent";
import { displayStatus } from "@/lib/domain/status";
import { parseAmount } from "@/lib/format";

const schema = z.object({
  offerId: z.string().min(1),
  type: z.enum(["appetit", "ferme", "info", "rappel", "cession"]),
  amount: z.string().optional(),
  channel: z.enum(["WhatsApp", "Appel", "E-mail"]),
  message: z.string().max(1000).optional(),
});

export type IntentResult = { ok: true; ref: string; type: z.infer<typeof schema>["type"]; channel: z.infer<typeof schema>["channel"] } | { ok: false; error: string };

/**
 * Creates an intent at the offer's current published version.
 * Client identity is a placeholder until auth lands (next step).
 */
export async function submitIntent(_prev: IntentResult | null, form: FormData): Promise<IntentResult> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Formulaire incomplet — vérifiez le type et le canal." };
  const { offerId, type, amount, channel, message } = parsed.data;

  const r = repo();
  const offer = await r.getOffer(offerId);
  if (!offer) return { ok: false, error: "Offre introuvable." };
  if (!allowedIntents(offer, displayStatus(offer)).includes(type)) return { ok: false, error: "Cette intention n'est plus possible sur cette offre." };

  const amt = parseAmount(amount);
  if ((type === "ferme" || type === "cession") && !amt) return { ok: false, error: "Indiquez un montant pour une prise ferme ou une cession." };

  const intent = await r.createIntent({
    offerId,
    type,
    amount: amt || null,
    channel,
    message,
    clientName: "G. N. (vous)",
    clientSegment: "Client connecté",
  });
  revalidatePath("/desk");
  return { ok: true, ref: intent.ref, type, channel };
}
