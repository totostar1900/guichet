"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { escapeHtml, fmt } from "@/lib/format";
import { empreinte } from "@/lib/domain/virement";

export type VirementResult = { ok: true; message: string } | { ok: false; error: string };

const ligne = z.object({
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.coerce.number().positive(),
  payer: z.string().trim().min(2),
  motif: z.string().trim().optional(),
  /** La ligne du relevé, telle qu'elle a été collée : c'est la pièce. */
  brut: z.string().trim().min(3),
  userId: z.string().trim().optional(),
  geste: z.enum(["rattacher", "attente", "restituer"]),
  raison: z.string().trim().optional(),
  /** Un second virement réellement identique le même jour, confirmé à la main. */
  occurrence: z.coerce.number().int().min(1).max(9).optional(),
});

/**
 * INSCRIRE UN CRÉDIT LU AU RELEVÉ.
 *
 * Trois gestes passent par ici, et l'ordre des écritures n'est pas indifférent.
 *
 *   rattacher   la ligne est créée, puis le mouvement au journal du client,
 *               puis la ligne se ferme en portant ce mouvement.
 *   attente     la ligne est créée et s'arrête là : de l'argent reçu sans nom
 *               existe, et c'est tout ce que la maison peut en dire.
 *   restituer   la ligne est créée et fermée avec son motif, sans mouvement :
 *               l'argent n'a jamais appartenu à un client de la maison.
 *
 * LA LIGNE D'ABORD, TOUJOURS. Si l'écriture suivante échoue, il reste un crédit
 * enregistré et non rattaché, c'est-à-dire la vérité : l'argent est arrivé,
 * personne ne l'a encore attribué, et la file du desk le montre. L'ordre
 * inverse laisserait un mouvement au journal d'un client sans trace de la
 * ligne qui l'a produit, et c'est la panne qu'aucun total ne révèle.
 */
export async function inscrireLeCredit(_p: VirementResult | null, form: FormData): Promise<VirementResult> {
  const desk = await requireDesk("/desk/virements");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim();
  });
  const p = ligne.safeParse(raw);
  if (!p.success) {
    const quoi = p.error.issues.map((i) => i.path.join("."));
    if (quoi.includes("amount")) return { ok: false, error: "Indiquez le montant reçu, tel que le relevé le porte." };
    if (quoi.includes("payer")) return { ok: false, error: "Indiquez le donneur d'ordre : c'est lui qu'on compare au titulaire déclaré." };
    return { ok: false, error: "Ligne incomplète : rien n'a été inscrit." };
  }
  const { at, amount, payer, motif, brut, userId, geste, raison, occurrence } = p.data;
  /* Rien d'éditable dans une ligne lue, et c'est pour ça que l'empreinte tient.
     Une correction se fait dans le texte collé, qui se relit : la ligne du
     relevé est la pièce, et un champ modifiable à côté d'elle ferait deux
     vérités dont une seule serait prouvable. */

  if (at > new Date().toISOString().slice(0, 10)) return { ok: false, error: "La date de valeur est dans l'avenir : un crédit qui n'est pas arrivé ne s'inscrit pas." };
  if (geste === "rattacher" && !userId) return { ok: false, error: "Nommez le client : un crédit ne se rattache pas à personne." };
  if (geste === "restituer" && (!raison || raison.length < 3)) return { ok: false, error: "Dites pourquoi cet argent repart : c'est celui de quelqu'un." };

  /* L'empreinte est recalculée côté serveur avec l'occurrence, et non reprise
     telle quelle du formulaire : un champ caché se change, et c'est l'unicité
     de la base qu'il contournerait. */
  const fingerprint = empreinte({ at, amount, payer, motif }, occurrence ?? 1);

  const r = repo();
  const deja = (await r.listVirements()).find((v) => v.fingerprint === fingerprint);
  if (deja) {
    return {
      ok: false,
      error:
        deja.state === "rattache"
          ? "Cette ligne est déjà au journal d'un client. Un relevé relu ne crédite pas deux fois."
          : deja.state === "restitue"
            ? "Cette ligne a déjà été restituée."
            : "Cette ligne attend déjà dans la file, plus bas.",
    };
  }

  let ligneCree;
  try {
    ligneCree = await r.addVirement({ at, amount, payer, motif, fingerprint, readBy: desk.name });
  } catch {
    // L'unicité a parlé pendant que deux onglets lisaient le même relevé.
    return { ok: false, error: "Cette ligne vient d'être inscrite ailleurs : rechargez la file." };
  }

  if (geste === "attente") {
    await audit("virement.recu", "virement", ligneCree.id, { after: { at, amount, payer, motif, fingerprint }, reason: `${fmt(amount)} FCFA de ${payer}, sans nom` });
    await r.logEvent({ kind: "desk", html: `<b>${fmt(amount)} FCFA</b> reçus le ${at} de ${escapeHtml(payer)}, <b>sans client identifié</b> · par ${desk.name}` });
    revalidatePath("/desk/virements");
    return { ok: true, message: `${fmt(amount)} FCFA en attente d'un nom. La file les range par ancienneté.` };
  }

  if (geste === "restituer") {
    await r.closeVirement(ligneCree.id, { state: "restitue", closedBy: desk.name, closedReason: raison });
    await audit("virement.restitue", "virement", ligneCree.id, { after: { at, amount, payer, motif, raison }, reason: `${fmt(amount)} FCFA renvoyés à ${payer} : ${raison}` });
    await r.logEvent({ kind: "desk", html: `<b>${fmt(amount)} FCFA</b> restitués à ${escapeHtml(payer)} · ${escapeHtml(raison!)} · par ${desk.name}` });
    revalidatePath("/desk/virements");
    return { ok: true, message: `${fmt(amount)} FCFA à renvoyer à ${payer}. Le virement de retour se fait en banque ; la ligne garde son motif.` };
  }

  return rattacher(ligneCree.id, userId!, { at, amount, payer, motif, brut }, desk.name);
}

/**
 * Rattacher un crédit à un client : le mouvement, puis la fermeture.
 *
 * `kind: "provision"` et AUCUNE affectation : cet argent n'attend pas une
 * opération nommée, il attend les ordres du client. C'est exactement ce que la
 * politique des espèces autorise depuis le 2 octobre 2026, et c'est ce que la
 * page de la provision promet au client.
 *
 * La pièce est la LIGNE DU RELEVÉ elle-même. Un contrôleur demande contre quoi
 * ce crédit a été inscrit, et « le motif du client » n'est pas une réponse :
 * le motif est ce qui a servi à trouver le nom, le relevé est ce qui prouve que
 * l'argent est là.
 */
async function rattacher(id: string, userId: string, l: { at: string; amount: number; payer: string; motif?: string; brut: string }, par: string): Promise<VirementResult> {
  const r = repo();
  const fiche = await r.getClientFileByUser(userId);
  const nom = fiche?.identity.name ?? userId;
  const entry = await r.addCash({
    userId,
    amount: l.amount,
    kind: "provision",
    label: `Virement reçu de ${l.payer}${l.motif ? ` · motif ${l.motif}` : ""}`,
    evidence: l.brut.slice(0, 300),
    at: `${l.at}T12:00:00.000Z`,
    createdBy: par,
  });
  await r.closeVirement(id, { state: "rattache", userId, cashEntry: entry.id, closedBy: par });
  await audit("virement.rattache", "client", userId, { after: { at: l.at, amount: l.amount, payer: l.payer, motif: l.motif, entry: entry.id, virement: id }, reason: `${fmt(l.amount)} FCFA de ${l.payer} portés à la provision de ${nom}` });
  await r.logEvent({ kind: "desk", html: `<b>${fmt(l.amount)} FCFA</b> reçus le ${l.at} de ${escapeHtml(l.payer)}, portés à la provision de <b>${escapeHtml(nom)}</b>${l.motif ? ` · motif ${escapeHtml(l.motif)}` : ""} · par ${par}` });
  revalidatePath("/desk/virements");
  revalidatePath("/moi/provision");
  revalidatePath("/");
  return { ok: true, message: `${fmt(l.amount)} FCFA portés à la provision de ${nom}. Son écran le montre déjà.` };
}

const trancheSchema = z.object({
  id: z.string().min(1),
  geste: z.enum(["rattacher", "restituer"]),
  userId: z.string().trim().optional(),
  raison: z.string().trim().optional(),
});

/**
 * Trancher un crédit qui attendait un nom.
 *
 * C'est la seconde moitié du travail, et celle qui se fait des jours plus tard :
 * on a appelé le client, il a confirmé que le virement est le sien, ou bien
 * personne ne l'a reconnu et l'argent repart.
 */
export async function trancherLeCredit(_p: VirementResult | null, form: FormData): Promise<VirementResult> {
  const desk = await requireDesk("/desk/virements");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim();
  });
  const p = trancheSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Geste incomplet : rien n'a bougé." };
  const { id, geste, userId, raison } = p.data;

  const r = repo();
  const v = (await r.listVirements()).find((x) => x.id === id);
  if (!v) return { ok: false, error: "Ce crédit n'existe plus dans la file." };
  if (v.state !== "recu") return { ok: false, error: `Ce crédit est déjà ${v.state === "rattache" ? "rattaché" : "restitué"} : rechargez la file.` };

  if (geste === "restituer") {
    if (!raison || raison.length < 3) return { ok: false, error: "Dites pourquoi cet argent repart : c'est celui de quelqu'un." };
    await r.closeVirement(id, { state: "restitue", closedBy: desk.name, closedReason: raison });
    await audit("virement.restitue", "virement", id, { after: { amount: v.amount, payer: v.payer, raison }, reason: `${fmt(v.amount)} FCFA renvoyés à ${v.payer} : ${raison}` });
    await r.logEvent({ kind: "desk", html: `<b>${fmt(v.amount)} FCFA</b> restitués à ${escapeHtml(v.payer)} · ${escapeHtml(raison)} · par ${desk.name}` });
    revalidatePath("/desk/virements");
    return { ok: true, message: `${fmt(v.amount)} FCFA à renvoyer à ${v.payer}.` };
  }

  if (!userId) return { ok: false, error: "Nommez le client : un crédit ne se rattache pas à personne." };
  return rattacher(id, userId, { at: v.at, amount: v.amount, payer: v.payer, motif: v.motif, brut: v.motif ? `${v.at} ${v.payer} ${v.motif} ${v.amount}` : `${v.at} ${v.payer} ${v.amount}` }, desk.name);
}
