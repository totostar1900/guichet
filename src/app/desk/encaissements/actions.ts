"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { natureDuFlux } from "@/lib/domain/encaissement";
import { escapeHtml, fmt } from "@/lib/format";

export type EncaissementResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Constater qu'un coupon est arrivé.
 *
 * Le geste est pauvre, et il doit l'être : l'opérateur voit le crédit sur le
 * compte de règlement et l'inscrit. Rien ici ne devine, et surtout rien ne
 * suppose qu'une échéance passée a été payée. C'est toute la différence entre
 * « échu », que l'échéancier sait, et « reçu », que seule une personne peut
 * constater.
 *
 * La clef du flux part avec le mouvement. C'est elle qui relie l'argent à
 * l'échéance qu'il solde, et la base en garantit l'unicité : deux clics sur le
 * même bouton, ou deux passages du robot, ne créditent pas deux fois.
 *
 * L'argent inscrit est INOCCUPÉ au sens de la politique des espèces, et c'est
 * voulu : un coupon n'attend aucune opération tant que le client n'a rien
 * demandé. Soit une instruction de réinvestissement le réclame et le robot le
 * place, soit il repart chez le client. Ce qu'il ne fait pas, c'est dormir.
 */
const schema = z.object({
  userId: z.string().min(1),
  flowKey: z.string().min(3),
  amount: z.coerce.number().positive(),
  label: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  titre: z.string().min(1),
});

export async function porterAuJournal(_p: EncaissementResult | null, form: FormData): Promise<EncaissementResult> {
  const desk = await requireDesk("/desk/encaissements");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim();
  });
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Encaissement incomplet : rien n'a été inscrit." };
  const { userId, flowKey, amount, label, date, titre } = p.data;

  const r = repo();
  /* La base porte l'unicité, mais un message clair vaut mieux qu'une erreur de
     contrainte : l'opérateur doit savoir que le coupon est déjà au journal, et
     non croire que son geste a échoué. */
  const deja = (await r.listCash(userId)).find((e) => e.flowKey === flowKey);
  if (deja) return { ok: false, error: "Cette échéance est déjà portée au journal." };

  try {
    const entry = await r.addCash({
      userId,
      amount,
      kind: natureDuFlux(label),
      label: `${label} · ${titre} · échéance du ${date}`,
      flowKey,
      at: `${date}T12:00:00.000Z`,
      createdBy: desk.name,
    });
    await audit("cash.encaissement", "client", userId, { after: { amount, entry: entry.id, flowKey }, reason: `${label} ${fmt(amount)} FCFA · ${titre}` });
    await r.logEvent({ kind: "desk", html: `<b>${fmt(amount)} FCFA</b> encaissés : ${escapeHtml(label)} du ${date} sur ${escapeHtml(titre)} · par ${desk.name}` });
  } catch {
    // L'index d'unicité a parlé : le coupon était déjà là, et c'est une bonne nouvelle.
    return { ok: false, error: "Cette échéance est déjà portée au journal." };
  }
  revalidatePath("/desk/encaissements");
  revalidatePath("/");
  return { ok: true, message: `${fmt(amount)} FCFA inscrits au journal du client.` };
}
