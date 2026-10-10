"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { direLeGestePasseSeul, quatreYeux } from "@/lib/desk/quatre-yeux";
import { clefDeCanal, peutRecevoirUnAcces, refusDAcces, ROLE_ACCES_LABEL, type RoleQuiAgit } from "@/lib/domain/acces-nomme";

export type AccesResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * ACCORDER UN ACCÈS NOMMÉ.
 *
 * La personne doit être DÉCLARÉE AU DOSSIER, et le desk choisit parmi celles
 * qui y figurent : taper un nom libre ici reviendrait à faire entrer
 * quelqu'un que le dossier ne connaît pas, c'est à dire à recréer la
 * procuration par la porte de service.
 *
 * LE SECOND REGARD, PARCE QUE C'EST LÀ QUE LA PLACE LE MET. Interactive
 * Brokers n'impose pas deux personnes sur un ordre ; il les impose sur
 * l'ajout d'un utilisateur et sur le changement de ses droits. La raison est
 * bonne : un ordre est borné, réversible et tracé ; donner à quelqu'un la
 * main sur un compte ne l'est pas.
 */
export async function accorderAccesAction(_p: AccesResult | null, form: FormData): Promise<AccesResult> {
  const me = await requireDesk("/desk/clients");
  const fileId = String(form.get("fileId") ?? "");
  const nom = String(form.get("nom") ?? "").trim();
  const canal = String(form.get("canal") ?? "phone") === "email" ? ("email" as const) : ("phone" as const);
  const valeur = String(form.get("valeur") ?? "").trim();

  const r = repo();
  const f = await r.getClientFile(fileId);
  if (!f) return { ok: false, error: "Dossier introuvable." };
  if (f.kind === "physique") return { ok: false, error: "Un compte de personne physique n'a qu'un donneur d'ordres : son titulaire. Il n'y a pas d'accès à nommer." };
  if (f.status !== "approuve") return { ok: false, error: "L'accès se donne sur un compte approuvé." };

  const personne = f.persons.find((p) => p.name === nom);
  if (!personne) return { ok: false, error: "Cette personne n'est pas déclarée au dossier. Ajoutez-la d'abord, avec sa pièce et sa date de naissance." };
  if (!peutRecevoirUnAcces(personne.role)) return { ok: false, error: "Seuls un représentant légal et un cotitulaire désigné peuvent agir : détenir plus de 25 % n'est pas agir." };

  const refus = refusDAcces({ nom, role: personne.role, canal, valeur });
  if (refus) return { ok: false, error: refus };

  const clef = clefDeCanal(canal, valeur);
  /* LE CANAL EST LA CLEF : deux comptes qui enverraient leur code au même
     numéro mettraient la personne devant un écran dont elle ne saurait pas
     de quel compte il parle. Le refus nomme l'autre accès plutôt que de
     laisser une erreur de base remonter. */
  const occupe = await r.accesParCanal(clef);
  if (occupe) return { ok: false, error: `Ce ${canal === "email" ? "courriel" : "numéro"} ouvre déjà un accès, au nom de ${occupe.nom}. Révoquez-le d'abord, ou donnez-en un autre.` };

  const quoi = `Accès nommé de ${nom} sur le compte de ${f.identity.name}`;
  const verdict = await quatreYeux(me, quoi);
  if (verdict.quoi === "attend") return { ok: false, error: "Un second responsable doit confirmer cet accès. Il a été proposé." };
  if (verdict.quoi === "seul") await direLeGestePasseSeul(me, "Accès nommé sur un compte", f.id, verdict.raison ?? "", verdict.motif ?? "");

  const pose = await r.accorderAcces({ compteUserId: f.userId, nom, role: personne.role as RoleQuiAgit, canal, canalValeur: clef, accordePar: me.name });
  await audit("acces.accorder", "client_file", f.id, { after: { nom, role: personne.role, canal, valeur: clef, id: pose.id }, reason: quoi });
  await r.logEvent({ kind: "desk", html: `<b>Accès nommé</b> accordé à ${nom} (${ROLE_ACCES_LABEL[personne.role as RoleQuiAgit].toLowerCase()}) sur le compte de ${f.identity.name} · ${clef} · par ${me.name}` });
  revalidatePath("/desk/clients");
  return { ok: true, message: `${nom} se connectera avec ${clef}. Son premier code reçu là liera son accès, et chaque geste portera son nom.` };
}

/**
 * LE PLAFOND PAR ORDRE : CELUI DU COMPTE, OU CELUI D'UNE PERSONNE.
 *
 * Le PV dit « double signature au-delà de cinq millions ». On n'applique
 * pas la double signature, on applique son intention : au-delà du plafond,
 * l'ordre quitte le libre-service et se passe avec un conseiller, qui parle
 * au groupe. Rien n'est refusé ; un chemin plus lent est imposé, ce qui est
 * exactement ce que le groupe a voulu.
 *
 * RELEVER DEMANDE DEUX REGARDS, BAISSER NON. Un plafond qu'on abaisse est
 * une restriction, et elle doit pouvoir se poser d'une main. Un plafond
 * qu'on relève, ou qu'on retire, élargit ce qu'une personne peut engager
 * seule : c'est le même geste que donner un accès.
 */
export async function fixerPlafondAction(_p: AccesResult | null, form: FormData): Promise<AccesResult> {
  const me = await requireDesk("/desk/clients");
  const fileId = String(form.get("fileId") ?? "");
  const accesId = String(form.get("accesId") ?? "").trim();
  const brut = String(form.get("plafond") ?? "").replace(/[^\d]/g, "");
  const voulu = brut ? Number(brut) : undefined;
  if (voulu != null && (!Number.isFinite(voulu) || voulu <= 0)) return { ok: false, error: "Un plafond est un montant en francs, ou rien pour le retirer." };

  const r = repo();
  const f = await r.getClientFile(fileId);
  if (!f) return { ok: false, error: "Dossier introuvable." };
  if (f.kind === "physique") return { ok: false, error: "Un compte de personne physique n'a pas de plafond de ce genre : son titulaire engage ce qu'il veut." };

  const acces = accesId ? (await r.listAccesDuCompte(f.userId)).find((a) => a.id === accesId) : undefined;
  if (accesId && (!acces || acces.revoqueLe)) return { ok: false, error: "Accès introuvable, ou déjà retiré." };
  const avant = acces ? acces.plafondParOrdre : f.identity.plafondParOrdre;

  /* UNE DÉLÉGATION NE DÉPASSE PAS LE MANDAT DONT ELLE SORT. Poser à une
     personne un plafond plus haut que celui du compte ne relèverait rien, et
     laisserait croire le contraire : le refus le dit plutôt que de ranger un
     chiffre sans effet. */
  if (acces && voulu != null && f.identity.plafondParOrdre && voulu > f.identity.plafondParOrdre) {
    return { ok: false, error: `Le compte est plafonné à ${f.identity.plafondParOrdre.toLocaleString("fr-FR")} FCFA par ordre : un plafond de personne au-dessus ne relèverait rien. Relevez d'abord celui du compte.` };
  }

  const releve = voulu == null || (avant != null && voulu > avant);
  if (releve) {
    const quoi = acces ? `Plafond par ordre de ${acces.nom} relevé sur le compte de ${f.identity.name}` : `Plafond par ordre du compte de ${f.identity.name} relevé`;
    const verdict = await quatreYeux(me, quoi);
    if (verdict.quoi === "attend") return { ok: false, error: "Relever un plafond élargit ce qu'une personne peut engager seule : un second responsable doit confirmer. C'est proposé." };
    if (verdict.quoi === "seul") await direLeGestePasseSeul(me, "Plafond par ordre relevé", f.id, verdict.raison ?? "", verdict.motif ?? "");
  }

  if (acces) await r.fixerPlafondAcces(acces.id, voulu);
  else await r.updateClientFile(f.id, { identity: { ...f.identity, plafondParOrdre: voulu } });

  await audit("acces.plafond", "client_file", f.id, { before: { qui: acces?.nom ?? "le compte", plafond: avant }, after: { qui: acces?.nom ?? "le compte", plafond: voulu }, reason: releve ? "relevé" : "abaissé" });
  await r.logEvent({ kind: "desk", html: `<b>Plafond par ordre</b> ${voulu == null ? "retiré" : `porté à ${voulu.toLocaleString("fr-FR")} FCFA`} pour ${acces?.nom ?? "le compte"} de ${f.identity.name} · par ${me.name}` });
  revalidatePath("/desk/clients");
  return { ok: true, message: voulu == null ? "Plafond retiré." : `Au-delà de ${voulu.toLocaleString("fr-FR")} FCFA, l'ordre passera par un conseiller.` };
}

/**
 * RÉVOQUER, SANS EFFACER.
 *
 * Un accès retiré reste dans l'histoire du compte : savoir qui a pu agir, et
 * entre quelles dates, est la première question d'une contestation.
 */
export async function revoquerAccesAction(_p: AccesResult | null, form: FormData): Promise<AccesResult> {
  const me = await requireDesk("/desk/clients");
  const id = String(form.get("accesId") ?? "");
  const motif = String(form.get("motif") ?? "").trim();
  const fileId = String(form.get("fileId") ?? "");
  if (!id) return { ok: false, error: "Accès introuvable." };
  if (motif.length < 4) return { ok: false, error: "Dites pourquoi vous le retirez : c'est ce que lira la personne suivante." };
  const r = repo();
  const f = await r.getClientFile(fileId);
  if (!f) return { ok: false, error: "Dossier introuvable." };
  const acces = (await r.listAccesDuCompte(f.userId)).find((a) => a.id === id);
  if (!acces || acces.revoqueLe) return { ok: false, error: "Accès introuvable, ou déjà retiré." };

  /* RETIRER NE DEMANDE PAS DE SECOND REGARD, et c'est voulu : fermer une
     porte dans l'urgence doit se faire d'une main. C'est l'ouvrir qui en
     demande deux. */
  await r.revoquerAcces(id, me.name, motif.slice(0, 300));
  await audit("acces.revoquer", "client_file", f.id, { before: { nom: acces.nom, canal: acces.canalValeur }, reason: motif });
  await r.logEvent({ kind: "desk", html: `<b>Accès nommé retiré</b> à ${acces.nom} sur le compte de ${f.identity.name} · ${motif} · par ${me.name}` });
  revalidatePath("/desk/clients");
  return { ok: true, message: `${acces.nom} ne peut plus se connecter sur ce compte. Les gestes qu'il a faits restent à son nom.` };
}
