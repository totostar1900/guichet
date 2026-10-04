import type { AuctionResult } from "@/lib/market/auction-results";
import type { Offer } from "@/lib/domain/types";

/**
 * LE DÉPOUILLEMENT D'UNE SÉANCE N'ARRIVAIT JAMAIS JUSQU'À LA LIGNE.
 *
 * Mesuré le 4 octobre 2026. Onze lignes du primaire avaient leur clôture
 * derrière elles, de douze à vingt jours, et aucune ne portait de prix servi.
 * Deux faits séparés en étaient la cause, et le second est le vrai :
 *
 *   le communiqué de dépouillement des séances des 14 et 15 septembre EXISTE
 *   au dépôt, lu par la machine et confirmé par une personne les 26 et 27 ;
 *
 *   et la colonne `offer_id` d'`auction_results` est vide sur les deux cent
 *   quarante-neuf séances gardées depuis 2019. Le rapprochement entre un
 *   dépouillement et la ligne ouverte ce jour-là n'a jamais été fait une fois.
 *
 * POURQUOI PERSONNE NE L'A VU. Le prix servi ne s'écrit aujourd'hui qu'en
 * servant des ordres clients : la page des résultats ne propose un champ que
 * pour les lignes qui en portent. Sans ordre, pas de champ, donc pas de prix,
 * et la ligne reste « publiée » indéfiniment. Or le prix servi d'une séance
 * est un FAIT DE MARCHÉ : il ne dépend pas de ce que nous y avions placé.
 *
 * CE MODULE NE DÉCIDE RIEN. Il rapproche et il propose ; une personne applique
 * depuis la page des résultats, et c'est elle qui engage la maison. Un prix
 * servi part en avis d'allocation chez des clients.
 */

/** Ce que le dépouillement d'une séance propose pour une ligne, et d'où ça vient. */
export interface Proposition {
  /** Un prix en % du nominal, pour une obligation. */
  prixPct?: number;
  /** Un taux précompté, pour un bon. */
  tauxPct?: number;
  /** La séance d'où le chiffre vient, pour que le desk retrouve la pièce. */
  seance: string;
  /** Confirmée par une personne, ou seulement lue par la machine. */
  confirmee: boolean;
}

const JOUR = 86_400_000;

/** L'instrument d'une ligne, dit comme la BEAC le dit. */
const instrumentDe = (o: Offer): AuctionResult["instrument"] | undefined => (o.kind === "BTA" ? "BTA" : o.kind === "OTA" || o.kind === "APE" ? "OTA" : undefined);

const ecart = (a: string, b: string): number => Math.abs(Math.round((new Date(a).getTime() - new Date(b).getTime()) / JOUR));

/**
 * La durée d'un titre, écrite comme la BEAC l'écrit : « 52 semaines » pour un
 * bon, « 6 ans » pour une obligation. Elle se calcule du règlement à
 * l'échéance, et s'arrondit, parce qu'une séance du 15 et un règlement du 17
 * ne changent pas une durée de six ans.
 */
export function dureeDite(o: Offer): string | undefined {
  if (!o.maturityOn) return undefined;
  const jours = (new Date(o.maturityOn).getTime() - new Date(o.settleOn).getTime()) / JOUR;
  if (jours <= 0) return undefined;
  return o.kind === "BTA" ? `${Math.round(jours / 7)} semaines` : `${Math.round(jours / 365)} ans`;
}

/** « 52 semaines », « 52 Semaines », « 52  semaines » : la même durée. */
const memeDuree = (a?: string, b?: string): boolean => {
  const n = (x?: string) => x?.toLowerCase().replace(/\s+/g, " ").trim();
  return Boolean(n(a) && n(a) === n(b));
};

/**
 * Les dépouillements qui vont avec ces lignes, et seulement ceux qui ne
 * laissent aucun doute.
 *
 * LE RAPPROCHEMENT NAÏF SE TROMPE, ET LA MESURE LE MONTRE. Pays, instrument et
 * date à trois jours près donnent, pour la séance centrafricaine du 14
 * septembre, UN dépouillement « OTA 2 ans » en face de TROIS de nos lignes
 * d'échéances différentes : les trois auraient reçu 94 %, c'est-à-dire trois
 * prix inventés pour deux d'entre elles. Et pour le Congo du 15, deux
 * dépouillements répondent à une même ligne.
 *
 * LA DURÉE TRANCHE, et elle seule. Le dépouillement porte « 52 semaines » ou
 * « 6 ans », la ligne les recalcule de son règlement à son échéance. Quand les
 * deux se répondent exactement, et une seule fois de chaque côté, la
 * proposition est sûre. Sinon on ne propose rien : une proposition fausse se
 * recopie dans un avis d'allocation, une absence se remarque.
 */
export function propositions(offres: Offer[], resultats: AuctionResult[], now: Date): Map<string, Proposition> {
  const out = new Map<string, Proposition>();
  const pris = new Map<string, string>(); // dépouillement -> ligne qui l'a pris
  for (const o of offres) {
    if (!sansResultat(o, now)) continue;
    const inst = instrumentDe(o);
    const duree = dureeDite(o);
    if (!inst || !duree) continue;
    const jour = o.deadlineAt.slice(0, 10);
    const candidats = resultats.filter((x) => !x.setAsideAt && x.country === o.country && x.instrument === inst && ecart(x.sessionOn, jour) <= 3 && memeDuree(x.tenor, duree));
    if (candidats.length !== 1) continue;
    const x = candidats[0];
    const prix = x.priceAvg ?? x.priceLimit ?? undefined;
    const taux = x.rateAvg ?? x.rateLimit ?? undefined;
    if (inst === "BTA" ? taux == null : prix == null) continue;
    // Deux lignes qui réclameraient le même dépouillement : aucune ne l'obtient.
    if (pris.has(x.id)) {
      out.delete(pris.get(x.id)!);
      continue;
    }
    pris.set(x.id, o.id);
    out.set(o.id, { prixPct: inst === "BTA" ? undefined : prix, tauxPct: inst === "BTA" ? taux : undefined, seance: x.sessionOn, confirmee: Boolean(x.confirmedBy) });
  }
  return out;
}

/** Une ligne dont la clôture est passée et qui n'a toujours pas son résultat. */
export const sansResultat = (o: Offer, now: Date): boolean =>
  (o.kind === "OTA" || o.kind === "BTA" || o.kind === "APE" || o.kind === "RACHAT") && !o.hidden && o.status !== "withdrawn" && new Date(o.deadlineAt) < now && o.servedPricePct == null && !o.resultLine;

/** Depuis combien de jours une séance attend son résultat. */
export const joursDAttente = (o: Offer, now: Date): number => Math.floor((now.getTime() - new Date(o.deadlineAt).getTime()) / JOUR);
