"use server";

import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { noter } from "@/lib/journal";
import { garde } from "@/lib/garde";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
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


/**
 * SIGNER AVEC LE PIN DU COMPTE (23 novembre 2026, le client : « la signature se fait avec le pin code »).
 *
 * Le code à six chiffres qui ouvre l'application et sert au verrou est aussi la preuve de la signature : plus de code à usage unique à envoyer, à attendre et à renvoyer. Il se vérifie ici, sur
 * le serveur, avec les mêmes garde-fous que le verrou : cinq codes faux et la session se ferme. Seule la MANIÈRE change au journal : « code du compte ».
 */
export async function signerParPin(id: string, pin: string): Promise<OrdreResult> {
  const mien = await monOrdre(id);
  if (!mien) return { ok: false, error: "Ordre introuvable." };
  const { intent, userId } = mien;
  if (intent.signedAt) return { ok: true, message: "Cet ordre est déjà signé." };
  if (!ordreSignable(intent)) return { ok: false, error: "Cet ordre ne se signe plus ici : le desk l'a déjà pris en main." };
  const s = await requireSession(chemin(id));
  const { verifierCodeDuCompte } = await import("@/lib/auth/devices");
  const v = await verifierCodeDuCompte(s, pin);
  if (!v.ok) {
    if (v.bloque) await noter("securite.verrou.bloque", { detail: "cinq codes faux, à la signature d'un ordre" });
    return { ok: false, error: v.error };
  }
  const fin = await acheverLaSignature(intent, userId, "code du compte");
  /* LA PAGE DE CONFIRMATION S'OUVRE DEPUIS LE SERVEUR : la signature acquise, la page de l'ordre se rend déjà « signée » ; la redirection reste hors de tout try/catch. */
  if (fin.ok) redirect(`/moi/ordres/${intent.id}/signe`);
  return fin;
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
  /* LE PDF N'EST PAS AFFICHÉ, IL EST ENVOYÉ (23 novembre 2026, le client : « le PDF est partagé par e-mail et WhatsApp »). Chaque signature envoie son exemplaire sur les deux canaux, sans que l'un attende
     l'autre. L'envoi ne bloque jamais la signature, déjà acquise : si aucun canal ne l'a pu, la pièce reste dans les documents du client et l'écran le dit. */
  const pasPartie = " Votre exemplaire n'a pas pu partir : il vous attend dans vos documents.";
  let raison = "adresse e-mail et numéro WhatsApp injoignables";
  const { notifyDocument } = await import("@/lib/notify/dispatch");
  const partis: ("email" | "whatsapp")[] = [];
  for (const canal of ["email", "whatsapp"] as const) {
    try {
      const n = await notifyDocument(doc, canal);
      if (n && n.status !== "skipped" && n.status !== "failed") partis.push(canal);
      else if (n?.error) raison = n.error;
    } catch (e) {
      raison = e instanceof Error ? e.message : "erreur";
    }
  }
  let envoi = pasPartie;
  if (partis.length === 2) envoi = " Votre exemplaire part aussi par e-mail et sur WhatsApp.";
  else if (partis.length === 1) envoi = partis[0] === "email" ? " Votre exemplaire part aussi par e-mail." : " Votre exemplaire part aussi sur WhatsApp.";
  else {
    /* UN AVIS DÛ ET NON REMIS S'INSCRIT SOUS « avis_manque » : c'est le genre que la page Santé du desk relit, pour dire la pièce de la main (cliquet de avis-etat.test.ts). */
    await r.logEvent({ kind: "avis_manque", intentId: intent.id, html: `Ordre <b>${intent.ref}</b> : <b>exemplaire non envoyé</b> au client · ${raison} · à lui remettre de la main` });
  }
  revalidatePath(chemin(intent.id));
  revalidatePath("/");
  revalidatePath("/desk");
  return {
    ok: true,
    message: couverture
      ? `Ordre signé et couvert par votre provision : rien à virer. Votre exemplaire est dans vos documents.${envoi}`
      : `Ordre signé. Votre exemplaire est dans vos documents.${envoi}`,
  };
}
