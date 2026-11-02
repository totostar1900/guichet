import type { IntentState, IntentType, Offer } from "./types";
import { displayStatus } from "./status";
import { tradedSession, type Quote } from "./market";
import { fondsListes, lignesDeLaCote, seancesAnnoncees } from "./listes";

/**
 * CE QUE LA PAGE D'ARRIVÉE CHOISIT DANS LES OFFRES, ÉCRIT UNE FOIS.
 *
 * Quatre tuiles d'« Investir » et la tuile des échéances lisent la même liste
 * d'offres que la page a déjà. Chaque sélection vit ici, pure et testable : le
 * composant ne fait que la mettre en forme. Deux endroits qui choisiraient
 * « les séances ouvertes » chacun à sa façon finiraient par ne plus désigner
 * les mêmes — c'est la leçon de `domain/listes`, et elle vaut ici.
 *
 * LE PLUS URGENT EN TÊTE, S'IL Y A UNE URGENCE. Une séance ferme : la plus
 * proche passe devant. Une ligne de la cote ne ferme pas et un fonds non plus :
 * leur « première » ligne est la plus récemment traitée, jamais une fausse
 * clôture (voir la sentinelle « 2099-12-31 » de `echeances`).
 */

const MS_JOUR = 86_400_000;

/** Les séances encore ouvertes, la clôture la plus proche d'abord. */
export function seancesOuvertes(offers: Offer[], now = new Date()): Offer[] {
  return seancesAnnoncees(offers)
    .filter((o) => {
      const s = displayStatus(o, now);
      return s === "open" || s === "closing";
    })
    .sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt) || a.title.localeCompare(b.title, "fr"));
}

/**
 * LES SÉANCES ANNONCÉES QUI N'ONT PAS ENCORE OUVERT. « Prochaines adjudications » :
 * la fenêtre de souscription n'est pas ouverte, la maison sait déjà quand elle
 * le sera. La plus proche d'abord. Elle ne paraît que s'il y en a — sans quoi la
 * place revient à la tuile « proposer la sienne ».
 */
export function seancesPrevues(offers: Offer[], now = new Date(), max = 3): Offer[] {
  return seancesAnnoncees(offers)
    .filter((o) => displayStatus(o, now) === "upcoming")
    .sort((a, b) => a.opensAt.localeCompare(b.opensAt) || a.title.localeCompare(b.title, "fr"))
    .slice(0, max);
}

/** Les lignes de la cote encore commandables (une ligne « Clôturée » n'est pas une entrée), la dernière traitée d'abord. */
export function lignesActives(offers: Offer[], now = new Date()): Offer[] {
  return lignesDeLaCote(offers)
    .filter((o) => displayStatus(o, now) === "quoted")
    .sort((a, b) => (b.lastTradedOn ?? "").localeCompare(a.lastTradedOn ?? "") || a.title.localeCompare(b.title, "fr"));
}

/** Les fonds ouverts au catalogue, dans l'ordre du desk. */
export function fondsOuverts(offers: Offer[]): Offer[] {
  return fondsListes(offers).filter((o) => o.status !== "withdrawn");
}

/** Jours entiers restant avant une date ISO (négatif : passée). */
export function joursRestants(iso: string, now = new Date()): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / MS_JOUR);
}

/**
 * LES RUBRIQUES D'UN DOSSIER : UNE RUBRIQUE N'EXISTE QUE SI ELLE A QUELQUE CHOSE
 * À MONTRER. La règle des deux conditionnelles (sondage, prélèvements) devient
 * la règle de toutes. Chaque rubrique porte une CLÉ, la condition qui la fait
 * paraître, et la ligne d'information qui la dit — jamais un compte dans son nom
 * (arbitrage du 29 octobre 2026).
 */
export type CleDeRubrique = "intentions" | "sondage" | "prelevements" | "versements" | "garde" | "suivies" | "operations" | "documents";

export interface FaitsDuDossier {
  /** Intentions du client (hors brouillons sans objet). */
  intentions: number;
  attentesSondees: number;
  mandats: number;
  versements: number;
  avisDeGarde: number;
  lignesSuivies: number;
  /** Positions tenues, ou flux à venir. */
  operations: number;
  documents: number;
}

export function rubriquesPresentes(f: FaitsDuDossier): CleDeRubrique[] {
  const out: CleDeRubrique[] = [];
  if (f.intentions > 0) out.push("intentions");
  if (f.attentesSondees > 0) out.push("sondage");
  if (f.mandats > 0) out.push("prelevements");
  if (f.versements > 0) out.push("versements");
  if (f.avisDeGarde > 0) out.push("garde");
  if (f.lignesSuivies > 0) out.push("suivies");
  if (f.operations > 0) out.push("operations");
  if (f.documents > 0) out.push("documents");
  return out;
}

/**
 * « VOUS POUVEZ AUSSI » : LES GESTES QUE LE CLIENT PEUT FAIRE LUI-MÊME ET N'A PAS FAITS.
 *
 * Elle n'avait qu'une ligne parce qu'elle ne listait que l'inachevé, et que le
 * client de démonstration avait presque tout fait. Elle suit maintenant un
 * CATALOGUE ORDONNÉ — du plus bloquant au plus facultatif —, dont on garde les
 * cinq premiers qui s'appliquent, puis deux OUTILS qui valent toujours
 * (simulateur, comparer) : elle n'est jamais en dessous de deux lignes.
 *
 * Jamais « Droits de garde » ni « Documents » : le client ne les crée pas, ils
 * paraissent d'eux-mêmes.
 */
export type GesteProposable = "dossier" | "intention" | "versement" | "reinvestir" | "appareil" | "profil" | "suivre" | "sondage" | "simulateur" | "comparer";

export interface FaitsPourGestes extends FaitsDuDossier {
  /** Le compte est ouvert et la convention acceptée : on peut agir. */
  conventionOk: boolean;
  /** Le dossier attend quelque chose du client (convention, compléments). */
  dossierAPoursuivre: boolean;
  profilRenseigne: boolean;
  appareilAjoute: boolean;
  /** Des coupons sont attendus, et aucun réinvestissement n'est en place. */
  couponsSansReinvestissement: boolean;
}

export const NB_GESTES = 5;

export function gestesProposables(f: FaitsPourGestes): GesteProposable[] {
  const out: GesteProposable[] = [];
  if (f.dossierAPoursuivre) out.push("dossier");
  if (f.conventionOk && f.intentions === 0) out.push("intention");
  if (f.conventionOk && f.versements === 0) out.push("versement");
  if (f.couponsSansReinvestissement) out.push("reinvestir");
  if (!f.appareilAjoute) out.push("appareil");
  if (!f.profilRenseigne) out.push("profil");
  if (f.lignesSuivies === 0) out.push("suivre");
  if (f.attentesSondees === 0) out.push("sondage");
  out.push("simulateur", "comparer");
  return out.slice(0, NB_GESTES);
}

/**
 * LES CHIFFRES D'UNE INTENTION, POUR LA TUILE « MES INTENTIONS » (1er novembre 2026).
 *
 * Un nom et un état ne disaient pas combien. On ajoute ce que le client a lui-même
 * dit — le montant — et, une fois la séance passée, la part qu'on lui a servie.
 *
 * L'UNITÉ N'EST DITE QUE QUAND ON LA SAIT. « amount » est « des FCFA, ou des titres
 * pour une cession » (voir le modèle) : une souscription, une prise ferme et un appétit
 * s'expriment en FCFA ; le rachat de parts d'un fonds en parts. Un ordre d'achat ou de
 * vente sur la cote peut porter une quantité autant qu'un montant : on n'invente pas
 * d'unité, on ne dit pas le chiffre.
 */
export interface ChiffresIntention {
  montant?: { valeur: number; unite: "FCFA" | "parts" };
  /** La part servie, de 0 à 100, une fois la séance rendue. */
  serviPct?: number;
}

export function chiffresDeLIntention(i: { type: IntentType; amount?: number | null; allocationPct?: number | null; state: IntentState }, kind: string): ChiffresIntention {
  const out: ChiffresIntention = {};
  const valeur = i.amount ?? 0;
  if (valeur > 0) {
    if (i.type === "souscription" || i.type === "ferme" || i.type === "appetit") out.montant = { valeur, unite: "FCFA" };
    else if (i.type === "rachat" && kind === "FONDS") out.montant = { valeur, unite: "parts" };
  }
  if (typeof i.allocationPct === "number" && (i.state === "servie" || i.state === "reglee")) out.serviPct = Math.round(i.allocationPct);
  return out;
}

/**
 * LA VARIATION D'UNE LIGNE, SI LA MAISON LA CONNAÎT (Accueil, 2 novembre 2026).
 *
 * Une pastille de variation se pose sur chaque ligne qui a un cours ou une VL
 * dont on connaît le précédent. Aujourd'hui, seule la VL d'un fonds porte sa
 * variation sur l'offre (`fund.variationPct`, d'une VL à la suivante) : les
 * cours des titres cotés vivent dans l'historique des séances, et un cours du
 * Trésor n'a pas de précédent. Une ligne sans variation connue n'a PAS de
 * pastille : jamais « 0 % » inventé.
 */
export function variationDe(o: Offer): number | undefined {
  if (o.kind !== "FONDS") return undefined;
  const v = o.fund?.variationPct;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** La variation d'une ligne cotée : entre ses deux derniers ÉCHANGES, et les dates qui la bornent. */
export interface VariationDeLigne {
  pct: number;
  /** La séance du précédent échange (ISO). */
  depuis: string;
  /** La séance du dernier échange (ISO). */
  le: string;
}

/**
 * LA VARIATION D'UNE ACTION : DU DERNIER ÉCHANGE AU PRÉCÉDENT (2 novembre 2026).
 *
 * `quotes` : la plus récente d'abord, comme `listQuotes`. Une séance où rien
 * n'a traité ne compte pas (c'est la règle de `tradedSession` : seuls le volume
 * et les transactions font foi) ; la comparaison se fait donc entre deux prix
 * qui se sont vraiment formés, parfois à une semaine d'écart, d'où les deux
 * dates rendues avec le pourcentage. Moins de deux échanges, ou un cours
 * précédent nul : pas de variation, jamais un zéro inventé. Un zéro REEL
 * (cours identique) se rend, lui, comme tel.
 */
export function variationDesDerniersEchanges(quotes: Quote[]): VariationDeLigne | undefined {
  const echanges = quotes.filter(tradedSession);
  const [dernier, precedent] = echanges;
  if (!dernier || !precedent || !(precedent.close > 0)) return undefined;
  return { pct: Math.round((dernier.close / precedent.close - 1) * 10000) / 100, depuis: precedent.sessionDate, le: dernier.sessionDate };
}

/**
 * LE TON D'UN ÉTAT D'INTENTION (2 novembre 2026, planche « couleur et fonds », 2A).
 *
 * La couleur dit où en est l'ordre : vert quand la maison a confirmé, servi ou réglé ;
 * ambre quand la balle est dans le camp du client (une contre-proposition à
 * accepter) ; neutre pour le reste. « Non servie » n'est PAS rouge : ce n'est pas
 * une faute du client, c'est le résultat d'une séance. Le rouge est réservé à ce
 * qui est faux ou refusé, et aucun état d'intention n'est l'un ni l'autre.
 */
export type TonDEtat = "bon" | "attention" | "neutre";
export const TON_DE_LETAT: Record<IntentState, TonDEtat> = {
  recue: "neutre",
  contre_proposee: "attention",
  confirmee: "bon",
  transmise: "neutre",
  servie: "bon",
  non_servie: "neutre",
  reglee: "bon",
  annulee: "neutre",
};
