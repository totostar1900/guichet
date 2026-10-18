import type { AuctionResult } from "./auction-results";
import type { Country } from "@/lib/domain/types";
import { auctionYield, vieRestante, type Assumption, type Convention } from "./yield";

/**
 * CE QUE LA PLACE A PAYÉ SUR UNE ÉCHÉANCE, ET CE QU'ELLE N'A PAS PAYÉ.
 *
 * Le desk tarifait devant une seule phrase : « dernière séance comparable,
 * 95,00 % ». Un point, sans sa dispersion, sans son âge, et choisi sur
 * l'ÉTIQUETTE de durée. Cette dernière faute est la plus coûteuse : une
 * obligation gabonaise étiquetée « 4 ans » abondée alors qu'il ne lui restait
 * qu'un an et demi à courir se servait à 16,85 %, et servait de référence à une
 * ligne neuve de quatre ans. Le prix d'un abondement CEMAC est d'ailleurs
 * conventionnel, ancré autour de 90 : 49 % des prix limites tombent entre 89,50
 * et 91,50, et la corrélation entre le prix servi et la vie restante vaut 0,08.
 * Son rendement suit donc l'arithmétique du reliquat, pas l'avis du marché.
 *
 * Quatre règles en découlent, et chacune a été mesurée avant d'être écrite.
 *
 *   ON APPARIE PAR LA VIE RESTANTE, jamais par l'étiquette. Le champ
 *   `abondement` ne sert à rien : il est vrai UNE fois sur 255, et il
 *   contredit l'échéance sur 33 séances, toutes dans le même sens.
 *
 *   ON NE RETIENT QUE LES LIGNES NEUVES. Corriger les abondements par une
 *   prime serait mieux, puisque cela garderait trente-trois observations sur
 *   deux cent vingt-cinq : la prime a été mesurée sur treize paires et elle
 *   n'existe pas. Médiane 174 pb, écart-type 367 pb, signe changeant de −213 à
 *   +925. L'ajouter reviendrait à ajouter du bruit au bruit.
 *
 *   ON NE SORT PAS DU PAYS. L'ancienne référence se rabattait sur le reste de
 *   la zone en le déclarant. Le Gabon et le Cameroun n'empruntent pas au même
 *   prix, et un desk lit d'abord le chiffre, l'avertissement ensuite. Mieux
 *   vaut ne rien proposer : « le robot ne propose rien faute de mieux, et le
 *   desk décide seul en le sachant. »
 *
 *   LE POINT EST LA SÉANCE LA PLUS RÉCENTE, pas le milieu de la fourchette,
 *   qui pèserait une séance d'hier et une séance d'il y a dix-huit mois à
 *   égalité. La fourchette, elle, dit la place dont on dispose autour.
 *
 * LA DENSITÉ COMMANDE TOUT LE RESTE, et elle est maigre : vingt-neuf séances
 * sur la dernière année pour six Trésors et six échéances, et plus d'une case
 * trimestrielle sur deux n'en contient qu'une. Un niveau tiré d'une seule
 * séance reste lisible, c'est la forme d'un seul carnet, mais il doit le dire.
 */

/** Les paniers d'échéance, calés sur les points que la BEAC publie elle-même. */
export const PANIERS = [
  { nom: "≤ 6 mois", bas: 0, haut: 0.6 },
  { nom: "1 an", bas: 0.6, haut: 1.5 },
  { nom: "2 ans", bas: 1.5, haut: 2.5 },
  { nom: "3 ans", bas: 2.5, haut: 3.5 },
  { nom: "4-5 ans", bas: 3.5, haut: 5.5 },
  { nom: "7 ans +", bas: 5.5, haut: 99 },
] as const;

export type Panier = (typeof PANIERS)[number]["nom"];

export function panierDe(annees: number): Panier | undefined {
  return PANIERS.find((p) => annees > p.bas && annees <= p.haut)?.nom;
}

/**
 * Les années que porte l'étiquette de durée, « 26 semaines » comprise.
 *
 * Elle ne sert qu'à une chose : reconnaître une ligne neuve, dont la vie
 * restante égale la durée annoncée. Partout ailleurs c'est l'échéance qui fait
 * foi, parce que l'étiquette nomme la ligne et l'échéance porte la date.
 */
export function anneesDeLEtiquette(tenor: string | undefined): number | undefined {
  const m = String(tenor ?? "").match(/(\d+)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (/semaine/i.test(String(tenor))) return n / 52;
  if (/mois/i.test(String(tenor))) return n / 12;
  return n;
}

/**
 * Une ligne neuve : sa vie restante égale sa durée annoncée.
 *
 * La tolérance de trois semaines absorbe le décalage de règlement, deux jours
 * ouvrés, et l'arrondi de l'étiquette : une ligne créée le 4 septembre 2019 et
 * remboursée le 23 août 2021 porte « 2 ans ».
 */
export function estLigneNeuve(r: Pick<AuctionResult, "tenor" | "sessionOn" | "maturityOn">): boolean {
  const v = vieRestante(r);
  const etiquette = anneesDeLEtiquette(r.tenor);
  if (v == null || etiquette == null) return false;
  return Math.abs(v.years - etiquette) <= 0.06;
}

export interface SeanceComparable {
  id: string;
  sessionOn: string;
  tenor: string;
  codeEmission?: string;
  /** La vie restante au jour de la séance, qui a servi à la ranger. */
  annees: number;
  /** Le rendement retenu pour cette séance, par le chemin le plus sûr disponible. */
  rendement: number;
  /** Les deux bords du corps, en rendement : le limite et le moyen pondéré. */
  auLimite?: number;
  auMoyen?: number;
  /** Ce que le calcul a supposé, repris tel quel de `auctionYield`. */
  hypotheses: Assumption[];
}

export interface NiveauMarche {
  /** Le moyen pondéré de la séance la plus récente, converti en rendement. */
  point: number;
  /** La fourchette : le plus bas et le plus haut des bords de corps rencontrés. */
  bas: number;
  haut: number;
  panier: Panier;
  /** Les séances retenues, la plus récente d'abord. */
  seances: SeanceComparable[];
  derniere: SeanceComparable;
  /** L'âge de la séance la plus récente, en jours, au jour de la cible. */
  ageJours: number;
  /** Vrai : une seule séance, donc aucune dispersion mesurée. */
  uneSeule: boolean;
  /** Combien de séances du même panier ont été écartées, et pourquoi. */
  ecartees: { abondements: number; nonRelues: number; horsFenetre: number };
}

export interface CibleDuNiveau {
  country: Country;
  instrument: AuctionResult["instrument"];
  /** La vie restante visée, en années. Pour une ligne neuve, c'est sa durée. */
  annees: number;
  /** Le jour depuis lequel on regarde en arrière. */
  on: string;
}

const jours = (de: string, a: string): number => Math.round((Date.parse(a) - Date.parse(de)) / 86_400_000);

/** La fenêtre par défaut, vingt-quatre mois : celle de la maquette. */
export const FENETRE_MOIS = 24;

export function niveauDuMarche(
  cible: CibleDuNiveau,
  historique: AuctionResult[],
  options: { convention?: Convention; fenetreMois?: number; exigerRelues?: boolean } = {},
): NiveauMarche | undefined {
  const { convention = "guichet", fenetreMois = FENETRE_MOIS, exigerRelues = true } = options;
  const panier = panierDe(cible.annees);
  if (!panier) return undefined;

  const debut = new Date(`${cible.on}T00:00:00Z`);
  debut.setUTCMonth(debut.getUTCMonth() - fenetreMois);
  const depuis = debut.toISOString().slice(0, 10);

  const ecartees = { abondements: 0, nonRelues: 0, horsFenetre: 0 };
  const seances: SeanceComparable[] = [];

  for (const r of historique) {
    if (r.country !== cible.country || r.instrument !== cible.instrument) continue;
    if (r.setAsideAt) continue;
    const v = vieRestante(r);
    if (v == null || panierDe(v.years) !== panier) continue;

    /* L'ordre des rejets est celui des causes, pas celui du code : une séance
       hors fenêtre n'est pas « un abondement », elle est d'abord trop vieille. */
    if (r.sessionOn > cible.on || r.sessionOn < depuis) {
      ecartees.horsFenetre += 1;
      continue;
    }
    if (!estLigneNeuve(r)) {
      ecartees.abondements += 1;
      continue;
    }
    if (exigerRelues && !r.confirmedBy) {
      ecartees.nonRelues += 1;
      continue;
    }

    const y = auctionYield(r, convention);
    if (!y) continue;
    seances.push({
      id: r.id,
      sessionOn: r.sessionOn,
      tenor: r.tenor,
      codeEmission: r.codeEmission,
      annees: v.years,
      rendement: y.pct,
      auLimite: bordDuCorps(r, "limite", convention),
      auMoyen: bordDuCorps(r, "moyen", convention),
      hypotheses: y.assumptions,
    });
  }

  if (!seances.length) return undefined;
  seances.sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));
  const derniere = seances[0];

  const bords = seances.flatMap((s) => [s.auLimite, s.auMoyen, s.rendement].filter((x): x is number => x != null));
  return {
    point: derniere.auMoyen ?? derniere.rendement,
    bas: Math.min(...bords),
    haut: Math.max(...bords),
    panier,
    seances,
    derniere,
    ageJours: jours(derniere.sessionOn, cible.on),
    uneSeule: seances.length === 1,
    ecartees,
  };
}

/**
 * Le rendement que donnerait le prix limite, ou le moyen pondéré, seul.
 *
 * LA CONVERSION INVERSE L'ORDRE DES OBLIGATIONS : le prix le plus haut donne le
 * rendement le plus BAS. On ne nomme donc jamais ces deux bords « haut » et
 * « bas » : on les nomme par la case dont ils sortent, et c'est l'appelant qui
 * les range ensuite par leur valeur.
 */
function bordDuCorps(r: AuctionResult, quelle: "limite" | "moyen", convention: Convention): number | undefined {
  const valeur = r.instrument === "BTA" ? (quelle === "limite" ? r.rateLimit : r.rateAvg) : quelle === "limite" ? r.priceLimit : r.priceAvg;
  if (valeur == null) return undefined;
  const feinte: AuctionResult =
    r.instrument === "BTA"
      ? { ...r, yieldAvg: undefined, yieldLimit: undefined, rateAvg: valeur, rateLimit: undefined }
      : { ...r, yieldAvg: undefined, yieldLimit: undefined, priceAvg: valeur, priceAvgFcfa: undefined, priceLimit: undefined, priceMin: undefined, priceMax: undefined };
  return auctionYield(feinte, convention)?.pct;
}

/** La ligne de contexte que le desk lit sous le niveau mesuré. */
export function ligneDuNiveau(n: NiveauMarche): string {
  const bits = [`${n.seances.length} séance${n.seances.length > 1 ? "s" : ""} comparable${n.seances.length > 1 ? "s" : ""}`];
  bits.push(`la plus récente le ${n.derniere.sessionOn}, il y a ${n.ageJours} jour${n.ageJours > 1 ? "s" : ""}`);
  bits.push(`panier « ${n.panier} »`);
  if (n.uneSeule) bits.push("une seule séance, donc aucune dispersion mesurée");
  if (n.ecartees.abondements) bits.push(`${n.ecartees.abondements} abondement${n.ecartees.abondements > 1 ? "s" : ""} écarté${n.ecartees.abondements > 1 ? "s" : ""}`);
  if (n.ecartees.nonRelues) bits.push(`${n.ecartees.nonRelues} séance${n.ecartees.nonRelues > 1 ? "s" : ""} non relue${n.ecartees.nonRelues > 1 ? "s" : ""}`);
  return bits.join(" · ");
}
