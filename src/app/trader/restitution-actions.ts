"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { pourquoiPasDeDemande, reclamable } from "@/lib/domain/restitution";
import { escapeHtml, fmt } from "@/lib/format";
import { loadCashPolicy } from "@/lib/policy";

export type RestitutionResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Le client réclame son solde.
 *
 * C'est le geste que la règle du 2 octobre 2026 rend nécessaire. L'argent lui
 * appartient et peut rester aussi longtemps qu'il le souhaite : son souhait doit
 * donc pouvoir s'exprimer, et s'exprimer quelque part qui se suit. Avant, le
 * solde repartait de lui-même et le client n'avait rien à dire ; sans cette
 * demande, le seul chemin de sortie serait un message que personne n'enregistre.
 *
 * Le montant n'est pas saisi par le client, et c'est volontaire. Un champ libre
 * ouvrirait la question « puis-je demander la moitié », à laquelle le journal
 * répondrait par une affectation partielle qu'aucune opération ne porte. Il
 * réclame ce qui est réclamable, et le desk recalcule au paiement.
 */
export async function demanderRestitution(_p: RestitutionResult | null, form: FormData): Promise<RestitutionResult> {
  const s = await requireSession("/trader");
  const note = String(form.get("note") ?? "").trim().slice(0, 240) || undefined;
  const r = repo();
  const [entries, intents, payouts, policy] = await Promise.all([r.listCash(s.userId).catch(() => []), r.listIntents(), r.listPayouts({ userId: s.userId }).catch(() => []), loadCashPolicy()]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const montant = reclamable(entries, mine);

  const empeche = pourquoiPasDeDemande(montant, payouts, policy);
  if (empeche === "ferme") return { ok: false, error: "Les soldes repartent automatiquement vers votre banque : il n'y a rien à demander." };
  if (empeche === "rien") return { ok: false, error: "Rien à verser : votre disponible est à zéro, ou il attend le règlement d'un ordre en cours." };
  if (empeche === "deja") return { ok: false, error: "Une demande est déjà en cours. Le desk y répond, et vous recevez un avis." };

  try {
    const p = await r.askPayout({ userId: s.userId, askedAmount: montant, note });
    await audit("cash.demande", "client", s.userId, { after: { amount: montant, payout: p.id }, reason: `demande de restitution ${fmt(montant)} FCFA` });
    // La note vient du client : elle part dans du HTML, donc elle s'échappe.
    await r.logEvent({ kind: "desk", html: `<b>${fmt(montant)} FCFA</b> : ${escapeHtml(s.name)} demande le versement de son disponible${note ? ` · « ${escapeHtml(note)} »` : ""}` });
  } catch {
    /* L'index d'unicité a parlé : une demande courait déjà, et c'est une bonne
       nouvelle plutôt qu'une panne. */
    return { ok: false, error: "Une demande est déjà en cours. Le desk y répond, et vous recevez un avis." };
  }
  revalidatePath("/trader");
  revalidatePath("/");
  return { ok: true, message: `Demande enregistrée pour ${fmt(montant)} FCFA. Le desk vire sur le compte déclaré à l'ouverture, et vous recevez un avis.` };
}
