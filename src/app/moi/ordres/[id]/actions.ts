"use server";

import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { noter } from "@/lib/journal";
import { garde } from "@/lib/garde";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { attenteAvantRenvoi, empreinte, nouveauCode, verifier } from "@/lib/signature/code";
import { ordreSignable } from "@/lib/domain/intent";
import { aCouvrirPour } from "@/lib/domain/plafond";
import { disponibleDe } from "@/lib/domain/provision";
import { fmt } from "@/lib/format";
import type { Intent } from "@/lib/domain/types";

export type OrdreResult = { ok: true; message?: string; code?: string } | { ok: false; error: string };

const chemin = (id: string) => `/moi/ordres/${id}`;

/** L'ordre du client, et lui seul : une signature ne se donne pas pour autrui. */
async function monOrdre(id: string): Promise<{ intent: Intent; userId: string } | null> {
  const s = await requireSession(chemin(id));
  const intent = (await repo().listIntents()).find((i) => i.id === id);
  if (!intent || intent.clientId !== s.userId) return null;
  return { intent, userId: s.userId };
}


export async function envoyerCodeOrdreAction(_p: OrdreResult | null, form: FormData): Promise<OrdreResult> {
  const id = String(form.get("id") ?? "");
  const mien = await monOrdre(id);
  if (!mien) return { ok: false, error: "Ordre introuvable." };
  const { intent, userId } = mien;
  if (intent.signedAt) return { ok: false, error: "Cet ordre est déjà signé." };
  if (!ordreSignable(intent)) return { ok: false, error: "Cet ordre ne se signe plus ici : le desk l'a déjà pris en main." };
  const attente = attenteAvantRenvoi(intent.pendingCodeAt);
  if (attente) return { ok: false, error: `Un code vient de partir. Attendez ${attente} secondes avant d'en demander un autre.` };

  const r = repo();
  const file = await r.getClientFileByUser(userId);
  if (!file) return { ok: false, error: "Dossier introuvable." };
  const { canalDuCode, nommerCanal } = await import("@/lib/kyc/canal");
  const canal = await canalDuCode(userId, file);
  const code = nouveauCode();
  const { notifyCode } = await import("@/lib/kyc/notify");
  const envoi = await notifyCode(file, code, canal);
  /* L'ancien code n'est remplacé que si le nouveau est bien parti : un envoi
     refusé brûlerait celui que le client a peut-être sous les yeux. */
  if (envoi.via === "echec") return { ok: false, error: `Le code n'a pas pu partir vers ${envoi.to} : ${envoi.raison}. Réessayez dans un instant.` };
  await r.updateIntent(intent.id, { pendingCodeHash: empreinte(code), pendingCodeAt: new Date().toISOString(), pendingCodeTries: 0, pendingCodeTo: canal?.to });
  revalidatePath(chemin(id));
  if (envoi.via === "demo") return { ok: true, message: "Mode démonstration : le code s'affiche ci-dessous.", code };
  return { ok: true, message: `Code envoyé par ${nommerCanal(canal)}.` };
}

export async function signerOrdreAction(_p: OrdreResult | null, form: FormData): Promise<OrdreResult> {
  const id = String(form.get("id") ?? "");
  const mien = await monOrdre(id);
  if (!mien) return { ok: false, error: "Ordre introuvable." };
  const { intent } = mien;
  if (intent.signedAt) return { ok: true, message: "Cet ordre est déjà signé." };
  if (!ordreSignable(intent)) return { ok: false, error: "Cet ordre ne se signe plus ici : le desk l'a déjà pris en main." };

  const verdict = verifier(String(form.get("code") ?? ""), { hash: intent.pendingCodeHash, at: intent.pendingCodeAt, tries: intent.pendingCodeTries, to: intent.pendingCodeTo });
  const r = repo();
  if (!verdict.ok) {
    if (verdict.essais !== (intent.pendingCodeTries ?? 0)) {
      await r.updateIntent(intent.id, { pendingCodeTries: verdict.essais });
      revalidatePath(chemin(id));
    }
    return { ok: false, error: verdict.erreur };
  }

  return acheverLaSignature(intent, mien.userId, "code à usage unique", intent.pendingCodeTo);
}

/**
 * LA FIN D'UNE SIGNATURE. Depuis le 16 novembre 2026 un seul geste la donne : le code reçu.
 *
 * Deux chemins mènent ici, le code reçu et l'appareil déjà reconnu, et ils ne
 * doivent produire qu'un seul effet : le même document, la même couverture,
 * la même ligne au journal. Deux copies auraient divergé au premier détail
 * ajouté d'un côté, et c'est le genre d'écart qu'on ne voit qu'en comparant
 * deux ordres d'un même client.
 *
 * Seule la MANIÈRE change, et elle se garde : l'exemplaire imprime « signé
 * le … par … », et c'est cette phrase qu'un contrôleur lit.
 */
async function acheverLaSignature(intent: Intent, userId: string, methode: string, to?: string): Promise<OrdreResult> {
  const r = repo();
  /* Le document se produit MAINTENANT, parce que c'est maintenant qu'il est
     signé : il porte donc la signature, au lieu d'un bloc vide que le desk
     cocherait plus tard. Le code consommé disparaît, il ne se rejoue pas. */
  const { generateForIntent } = await import("@/lib/documents/generate");
  const doc = await generateForIntent(intent.type === "rachat" ? "cession" : "bulletin", intent.id);
  /* LA PROVISION PAIE SI ELLE PEUT, ET LE CLIENT N'EN SAIT RIEN AVANT.
     Un ordre dont l'argent est déjà chez nous n'a aucune raison d'envoyer son
     client à sa banque : c'était trois gestes et deux moments pour une
     opération couverte. La couverture se décide ICI, au moment de la
     signature, parce que c'est à cet instant que le solde est connu et que
     l'engagement naît.

     Rien ne bouge au journal : la somme est RÉSERVÉE (voir domain/cash), et
     elle ne sortira qu'au règlement, par l'écriture habituelle. La débiter
     maintenant compterait la dépense deux fois. */
  const du = aCouvrirPour(intent, await r.getOffer(intent.offerId));
  const couverture = du > 0 && (await disponibleDe(userId)) >= du;
  /* LA SIGNATURE EST L ENGAGEMENT LUI-MÊME : le garde pèse ici, au seul
     endroit que les trois façons de signer traversent, et la couverture qui
     vient d être calculée lui sert de réponse pour le prépaiement. */
  const passe = await garde("ordre.signer", { type: intent.type, couvert: du === 0 || couverture });
  if (!passe.ok) return { ok: false, error: passe.raison! };
  const signeLe = new Date().toISOString();
  await r.updateIntent(intent.id, {
    signedAt: signeLe,
    signedMethod: methode,
    signedTo: to,
    orderDocId: doc.id,
    ...(couverture ? { coveredAt: signeLe, coveredAmount: du } : {}),
    pendingCodeHash: undefined,
    pendingCodeAt: undefined,
    pendingCodeTries: 0,
    pendingCodeTo: undefined,
  });
  /* PAS DE VALIDATION DU DESK (16 novembre 2026) : l'ordre signé EST le go. Le passage « reçue → confirmée » se fait ici, à la signature, et le journal le dit : le desk ne
     « donne » plus rien, il constate le règlement reçu puis transmet. Les ordres signés avant ce changement et restés « reçus » gardent leur bouton côté desk. */
  if (intent.state === "recue") {
    await r.setIntentState(intent.id, "confirmee");
    await audit("intent.transition", "intent", intent.id, { before: { state: "recue" }, after: { state: "confirmee" }, reason: `${intent.ref} · ${intent.clientName} · confirmé par la signature du client` });
  }
  /* LA SIGNATURE ET LA COUVERTURE, AU REGISTRE (15 novembre 2026) : c'est l'engagement du client. Le registre dit quand, par quel moyen, vers où le code est
     parti, quel document a été signé, et si la provision a réservé la somme. */
  await audit("intent.sign", "intent", intent.id, {
    before: { signedAt: null, coveredAt: intent.coveredAt ?? null },
    after: { signedAt: signeLe, signedMethod: methode, signedTo: to ?? null, orderDocId: doc.id, ...(couverture ? { coveredAt: signeLe, coveredAmount: du } : {}) },
    reason: `${intent.ref} · ${intent.clientName}${couverture ? " · couvert sur la provision" : ""}`,
  });
  await r.logEvent({
    kind: "intent",
    intentId: intent.id,
    html: `<b>Ordre signé</b> par ${intent.clientName} · ${intent.ref} · ${doc.number}${couverture ? ` · <b>couvert sur sa provision</b> (${fmt(du)} FCFA réservés)` : ""}`,
  });
  await noter("ordre.signe", { objet: intent.ref, detail: doc.number });
  revalidatePath(chemin(intent.id));
  revalidatePath("/");
  revalidatePath("/desk");
  return {
    ok: true,
    message: couverture
      ? "Ordre signé et couvert par votre provision : rien à virer. Votre exemplaire est dans vos documents."
      : "Ordre signé. Votre exemplaire est dans vos documents.",
  };
}
