import "server-only";
import { repo } from "@/lib/data";
import type { Contact } from "@/lib/domain/types";
import { attendUneSignature } from "@/lib/domain/intent";
import { conventionAReprendre } from "@/lib/kyc/checklist";
import {
  laQuiParle,
  NOM_DU_SUJET,
  pourquoiPasRelancer,
  remplir,
  texteDuSujet,
  type PolitiqueDeRelance,
  type Relance,
  type SujetDeRelance,
} from "@/lib/domain/relance";
import { notifyRaw } from "@/lib/notify/dispatch";
import { loadRelance } from "@/lib/policy";
import { localIso } from "@/lib/format";

/**
 * LE TOUR DES PROCÉDURES LAISSÉES EN ROUTE.
 *
 * Deux temps, et les séparer est tout le dessin.
 *
 *   CONSTATER. On relit l'état réel — bulletins non signés, conventions non
 *   acceptées, mandats sans code, pièces demandées — et on ouvre une ligne
 *   pour chaque devoir qui n'en a pas. Une ligne déjà ouverte ne se rouvre
 *   pas : le robot repasse tous les jours, et remettre le compteur à zéro
 *   chaque matin relancerait sans fin.
 *
 *   CLORE CE QUI N'A PLUS LIEU D'ÊTRE. Un devoir qui a disparu de l'état est
 *   un devoir fait : la ligne se ferme, et elle se ferme AVANT l'envoi, pour
 *   qu'un bulletin signé cette nuit ne reçoive pas son rappel ce matin.
 *
 * PUIS UNE SEULE VOIX PAR CLIENT. Un dossier peut porter une convention, deux
 * bulletins et un mandat le même matin ; quatre messages ne font pas quatre
 * rappels, ils font un client qui bloque le numéro. Le sujet le plus bloquant
 * parle, les autres gardent leur compteur intact et parleront un autre jour.
 *
 * LE COMPTEUR NE BOUGE QUE SI LE MESSAGE EST RÉELLEMENT PARTI. Un numéro cassé
 * épuiserait sinon les cinq rappels en cinq silences, et le client n'aurait
 * jamais rien reçu tout en étant réputé relancé cinq fois. C'est la règle que
 * le préavis a déjà payée pour l'apprendre.
 */

/** Un devoir constaté dans l'état, avant toute décision d'envoi. */
export interface DevoirConstate {
  userId: string;
  sujet: SujetDeRelance;
  cle: string;
  /** Ce que le message nommera : le titre d'une ligne, la destination d'un mandat. */
  quoi: string;
  /** Où mène le rappel, sans le domaine : il se préfixe à l'envoi. */
  chemin: string;
}

const APP = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * TOUT CE QUI ATTEND AUJOURD'HUI, TOUS CLIENTS CONFONDUS.
 *
 * Une seule lecture de chaque table plutôt qu'une par client : le robot passe
 * sur toute la maison, et `contexteDuClient` relit les ordres et les offres
 * entières à chaque appel. Pour cent clients cela ferait deux cents lectures
 * de tables complètes, en série, pour trouver trois bulletins.
 */
export async function devoirsOuverts(): Promise<DevoirConstate[]> {
  const r = repo();
  const [intents, offers, fiches, mandats, standing] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listClientFiles().catch(() => []),
    r.listMandats().catch(() => []),
    r.listStandingOrders().catch(() => []),
  ]);
  const titre = (offerId?: string) => offers.find((o) => o.id === offerId)?.title ?? offerId ?? "votre ordre";
  const out: DevoirConstate[] = [];

  for (const f of fiches) {
    if (!f.userId) continue;
    /* Les deux états où le desk a joué et rend la main. Le brouillon
       n'attend personne : relancer quelqu'un sur un dossier qu'il n'a pas
       fini de remplir, c'est le relancer sur sa propre hésitation. */
    if (f.status === "approuve" && !f.consents.conventionAt) out.push({ userId: f.userId, sujet: "convention", cle: "convention", quoi: "votre convention de compte", chemin: "/ouvrir-un-compte/convention" });
    else if (conventionAReprendre(f)) out.push({ userId: f.userId, sujet: "convention", cle: "convention", quoi: "votre convention de compte", chemin: "/ouvrir-un-compte/convention" });
    else if (f.status === "complements") out.push({ userId: f.userId, sujet: "complements", cle: "complements", quoi: "les pièces demandées par le desk", chemin: "/ouvrir-un-compte" });
  }

  for (const i of intents) {
    if (!i.clientId) continue;
    if (attendUneSignature(i)) out.push({ userId: i.clientId, sujet: "signature", cle: i.id, quoi: titre(i.offerId), chemin: `/moi/ordres/${i.id}` });
    else if (i.state === "contre_proposee") out.push({ userId: i.clientId, sujet: "contre_proposition", cle: i.id, quoi: titre(i.offerId), chemin: `/moi/ordres/${i.id}` });
  }

  for (const m of mandats) {
    if (m.state !== "actif" || m.signedAt) continue;
    const dest = m.standingId ? titre(standing.find((s) => s.id === m.standingId)?.offerId) : m.objet === "provision" ? "votre provision" : m.ref;
    out.push({ userId: m.userId, sujet: "mandat", cle: m.id, quoi: dest, chemin: "/moi/prelevements" });
  }
  return out;
}

export interface ResultatDuTour {
  constates: number;
  ouvertes: number;
  closes: number;
  envoyes: number;
  /** Pourquoi les autres n'ont rien reçu : une file qui n'avance pas se diagnostique sans la rejouer. */
  refus: Record<string, number>;
  /** Les échecs d'envoi, nommés : un canal cassé ne doit pas se taire. */
  echecs: string[];
  dit: string;
}

/**
 * Le tour complet. `aujourdHui` est un paramètre pour qu'un essai puisse
 * avancer le calendrier sans toucher à l'horloge du système.
 */
export async function tourDesRelances(aujourdHui = localIso(new Date())): Promise<ResultatDuTour> {
  const p = await loadRelance();
  const r = repo();
  const devoirs = await devoirsOuverts();
  const refus: Record<string, number> = {};
  const echecs: string[] = [];

  // 1. Ouvrir ce qui n'a pas de ligne. Une ligne existante est rendue telle quelle.
  let ouvertes = 0;
  const avant = await r.listRelances();
  for (const d of devoirs) {
    if (avant.some((x) => x.userId === d.userId && x.sujet === d.sujet && x.cle === d.cle)) continue;
    await r.ouvrirRelance({ userId: d.userId, sujet: d.sujet, cle: d.cle, ouvertLe: aujourdHui });
    ouvertes++;
  }

  /* 2. Clore ce qui n'attend plus, AVANT d'envoyer : un bulletin signé cette
     nuit ne doit pas recevoir son rappel ce matin. Un écart du client n'est
     pas touché — c'est sa décision, et la rouvrir en « faite » effacerait la
     trace de ce qu'il a demandé. */
  let closes = 0;
  for (const x of await r.listRelances({ state: "en_cours" })) {
    if (devoirs.some((d) => d.userId === x.userId && d.sujet === x.sujet && d.cle === x.cle)) continue;
    await r.majRelance(x.id, { state: "faite" });
    closes++;
  }

  // 3. Une voix par client, et seulement si elle a quelque chose à dire.
  const vivantes = await r.listRelances({ state: "en_cours" });
  const parClient = new Map<string, Relance[]>();
  for (const x of vivantes) parClient.set(x.userId, [...(parClient.get(x.userId) ?? []), x]);

  let envoyes = 0;
  for (const [userId, siennes] of parClient) {
    const elue = laQuiParle(siennes, p, aujourdHui);
    if (!elue) {
      /* La raison du PREMIER de la file : c'est celle qui explique pourquoi
         ce client n'a rien reçu, les suivants se taisant de toute façon. */
      const cause = pourquoiPasRelancer(siennes[0], p, aujourdHui) ?? "rien";
      refus[cause] = (refus[cause] ?? 0) + 1;
      continue;
    }
    const d = devoirs.find((x) => x.userId === userId && x.sujet === elue.sujet && x.cle === elue.cle);
    if (!d) continue;
    const sortie = await envoyerRelance(elue, d, p, aujourdHui);
    if (sortie.sent) envoyes++;
    else {
      refus.envoi_echoue = (refus.envoi_echoue ?? 0) + 1;
      if (sortie.error) echecs.push(`${NOM_DU_SUJET[elue.sujet]} · ${sortie.error}`);
    }
  }

  return {
    constates: devoirs.length,
    ouvertes,
    closes,
    envoyes,
    refus,
    echecs: echecs.slice(0, 20),
    dit: p.active
      ? `${devoirs.length} devoir(s) ouvert(s), ${ouvertes} nouvellement constaté(s), ${closes} clos, ${envoyes} rappel(s) parti(s).`
      : `Rappels désactivés au référentiel : ${devoirs.length} devoir(s) constaté(s), rien n'est parti.`,
  };
}

/**
 * Un rappel, et le fait de savoir s'il est parti.
 *
 * Le résultat est RENDU plutôt qu'avalé, comme pour le préavis : c'est lui qui
 * décide si le compteur avance. Un rappel qui n'est pas parti n'a pas été
 * donné, et le client ne doit pas en perdre un.
 */
async function envoyerRelance(x: Relance, d: DevoirConstate, p: PolitiqueDeRelance, aujourdHui: string): Promise<{ sent: boolean; error?: string }> {
  const r = repo();
  try {
    const c = await r.getContact(x.userId);
    if (!c) return { sent: false, error: "Aucun contact : ni numéro WhatsApp avec opt-in, ni adresse e-mail." };
    /* Le jour d'un préavis, on se tait : deux messages de la même maison le
       même jour sur deux sujets différents, c'est un message qu'on n'ouvre
       plus — et le préavis, lui, annonce un débit, donc il est dû. */
    if (p.pasLeJourDUnPreavis) {
      const preavis = await r.listPreavis({ userId: x.userId }).catch(() => []);
      if (preavis.some((q) => q.announcedAt.slice(0, 10) === aujourdHui)) return { sent: false, error: "un préavis de prélèvement part le même jour" };
    }
    const modele = texteDuSujet(p, x.sujet);
    const vals = { prenom: prenomDe(c), quoi: d.quoi, lien: `${APP()}${d.chemin}` };
    const rows = await notifyRaw("intent_update", c, { subject: remplir(modele.objet, vals), text: remplir(modele.texte, vals) });
    const parti = rows.some((q) => q.status === "sent");
    if (!parti) return { sent: false, error: rows.map((q) => `${q.channel} : ${q.status}${q.error ? ` (${q.error})` : ""}`).join(" · ") || "aucun canal joignable" };
    await r.majRelance(x.id, { envois: x.envois + 1, dernierOn: aujourdHui });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "échec de l'envoi" };
  }
}

/**
 * « Bonjour Marie-Claire Mbarga » sonne comme un recouvrement ; « Bonjour
 * Marie-Claire » sonne comme quelqu'un qu'on connaît.
 *
 * LE NOM D'UNE PERSONNE MORALE NE SE COUPE PAS : « Bonjour Groupe » ne veut
 * rien dire, et « Bonjour Assur-Vie Centrale » est juste. Le segment est un
 * libellé libre de la forme « Personne physique · Douala » ; seuls les deux
 * segments de personnes physiques donnent droit au prénom, et le doute
 * profite au nom entier, qui n'est jamais ridicule.
 */
const prenomDe = (c: Contact): string => {
  const nom = (c.name ?? "").trim();
  return /^(personne physique|diaspora)/i.test(c.segment ?? "") ? nom.split(/\s+/)[0] || nom : nom;
};
