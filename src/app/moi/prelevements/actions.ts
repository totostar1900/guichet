"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { attenteAvantRenvoi, empreinte, nouveauCode, verifier } from "@/lib/signature/code";
import { JOUR_MAX, JOUR_MIN, mandatVivant, verifierLeMandat, type MandatPrelevement } from "@/lib/domain/mandat";
import { parseAmount } from "@/lib/format";

export type MandatResult = { ok: true; message?: string; code?: string } | { ok: false; error: string };

const PATH = "/moi/prelevements";

/** Le mandat du client, et le sien seul : une autorisation de prélever ne se donne pas pour autrui. */
async function monMandat(id: string): Promise<{ m: MandatPrelevement; userId: string } | null> {
  const s = await requireSession(PATH);
  const m = (await repo().listMandats(s.userId)).find((x) => x.id === id);
  return m ? { m, userId: s.userId } : null;
}

const creation = z.object({
  objet: z.enum(["provision", "instruction"]),
  standingId: z.string().optional(),
  bankName: z.string().trim().min(2).max(80),
  bankAccount: z.string().trim().min(6).max(60),
  accountHolder: z.string().trim().min(2).max(80),
  maxAmount: z.string().transform(parseAmount).pipe(z.number().positive()),
  dayOfMonth: z.coerce.number().int().min(JOUR_MIN).max(JOUR_MAX).optional(),
  amount: z.string().transform(parseAmount).pipe(z.number().positive()).optional(),
});

/**
 * Le mandat naît non signé, et il ne prélève rien tant qu'il ne l'est pas.
 *
 * Le séparer de la signature n'est pas une étape de plus : c'est ce qui permet
 * au client de relire ce qu'il autorise, sur une page qui porte déjà les
 * chiffres, avant de demander le code. Un mandat qu'on signerait dans le même
 * geste qu'on le remplit serait signé sans être lu.
 */
export async function creerMandatAction(_p: MandatResult | null, form: FormData): Promise<MandatResult> {
  const s = await requireSession(PATH);
  const parsed = creation.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs : banque, compte, titulaire, plafond." };
  const d = parsed.data;
  const souci = verifierLeMandat({ ...d, userId: s.userId });
  if (souci) return { ok: false, error: souci };
  /* UN MANDAT PAR USAGE, et la règle se tient ici parce que c'est ici qu'un
     second se créerait. Deux mandats actifs sur le même objet, ce sont deux
     prélèvements le même mois pour la même chose. */
  const siens = await repo().listMandats(s.userId);
  const double = siens.find((m) => m.state !== "revoque" && m.objet === d.objet && (d.objet !== "instruction" || m.standingId === d.standingId));
  if (double) return { ok: false, error: `Vous avez déjà un mandat pour cela (${double.ref}). Révoquez-le avant d'en signer un autre : deux mandats pour un même usage prélèveraient deux fois.` };
  const m = await repo().createMandat({ ...d, userId: s.userId });
  await repo().logEvent({ kind: "system", html: `<b>Mandat de prélèvement créé</b> par ${s.name} · ${m.ref} · plafond ${m.maxAmount} FCFA · à signer` });
  revalidatePath(PATH);
  return { ok: true, message: "Mandat préparé. Relisez-le, puis signez-le par un code à usage unique." };
}

export async function envoyerCodeMandatAction(_p: MandatResult | null, form: FormData): Promise<MandatResult> {
  const mien = await monMandat(String(form.get("id") ?? ""));
  if (!mien) return { ok: false, error: "Mandat introuvable." };
  const { m, userId } = mien;
  if (m.signedAt) return { ok: false, error: "Ce mandat est déjà signé." };
  if (m.state === "revoque") return { ok: false, error: "Ce mandat est révoqué." };
  const attente = attenteAvantRenvoi(m.pendingCodeAt);
  if (attente) return { ok: false, error: `Un code vient de partir. Attendez ${attente} secondes avant d'en demander un autre.` };

  const r = repo();
  const file = await r.getClientFileByUser(userId);
  if (!file) return { ok: false, error: "Dossier introuvable." };
  const { aucunCanalPossible, canalDuCode, nommerCanal } = await import("@/lib/kyc/canal");
  const canal = await canalDuCode(userId, file);
  /* UN MANDAT NE SE SIGNE PAS SANS ADRESSE OÙ RECEVOIR LE CODE, et la raison
     va plus loin que la signature. Le prélèvement promet « chaque prélèvement
     est annoncé avant de partir », et rien ne part sans que son préavis soit
     parti : un client injoignable signerait donc un mandat qui ne tirerait
     jamais rien, sans que rien ne le lui dise.
     Le dossier n'exige qu'un téléphone OU un e-mail, et WhatsApp Cloud API
     n'est pas posé en production au 9 octobre 2026 : le cas n'est pas
     théorique. */
  if (aucunCanalPossible(canal)) {
    return {
      ok: false,
      error: "Il nous faut une adresse e-mail avant de signer : c'est là que part le code, puis l'annonce de chaque prélèvement. Ajoutez-la dans Mon espace, Sécurité, puis revenez ici.",
    };
  }
  const code = nouveauCode();
  const { notifyCode } = await import("@/lib/kyc/notify");
  const envoi = await notifyCode(file, code, canal);
  if (envoi.via === "echec") return { ok: false, error: `Le code n'a pas pu partir vers ${envoi.to} : ${envoi.raison}. Réessayez dans un instant.` };
  await r.updateMandat(m.id, { pendingCodeHash: empreinte(code), pendingCodeAt: new Date().toISOString(), pendingCodeTries: 0, pendingCodeTo: canal?.to });
  revalidatePath(PATH);
  if (envoi.via === "demo") return { ok: true, message: "Mode démonstration : le code s'affiche ci-dessous.", code };
  return { ok: true, message: `Code envoyé par ${nommerCanal(canal)}.` };
}

export async function signerMandatAction(_p: MandatResult | null, form: FormData): Promise<MandatResult> {
  const mien = await monMandat(String(form.get("id") ?? ""));
  if (!mien) return { ok: false, error: "Mandat introuvable." };
  const { m } = mien;
  if (m.signedAt) return { ok: true, message: "Ce mandat est déjà signé." };
  if (m.state === "revoque") return { ok: false, error: "Ce mandat est révoqué." };

  const verdict = verifier(String(form.get("code") ?? ""), { hash: m.pendingCodeHash, at: m.pendingCodeAt, tries: m.pendingCodeTries, to: m.pendingCodeTo });
  const r = repo();
  if (!verdict.ok) {
    if (verdict.essais !== (m.pendingCodeTries ?? 0)) {
      await r.updateMandat(m.id, { pendingCodeTries: verdict.essais });
      revalidatePath(PATH);
    }
    return { ok: false, error: verdict.erreur };
  }
  /* L'EXEMPLAIRE SE PRODUIT MAINTENANT, parce que c'est maintenant qu'il est
     signé : il porte donc la signature, et non un bloc vide. Même leçon que
     la convention et que l'ordre, et c'est la troisième fois qu'elle sert. */
  let docId: string | undefined;
  try {
    const { generateMandat } = await import("@/lib/documents/generate");
    docId = (await generateMandat(m.id)).id;
  } catch (e) {
    await r.logEvent({ kind: "system", html: `Exemplaire du mandat ${m.ref} non produit : ${e instanceof Error ? e.message : "erreur"}` });
  }
  await r.updateMandat(m.id, {
    signedAt: new Date().toISOString(),
    signedMethod: "code à usage unique",
    signedTo: m.pendingCodeTo,
    docId,
    pendingCodeHash: undefined,
    pendingCodeAt: undefined,
    pendingCodeTries: 0,
    pendingCodeTo: undefined,
  });
  await r.logEvent({ kind: "system", html: `<b>Mandat de prélèvement signé</b> · ${m.ref} · ${m.accountHolder} · plafond ${m.maxAmount} FCFA par échéance` });
  revalidatePath(PATH);
  revalidatePath("/desk");
  return { ok: true, message: "Mandat signé. Votre exemplaire est dans vos documents." };
}

/**
 * RÉVOQUER NE SUPPRIME PAS, et c'est la règle des instructions vivantes.
 *
 * Une contestation porte sur un tirage passé : une ligne effacée ne se
 * conteste plus. Le mandat change d'état, garde sa référence et son
 * historique, et cesse de prélever avant la prochaine échéance.
 */
export async function revoquerMandatAction(_p: MandatResult | null, form: FormData): Promise<MandatResult> {
  const mien = await monMandat(String(form.get("id") ?? ""));
  if (!mien) return { ok: false, error: "Mandat introuvable." };
  const { m } = mien;
  if (m.state === "revoque") return { ok: true, message: "Ce mandat est déjà révoqué." };
  const motif = String(form.get("motif") ?? "").trim();
  await repo().updateMandat(m.id, { state: "revoque", revokedAt: new Date().toISOString(), revokedReason: motif || undefined });
  await repo().logEvent({ kind: "system", html: `<b>Mandat de prélèvement révoqué</b> · ${m.ref}${motif ? ` · ${motif}` : ""}` });
  revalidatePath(PATH);
  revalidatePath("/desk");
  return { ok: true, message: mandatVivant(m) ? "Mandat révoqué. Plus aucun prélèvement ne partira." : "Mandat révoqué." };
}
