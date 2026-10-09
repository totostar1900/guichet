"use server";

import { revalidatePath } from "next/cache";
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
 * LA FIN D'UNE SIGNATURE, LA MÊME QUEL QUE SOIT LE GESTE QUI L'A DONNÉE.
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
  await r.updateIntent(intent.id, {
    signedAt: new Date().toISOString(),
    signedMethod: methode,
    signedTo: to,
    orderDocId: doc.id,
    ...(couverture ? { coveredAt: new Date().toISOString(), coveredAmount: du } : {}),
    pendingCodeHash: undefined,
    pendingCodeAt: undefined,
    pendingCodeTries: 0,
    pendingCodeTo: undefined,
  });
  await r.logEvent({
    kind: "intent",
    intentId: intent.id,
    html: `<b>Ordre signé</b> par ${intent.clientName} · ${intent.ref} · ${doc.number}${couverture ? ` · <b>couvert sur sa provision</b> (${fmt(du)} FCFA réservés)` : ""}`,
  });
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

/* ---------- Signer avec l'appareil déjà reconnu ---------- */

/**
 * SIGNER AU DOIGT, ET POURQUOI C'EST UNE PREUVE AU MOINS AUSSI FORTE.
 *
 * Un code à usage unique prouve qu'on tient la boîte aux lettres ; une clef
 * d'accès prouve qu'on tient l'appareil ET qu'on en a passé le verrou, le
 * visage, l'empreinte ou le code du téléphone. Le code reçu reste, pour
 * l'appareil qu'on n'a pas enregistré et pour celui qui préfère.
 *
 * CE QUI NE CHANGE PAS : l'ordre doit être signable, l'appareil doit
 * appartenir à la personne connectée, et la fin est la même pour les deux
 * chemins. Ce qui change est le nombre de gestes : trois et deux écrans
 * deviennent un, et c'est tout l'objet de ce lot.
 */
export async function optionsDeClefAction(): Promise<unknown> {
  await requireSession("/moi");
  const { passkeyAuthenticationOptions } = await import("@/lib/auth/devices");
  return passkeyAuthenticationOptions();
}

export async function signerAvecLaClefAction(id: string, response: unknown): Promise<OrdreResult> {
  const mien = await monOrdre(id);
  if (!mien) return { ok: false, error: "Ordre introuvable." };
  const { intent, userId } = mien;
  if (intent.signedAt) return { ok: true, message: "Cet ordre est déjà signé." };
  if (!ordreSignable(intent)) return { ok: false, error: "Cet ordre ne se signe plus ici : le desk l'a déjà pris en main." };
  const { confirmerParClef } = await import("@/lib/auth/devices");
  const v = await confirmerParClef(userId, response as Parameters<typeof confirmerParClef>[1]);
  if (!v.ok) return { ok: false, error: v.error };
  /* LA MÉTHODE RESTE COURTE ET STABLE, le nom de l'appareil va dans la
     destination. Composer « clé d'accès de l'appareil « X » » en une seule
     chaîne aurait produit une phrase qu'aucun dictionnaire ne peut traduire,
     et l'écran l'affiche telle quelle : c'est l'angle mort t(variable), vu
     quatre fois aujourd'hui. */
  return acheverLaSignature(intent, userId, "clé d'accès", v.name);
}

export async function signerAvecLeCodeDeLAppareilAction(id: string, deviceId: string, token: string, pin: string): Promise<OrdreResult> {
  const mien = await monOrdre(id);
  if (!mien) return { ok: false, error: "Ordre introuvable." };
  const { intent, userId } = mien;
  if (intent.signedAt) return { ok: true, message: "Cet ordre est déjà signé." };
  if (!ordreSignable(intent)) return { ok: false, error: "Cet ordre ne se signe plus ici : le desk l'a déjà pris en main." };
  const { confirmerParCode } = await import("@/lib/auth/devices");
  const v = await confirmerParCode(userId, deviceId, token, pin);
  if (!v.ok) return { ok: false, error: v.error };
  return acheverLaSignature(intent, userId, "code de l'appareil", v.name);
}
