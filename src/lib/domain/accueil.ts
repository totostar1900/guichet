import type { Offer } from "./types";
import { displayStatus } from "./status";
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
 * LES GESTES QU'UN CLIENT PEUT FAIRE LUI-MÊME ET QU'IL N'A PAS FAITS. « Vous
 * pouvez aussi » : seulement des gestes (programmer un versement, suivre une
 * ligne) — jamais « Droits de garde » ou « Documents », que le client ne peut
 * pas créer : ils paraissent d'eux-mêmes.
 */
export type GesteProposable = "intention" | "versement" | "suivre" | "prelevement";

export function gestesProposables(f: FaitsDuDossier, conventionOk: boolean): GesteProposable[] {
  const out: GesteProposable[] = [];
  if (conventionOk && f.intentions === 0) out.push("intention");
  if (conventionOk && f.versements === 0) out.push("versement");
  if (f.lignesSuivies === 0) out.push("suivre");
  if (conventionOk && f.mandats === 0) out.push("prelevement");
  return out;
}
