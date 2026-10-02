"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { ecartDeDemande, reclamable } from "@/lib/domain/restitution";
import { escapeHtml, fmt } from "@/lib/format";

export type PayoutResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Verser à un client le solde qu'il a réclamé.
 *
 * LE MONTANT N'EST PAS CELUI DE LA DEMANDE, et c'est le point de ce geste.
 * Entre la demande et le virement, un coupon peut tomber ou un ordre se régler :
 * payer le chiffre que le client a vu viderait un solde qui n'est plus celui-là.
 * Le disponible se recalcule ici, et l'écart avec le montant demandé s'affiche
 * plutôt que de se taire, parce qu'un client qui a demandé 272 500 et reçu
 * 180 000 se demandera pourquoi.
 *
 * L'écriture du journal et la fermeture de la demande sont deux gestes, et
 * l'ordre compte : le mouvement d'abord, la demande ensuite. Si la seconde
 * échoue, une demande reste ouverte sur un solde déjà vidé, ce qu'un opérateur
 * voit (le disponible est à zéro) et peut refermer. L'inverse perdrait le
 * virement.
 */
export async function payerRestitution(_p: PayoutResult | null, form: FormData): Promise<PayoutResult> {
  const desk = await requireDesk("/desk/encaissements");
  const id = String(form.get("payoutId") ?? "");
  if (!id) return { ok: false, error: "Demande introuvable." };

  const r = repo();
  const demande = (await r.listPayouts()).find((p) => p.id === id);
  if (!demande) return { ok: false, error: "Demande introuvable." };
  if (demande.state !== "demandee") return { ok: false, error: "Cette demande a déjà reçu sa réponse." };

  const [entries, intents] = await Promise.all([r.listCash(demande.userId), r.listIntents()]);
  const montant = reclamable(entries, intents.filter((i) => i.clientId === demande.userId));
  if (montant <= 0) return { ok: false, error: "Le disponible est à zéro : il n'y a rien à virer. Refusez la demande en le disant." };

  const entry = await r.addCash({ userId: demande.userId, amount: montant, kind: "restitution", label: "Versement du disponible, à la demande du client", createdBy: desk.name });
  const ferme = await r.closePayout(id, { state: "payee", closedBy: desk.name, paidAmount: montant, cashEntry: entry.id });
  const ecart = ecartDeDemande(ferme);

  await audit("cash.restitution", "client", demande.userId, { before: { asked: demande.askedAmount }, after: { paid: montant, entry: entry.id, payout: id }, reason: `versement ${fmt(montant)} FCFA sur demande` });
  await r.logEvent({
    kind: "desk",
    html: `<b>${fmt(montant)} FCFA</b> versés sur demande du client${ecart ? ` · <b>écart ${ecart > 0 ? "+" : ""}${fmt(ecart)}</b> sur ${fmt(demande.askedAmount)} demandés` : ""} · par ${escapeHtml(desk.name)}`,
  });
  revalidatePath("/desk/encaissements");
  revalidatePath("/");
  return {
    ok: true,
    message: ecart ? `${fmt(montant)} FCFA versés ; le disponible avait bougé de ${ecart > 0 ? "+" : ""}${fmt(ecart)} depuis la demande.` : `${fmt(montant)} FCFA versés.`,
  };
}

/**
 * Refuser, avec son motif.
 *
 * Le motif est obligatoire, dans le formulaire et en base : c'est l'argent du
 * client qu'on garde, et un refus sans raison n'est pas une réponse. Le client
 * peut redemander, puisque la demande fermée libère l'unicité.
 */
export async function refuserRestitution(_p: PayoutResult | null, form: FormData): Promise<PayoutResult> {
  const desk = await requireDesk("/desk/encaissements");
  const id = String(form.get("payoutId") ?? "");
  const motif = String(form.get("reason") ?? "").trim().slice(0, 240);
  if (!id) return { ok: false, error: "Demande introuvable." };
  if (motif.length < 3) return { ok: false, error: "Dites pourquoi : c'est l'argent du client que la maison garde, et il lira ce motif." };

  const r = repo();
  const demande = (await r.listPayouts()).find((p) => p.id === id);
  if (!demande) return { ok: false, error: "Demande introuvable." };
  if (demande.state !== "demandee") return { ok: false, error: "Cette demande a déjà reçu sa réponse." };

  await r.closePayout(id, { state: "refusee", closedBy: desk.name, closedReason: motif });
  await audit("cash.refus", "client", demande.userId, { after: { payout: id, motif }, reason: `refus de verser ${fmt(demande.askedAmount)} FCFA : ${motif}` });
  await r.logEvent({ kind: "desk", html: `Demande de versement refusée (${fmt(demande.askedAmount)} FCFA) : ${escapeHtml(motif)} · par ${escapeHtml(desk.name)}` });
  revalidatePath("/desk/encaissements");
  return { ok: true, message: "Refus enregistré, avec son motif." };
}

/** La file du desk : les demandes ouvertes, avec le disponible d'aujourd'hui à côté. */
export async function demandesOuvertes(): Promise<{ id: string; nom: string; askedAt: string; askedAmount: number; dispo: number; note?: string }[]> {
  const r = repo();
  const [ouvertes, intents] = await Promise.all([r.listPayouts({ state: "demandee" }).catch(() => []), r.listIntents()]);
  if (!ouvertes.length) return [];
  const journaux = await Promise.all(ouvertes.map((p) => r.listCash(p.userId).catch(() => [])));
  return ouvertes.map((p, i) => {
    const siens = intents.filter((x) => x.clientId === p.userId);
    return { id: p.id, nom: siens[0]?.clientName ?? p.userId, askedAt: p.askedAt, askedAmount: p.askedAmount, dispo: reclamable(journaux[i], siens), note: p.note };
  });
}
