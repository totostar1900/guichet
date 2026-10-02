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
 * Enregistrer qu'un coupon est arrivé, contre sa pièce.
 *
 * Le geste était un bouton, et c'était le défaut. L'opérateur voyait
 * l'échéancier, cliquait « Encaisser », et le journal inscrivait le montant
 * ATTENDU daté de l'ÉCHÉANCE. Rien ne lui demandait contre quoi il confirmait,
 * et rien n'était conservé de ce qu'il avait vu : le produit l'invitait à
 * confirmer sa propre prédiction.
 *
 * Trois choses sont donc demandées, et la première est la seule qui transforme
 * une présomption en constat :
 *
 *   LA PIÈCE          une ligne de relevé, un numéro d'avis du teneur de
 *                     compte. Obligatoire, et la base la redemande (0059).
 *   LE MONTANT REÇU   qui n'est pas forcément celui qui était dû. L'attendu est
 *                     gardé à côté, sans quoi l'écart disparaît au moment même
 *                     où il s'inscrit.
 *   LA DATE DE VALEUR le jour du crédit, qui n'est pas celui de l'échéance.
 *                     C'est elle que `at` porte désormais ; l'échéance reste
 *                     dans la clef et dans le libellé.
 *
 * La clef du flux part avec le mouvement : c'est elle qui relie l'argent à
 * l'échéance qu'il solde, et la base en garantit l'unicité. Deux clics, ou deux
 * passages du robot, ne créditent pas deux fois.
 *
 * L'argent inscrit est INOCCUPÉ au sens de la politique des espèces, et c'est
 * voulu : un coupon n'attend aucune opération tant que le client n'a rien
 * demandé. Soit une instruction de réinvestissement le réclame et le robot le
 * place, soit il repart chez le client. Ce qu'il ne fait pas, c'est dormir.
 */
const schema = z.object({
  userId: z.string().min(1),
  flowKey: z.string().min(3),
  /** Ce qui a réellement été reçu. */
  amount: z.coerce.number().positive(),
  /** Ce que l'échéancier annonçait, gardé pour que l'écart survive. */
  expected: z.coerce.number().positive(),
  /** La pièce. Trois caractères est un plancher, pas une exigence de forme. */
  evidence: z.string().trim().min(3),
  /** Le jour du crédit. */
  valueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().min(1),
  /** L'échéance, celle que l'échéancier donne. */
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
  if (!p.success) {
    /* Nommer ce qui manque : « incomplet » renvoie l'opérateur chercher dans
       sept champs ce que le message peut désigner. */
    const quoi = p.error.issues.map((i) => i.path.join("."));
    if (quoi.includes("evidence")) return { ok: false, error: "Indiquez la pièce : ligne de relevé, ou numéro d'avis du teneur de compte. Sans elle, ce n'est pas un constat." };
    if (quoi.includes("valueOn")) return { ok: false, error: "Indiquez la date de valeur, le jour où l'argent est arrivé." };
    if (quoi.includes("amount")) return { ok: false, error: "Indiquez le montant réellement reçu." };
    return { ok: false, error: "Encaissement incomplet : rien n'a été inscrit." };
  }
  const { userId, flowKey, amount, expected, evidence, valueOn, label, date, titre } = p.data;

  /* Une date de valeur dans l'avenir n'est pas un crédit constaté. */
  if (valueOn > new Date().toISOString().slice(0, 10)) return { ok: false, error: "La date de valeur est dans l'avenir : un crédit qui n'est pas arrivé ne s'inscrit pas." };

  const r = repo();
  /* La base porte l'unicité, mais un message clair vaut mieux qu'une erreur de
     contrainte : l'opérateur doit savoir que le coupon est déjà au journal, et
     non croire que son geste a échoué. */
  const deja = (await r.listCash(userId)).find((e) => e.flowKey === flowKey);
  if (deja) return { ok: false, error: "Cette échéance est déjà portée au journal." };

  const ecart = Math.round(amount) - Math.round(expected);
  const signe = ecart > 0 ? "+" : "";
  try {
    const entry = await r.addCash({
      userId,
      amount,
      expected,
      evidence,
      kind: natureDuFlux(label),
      label: `${label} · ${titre} · échéance du ${date}`,
      flowKey,
      at: `${valueOn}T12:00:00.000Z`,
      createdBy: desk.name,
    });
    await audit("cash.encaissement", "client", userId, {
      after: { amount, expected, evidence, valueOn, entry: entry.id, flowKey },
      reason: `${label} ${fmt(amount)} FCFA · ${titre}${ecart ? ` · écart ${signe}${fmt(ecart)}` : ""} · pièce ${evidence}`,
    });
    await r.logEvent({
      kind: "desk",
      html: `<b>${fmt(amount)} FCFA</b> encaissés le ${valueOn} : ${escapeHtml(label)} du ${date} sur ${escapeHtml(titre)}${ecart ? ` · <b>écart ${signe}${fmt(ecart)}</b> sur ${fmt(expected)} attendus` : ""} · pièce ${escapeHtml(evidence)} · par ${desk.name}`,
    });
  } catch {
    // L'index d'unicité a parlé : le coupon était déjà là, et c'est une bonne nouvelle.
    return { ok: false, error: "Cette échéance est déjà portée au journal." };
  }
  revalidatePath("/desk/encaissements");
  revalidatePath("/");
  return {
    ok: true,
    message: ecart
      ? `${fmt(amount)} FCFA inscrits ; écart de ${signe}${fmt(ecart)} sur ${fmt(expected)} attendus, l'échéance figure aux écarts.`
      : `${fmt(amount)} FCFA inscrits au journal du client.`,
  };
}
