import type { EventLog, Intent, IntentState, Offer } from "./types";

/**
 * DEPUIS QUAND CET ORDRE N'A-T-IL PAS BOUGÉ, ET EST-CE GRAVE ?
 *
 * La file du desk range les ordres par état. Un état dit OÙ en est un
 * ordre ; il ne dit pas DEPUIS QUAND il y est, et c'est la seule chose
 * qu'une file doive dire. Mesuré le 18 octobre 2026 : un ordre « confirmée »
 * depuis trente et un jours et un ordre confirmé le matin même se
 * ressemblaient trait pour trait, et le second des deux ordres ouverts ne
 * figurait même pas dans le compte « à traiter », qui ne comptait que les
 * « reçue ».
 *
 * L'ÂGE SE COMPTE DANS L'ÉTAT, PAS DEPUIS LA RÉCEPTION. Un ordre reçu il y a
 * trente jours mais confirmé hier n'a pas attendu trente jours, il en a
 * attendu un. C'est le journal qui porte la dernière transition.
 *
 * L'URGENCE A DEUX HORLOGES, ET LA PREMIÈRE PRIME.
 *
 *   LA CLÔTURE DE LA LIGNE, quand elle existe. Un ordre sur une ligne qui
 *   ferme dans deux jours est urgent à tout âge, et un ordre sur une ligne
 *   qui ferme dans trois mois ne l'est pas, eût-il vieilli. C'est la seule
 *   horloge qui se dérive des faits plutôt que d'un goût.
 *
 *   LE DÉLAI DE MAISON sinon, parce que les fonds et le secondaire se
 *   traitent en continu et n'ont pas de clôture. Il est au référentiel et non
 *   dans le code : il est arbitraire, et une maison doit pouvoir le discuter
 *   sans déployer. Cinq ordres en base, tous d'essai, ne permettaient d'en
 *   tirer aucun seuil par la mesure ; le poser ailleurs était donc la seule
 *   honnêteté disponible.
 */

export interface DelaiDeSouffrance {
  /** Jours sans mouvement au-delà desquels un ordre ouvert est en souffrance. */
  jours: number;
  /** Jours avant la clôture d'une ligne en deçà desquels tout ordre ouvert presse. */
  avantCloture: number;
}

export const SOUFFRANCE_DEFAUT: DelaiDeSouffrance = { jours: 7, avantCloture: 3 };
export const SOUFFRANCE_KEY = "souffrance";

/** Les états où un ordre attend encore quelque chose de nous. */
export const ETATS_OUVERTS: IntentState[] = ["recue", "contre_proposee", "confirmee", "transmise"];

export type Pression = "calme" | "en-souffrance" | "cloture-proche";

export interface Souffrance {
  /** Jours écoulés depuis la dernière transition connue, ou depuis la réception. */
  jours: number;
  /** Faux : aucune transition au journal, l'âge est celui de la réception. */
  depuisUneTransition: boolean;
  pression: Pression;
  /** Jours restants avant la clôture de la ligne, quand elle en a une. */
  avantCloture?: number;
  /** La dernière phrase du journal, qui dit souvent ce qui bloque. */
  dernierMot?: string;
}

/**
 * La dernière transition d'état, lue au journal.
 *
 * Le journal n'a pas de champ « état » : il porte des phrases. Elles suivent
 * pourtant une forme constante, « RÉF (Client) — Confirmée · … » ou
 * « RÉF : Annulée · … », et c'est elle qu'on reconnaît. Une phrase qui ne
 * nomme aucun état ne compte pas : un message préparé ou un document généré
 * ne fait pas avancer l'ordre, et le compter remettrait le compteur à zéro
 * sans que rien n'ait bougé.
 */
const NOMME_UN_ETAT = /(confirm|transmis|contre-propos|servie|non servie|réglée|reglee|annulée|annulee)/i;

export function derniereTransition(intentId: string, journal: EventLog[]): EventLog | undefined {
  let vue: EventLog | undefined;
  for (const e of journal) {
    if (e.intentId !== intentId) continue;
    if (!NOMME_UN_ETAT.test(texteNu(e.html))) continue;
    if (!vue || e.at > vue.at) vue = e;
  }
  return vue;
}

/** La dernière ligne du journal, quel qu'en soit le propos : elle dit souvent ce qui bloque. */
export function dernierMot(intentId: string, journal: EventLog[]): string | undefined {
  let vue: EventLog | undefined;
  for (const e of journal) {
    if (e.intentId === intentId && (!vue || e.at > vue.at)) vue = e;
  }
  return vue ? texteNu(vue.html) : undefined;
}

const texteNu = (html: string): string =>
  String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const jours = (de: string, a: Date): number => Math.max(0, Math.round((a.getTime() - Date.parse(de)) / 86_400_000));

export function souffranceDe(
  i: Intent,
  offre: Offer | undefined,
  journal: EventLog[],
  delai: DelaiDeSouffrance = SOUFFRANCE_DEFAUT,
  now = new Date(),
): Souffrance | undefined {
  /* Un ordre clos n'attend plus rien : lui compter une ancienneté ferait
     grossir la file de lignes sur lesquelles il n'y a rien à faire. */
  if (!ETATS_OUVERTS.includes(i.state)) return undefined;

  const transition = derniereTransition(i.id, journal);
  const depuis = transition?.at ?? i.createdAt;
  const age = jours(depuis, now);

  /* LA CLÔTURE PRIME, et elle prime même sur un ordre tout frais : ce qui
     presse n'est pas que nous ayons tardé, c'est que la porte se ferme. */
  const avantCloture =
    offre?.deadlineAt && aUneCloture(offre) ? Math.round((Date.parse(offre.deadlineAt) - now.getTime()) / 86_400_000) : undefined;

  const pression: Pression =
    avantCloture != null && avantCloture <= delai.avantCloture ? "cloture-proche" : age >= delai.jours ? "en-souffrance" : "calme";

  return { jours: age, depuisUneTransition: Boolean(transition), pression, avantCloture, dernierMot: dernierMot(i.id, journal) };
}

/**
 * Une ligne a-t-elle une vraie clôture ?
 *
 * Les OPCVM se traitent en continu et portent une date sentinelle lointaine ;
 * la compter ferait d'un fonds une ligne qui ne presse jamais, ce qui est
 * juste, mais par accident. On le dit donc explicitement.
 */
function aUneCloture(o: Offer): boolean {
  if (o.kind === "FONDS" || o.kind === "MARCHE") return false;
  if (!o.deadlineAt) return false;
  /* Une échéance au-delà de dix ans est une sentinelle, pas une clôture. */
  return Date.parse(o.deadlineAt) - Date.now() < 10 * 365 * 86_400_000;
}
