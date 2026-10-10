import { addBusinessDays } from "@/lib/finance";
import { displayStatus } from "@/lib/domain/status";
import { JOURS_AVANT_RELANCE } from "@/lib/domain/standing";
import type { Intent, Notification, Offer } from "@/lib/domain/types";
import type { MandatPrelevement } from "@/lib/domain/mandat";

/**
 * LA TENUE D'UN CLIENT : SA CONDUITE, EN MANQUEMENTS DATÉS.
 *
 * Quatre crans nommés, jamais une note sur cent. Un cran se conteste ligne à
 * ligne ; un « 37 sur 100 » ne se conteste pas, et c'est précisément pourquoi
 * il serait plus commode et moins juste. Chaque manquement porte sa date, sa
 * pièce et sa phrase ; le cran suit le plus grave d'entre eux.
 *
 * RIEN N'EST STOCKÉ. La tenue se recalcule depuis les ordres, les mandats et
 * le journal des envois, comme le reporting : une tenue enregistrée pourrait
 * devenir fausse sans que les faits changent, et personne ne saurait quand.
 *
 * ELLE NE DÉCIDE RIEN. Elle ordonne une liste et attire l'œil ; une mesure se
 * prend par une personne, avec un motif pris dans une liste et une durée.
 */
export const CRANS = ["impeccable", "correcte", "a_surveiller", "en_defaut"] as const;
export type Cran = (typeof CRANS)[number];

export const CRAN_LABEL: Record<Cran, string> = {
  impeccable: "Impeccable",
  correcte: "Correcte",
  a_surveiller: "À surveiller",
  en_defaut: "En défaut",
};

/** Le rang d'un cran : le plus grave l'emporte. */
const RANG: Record<Cran, number> = { impeccable: 0, correcte: 1, a_surveiller: 2, en_defaut: 3 };

/**
 * LE DÉLAI DE RÈGLEMENT D'UN ORDRE SERVI.
 *
 * Cinq jours ouvrés, le même que la relance d'un versement programmé : deux
 * calendriers dans une maison finissent par ne pas dire pareil. Avant ce
 * délai, un ordre servi non réglé n'est pas un manquement, c'est un virement
 * en route.
 */
export const JOURS_POUR_REGLER = JOURS_AVANT_RELANCE;

export interface Manquement {
  clef: "ordre_non_regle" | "appetit_sans_suite" | "prelevement_rejete" | "versement_en_retard" | "canal_muet";
  gravite: Exclude<Cran, "impeccable">;
  /** La date qui situe le manquement ; absente quand il porte sur plusieurs faits. */
  quand?: string;
  /** La pièce ou la ligne en cause. */
  objet?: string;
  /**
   * Ce qui s'affiche sous le cran : une CLEF À TROUS, et ses valeurs à part.
   * Une phrase déjà composée ici ne se traduirait pas, et le scanner de clefs
   * ne la verrait même pas passer : elle sortirait en français dans la
   * version anglaise sans que rien n'échoue.
   */
  phrase: string;
  vars?: Record<string, string>;
}

export interface Tenue {
  cran: Cran;
  manquements: Manquement[];
}

const jour = (iso: string) => iso.slice(0, 10);

/**
 * UN ORDRE SERVI ET NON RÉGLÉ N'EST EN DÉFAUT QU'APRÈS LE DÉLAI.
 *
 * La vue quantitative appelait « jamais réglé » tout ordre resté en
 * « servie », y compris celui de la veille : elle comptait comme créance un
 * virement qui n'avait pas encore eu le temps d'arriver. Le délai se lit ici,
 * en un seul endroit.
 */
export function enDefaut(servieLe: string | undefined, etat: Intent["state"], now = new Date()): boolean {
  if (etat !== "servie" || !servieLe) return false;
  return jour(servieLe) < jour(addBusinessDays(now, -JOURS_POUR_REGLER).toISOString());
}

/**
 * UN APPÉTIT SANS SUITE, ET LES TROIS CAS QUI N'EN SONT PAS.
 *
 * Sans ces exclusions, la maison punirait ses propres oublis, et le desk
 * cesserait de croire à la colonne au bout de trois cas.
 *
 *   - LA LIGNE N'A JAMAIS OUVERT : le client n'a pas eu l'occasion de tenir.
 *   - PERSONNE NE L'A RELANCÉ : le manquement est le nôtre, pas le sien. Le
 *     journal des envois le prouve ou l'infirme.
 *   - LA SÉANCE N'A RIEN SERVI : il a soumissionné, le marché n'a rien donné.
 */
export interface SuiteDonnee {
  ouverts: number;
  suivis: number;
  sansSuite: { offerId: string; titre: string; appetitLe: string }[];
}

export function suiteDonnee(
  userId: string,
  intents: Intent[],
  offers: Offer[],
  notifications: Notification[],
  now = new Date(),
): SuiteDonnee {
  const parOffre = new Map(offers.map((o) => [o.id, o]));
  const siens = intents.filter((i) => i.clientId === userId);
  const appetits = siens.filter((i) => i.type === "appetit" && i.state !== "annulee");
  const sansSuite: SuiteDonnee["sansSuite"] = [];
  let ouverts = 0;

  for (const a of appetits) {
    const o = parOffre.get(a.offerId);
    if (!o) continue;
    const etat = displayStatus(o, now);
    // La ligne doit avoir ouvert, et la séance avoir servi quelque chose.
    if (etat === "upcoming" || etat === "open" || etat === "closing") continue;
    if (o.status === "withdrawn") continue;
    const prevenu = notifications.some((n) => n.offerId === o.id && n.status === "sent" && n.to && siensContacts(siens).has(n.to));
    if (!prevenu) continue;
    ouverts += 1;
    const suivi = siens.some((i) => i.offerId === o.id && i.type !== "appetit" && i.state !== "annulee" && i.createdAt >= a.createdAt);
    if (!suivi) sansSuite.push({ offerId: o.id, titre: o.title, appetitLe: jour(a.createdAt) });
  }
  return { ouverts, suivis: ouverts - sansSuite.length, sansSuite };
}

/** Les adresses et numéros par lesquels ce client a été joint, pour relier un envoi à lui. */
const siensContacts = (siens: Intent[]): Set<string> => {
  const out = new Set<string>();
  for (const i of siens) {
    if (i.contactEmail) out.add(i.contactEmail);
    if (i.contactPhone) out.add(i.contactPhone);
  }
  return out;
};

export interface SourcesTenue {
  userId: string;
  intents: Intent[];
  offers: Offer[];
  notifications: Notification[];
  mandats: MandatPrelevement[];
  /** Les dates de passage en « servie », par identifiant d'ordre. */
  servieLe: Map<string, string>;
}

export function tenue(s: SourcesTenue, now = new Date()): Tenue {
  const siens = s.intents.filter((i) => i.clientId === s.userId);
  const manquements: Manquement[] = [];

  /* 1. Un ordre servi, jamais réglé, délai écoulé. Le plus grave : la maison
        a soumissionné en son nom et porte le papier. */
  for (const i of siens) {
    const servie = s.servieLe.get(i.id);
    if (!enDefaut(servie, i.state, now)) continue;
    manquements.push({
      clef: "ordre_non_regle",
      gravite: "en_defaut",
      quand: jour(servie!),
      objet: i.ref,
      phrase: "Ordre servi, jamais réglé",
    });
  }

  /* 2. Les appétits restés sans suite, relances prouvées. Deux sur des lignes
        ouvertes font un signal ; un seul est une hésitation. */
  const suite = suiteDonnee(s.userId, s.intents, s.offers, s.notifications, now);
  if (suite.sansSuite.length >= 2) {
    manquements.push({
      clef: "appetit_sans_suite",
      gravite: "a_surveiller",
      objet: suite.sansSuite.map((x) => x.titre).join(" · "),
      phrase: "Appétits sans suite : {n} sur {total}",
      vars: { n: String(suite.sansSuite.length), total: String(suite.ouverts) },
    });
  }

  /* 3. Les prélèvements rejetés. Un rejet arrive ; deux disent autre chose. */
  const rejets = s.mandats.filter((m) => m.userId === s.userId).reduce((n, m) => n + (m.rejects ?? 0), 0);
  if (rejets > 0) {
    manquements.push({
      clef: "prelevement_rejete",
      gravite: rejets >= 2 ? "a_surveiller" : "correcte",
      phrase: rejets === 1 ? "Un prélèvement rejeté" : "{n} prélèvements rejetés",
      vars: { n: String(rejets) },
    });
  }

  /* 4. Les versements programmés qui attendent leur argent au-delà du délai. */
  const limite = addBusinessDays(now, -JOURS_AVANT_RELANCE).toISOString();
  const enRetard = siens.filter((i) => i.standingId && i.state === "confirmee" && !i.coveredAt && i.createdAt < limite);
  if (enRetard.length > 0) {
    manquements.push({
      clef: "versement_en_retard",
      gravite: "a_surveiller",
      quand: jour(enRetard.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0].createdAt),
      objet: enRetard.map((i) => i.ref).join(" · "),
      phrase: enRetard.length === 1 ? "Un versement programmé non réglé" : "{n} versements programmés non réglés",
      vars: { n: String(enRetard.length) },
    });
  }

  /* 5. Un canal déclaré qui ne répond plus. Deux échecs de suite sur le même
        canal : une adresse fausse se corrige, elle ne se devine pas. */
  const adresses = siensContacts(siens);
  const echecs = s.notifications.filter((n) => n.to && adresses.has(n.to) && n.status === "failed");
  if (echecs.length >= 2) {
    manquements.push({
      clef: "canal_muet",
      gravite: "correcte",
      objet: [...new Set(echecs.map((n) => n.channel))].join(" · "),
      phrase: "{n} envois en échec : un canal ne répond plus",
      vars: { n: String(echecs.length) },
    });
  }

  const cran = manquements.reduce<Cran>((pire, m) => (RANG[m.gravite] > RANG[pire] ? m.gravite : pire), "impeccable");
  return { cran, manquements: manquements.sort((a, b) => RANG[b.gravite] - RANG[a.gravite]) };
}
