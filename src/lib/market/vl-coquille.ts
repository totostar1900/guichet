import type { FundNav } from "@/lib/domain/market";

/**
 * CE QUI FAIT QU'UNE VALEUR LIQUIDATIVE S'ÉCRIT, OU NON.
 *
 * LE MESSAGE D'AVANT MENTAIT, ET IL A FALLU ROUVRIR QUARANTE-CINQ SÉANCES POUR
 * LE SAVOIR. Il disait « date ou valeur invraisemblable » sans nommer laquelle
 * des quatre règles avait parlé. Mesuré le 12 octobre 2026 sur les 89 VL
 * écartées que la base garde :
 *
 *   VL antérieure à la création du fonds   56
 *   postérieure de plus de 7 jours         20
 *   plusieurs règles à la fois              7
 *   antérieure de plus de 400 jours         6
 *   valeur nulle ou négative                0
 *
 * ZÉRO. Le message parlait de valeur dans 89 cas sur 89 où aucune valeur
 * n'était en cause. Chaque motif se nomme donc désormais.
 *
 * LA COQUILLE D'ANNÉE DE JANVIER, ET POURQUOI ELLE SE RÉPARE SEULE.
 *
 * Le gros du lot est d'une seule espèce : une séance de janvier 2024 porte une
 * VL datée de janvier 2023 pour un fonds né en septembre 2023. La bourse écrit
 * l'année qui vient de finir, comme on la date sur un chèque le 2 janvier.
 * La date tombe dans la fenêtre des quatre cents jours, donc c'est la règle de
 * la création qui l'attrape, par chance plutôt que par dessein.
 *
 * CE CAS SE PROUVE SANS PERSONNE, et c'est ce qui autorise à le réparer : une
 * VL antérieure à la naissance du fonds n'est pas improbable, elle est
 * IMPOSSIBLE. Si ajouter un an la rend plausible ET postérieure à la création,
 * il n'existe pas d'autre lecture. C'est la mécanique de la seconde identité
 * prix / nominal : on essaie une correction, et on ne la retient que si elle
 * résout tout.
 *
 * TROIS BORNES QUI TIENNENT LA RÉPARATION HONNÊTE.
 *
 *   ON NE RÉPARE QUE L'IMPOSSIBLE. Une VL simplement trop vieille (quatre cent
 *   vingt jours) pourrait être une VL vraiment ancienne que la bourse
 *   réimprime : lui ajouter un an serait un pari. Seule « antérieure à la
 *   création » est une contradiction, et seule elle se répare.
 *
 *   LA CORRECTION DOIT TOUT RÉSOUDRE. Si l'année suivante laisse une seule
 *   des quatre règles en faute, on n'a pas trouvé la bonne lecture : la VL est
 *   écartée comme avant.
 *
 *   ELLE SE DIT. Une réparation muette serait une donnée inventée. Elle sort
 *   en note, avec l'ancienne date et la nouvelle, et jamais en avertissement :
 *   un avertissement laisserait la séance « partielle » pour un défaut déjà
 *   corrigé, et c'est la question périmée qu'on passe son temps à retirer des
 *   écrans du desk.
 */

/** Ce qui peut écarter une VL, nommé. */
export type MotifVl = "future" | "vieille" | "valeur" | "avant_creation" | "montant_en_date";

export const MOTIF_VL: Record<MotifVl, string> = {
  future: "elle est postérieure à la séance de plus de sept jours",
  vieille: "elle est antérieure à la séance de plus de quatre cents jours",
  valeur: "la valeur lue n'est pas un montant positif",
  avant_creation: "elle précède la création annoncée du fonds",
  montant_en_date: "cette cellule n'est pas une date : c'est un montant rendu en date par un tableur",
};

/**
 * LA CELLULE QUI N'EST PAS UNE DATE, ET QU'ON APPELAIT « TROP VIEILLE ».
 *
 * Le défaut connu allait dans un sens : un numéro de série imprimé là où une
 * date est attendue, « 46 206,00 » pour le 3 juillet 2026. Georges a vu
 * l'autre sens, et il est plus traître : un MONTANT rendu en date. Une VL de
 * 13 159 francs devient « 10/01/1936 ».
 *
 * LE MOTIF D'AVANT MENTAIT, exactement comme celui que ce module avait déjà
 * corrigé une fois. « Antérieure à la séance de plus de quatre cents jours »
 * décrit une VL ancienne, c'est-à-dire une date ; or il n'y a pas de date du
 * tout dans cette cellule. Le desk lisait une donnée périmée là où la bourse
 * publie une donnée corrompue, et ce n'est pas le même interlocuteur.
 *
 * LA SIGNATURE EST ARITHMÉTIQUE, pas statistique. Les fonds de la zone
 * naissent à 10 000 francs ; interprétées comme numéros de série, leurs
 * valeurs tombent toutes entre 1924 et 1954. Une date de VL antérieure à
 * l'an 2000 n'a donc jamais été une date.
 *
 * MESURÉ SUR LES SEPT RANGÉES DE LA BASE, le 13 octobre 2026, en
 * reconvertissant chaque date en numéro de série et en la confrontant à la
 * série du fonds :
 *
 *   1927-07-17  → 10 060   VL réelle 10 060,33   écart -0,33
 *   1936-01-10  → 13 159   VL réelle 13 159,79   écart -0,79
 *   1934-07-25  → 12 625   VL réelle 12 625,52   écart -0,52
 *   1932-06-16  → 11 856   VL réelle 11 856,64   écart -0,64
 *   1934-07-22  → 12 622   VL réelle 12 622,81   écart -0,81
 *   1930-11-19  → 11 281   VL réelle 11 281,15   écart -0,15
 *
 * Sept sur sept, l'écart est NÉGATIF et inférieur au franc : le rendu en date
 * TRONQUE les centimes. On récupère donc la partie entière, et on sait
 * précisément ce qu'on perd.
 *
 * ON NE RÉÉCRIT RIEN POUR AUTANT, et c'est la borne qui tient tout le reste.
 * Le montant reconstruit est une partie entière, donc moins bon que la VL au
 * centime que la série porte déjà par ailleurs : l'écrire remplacerait une
 * valeur juste par une valeur tronquée. Et la rangée entière est décalée, pas
 * seulement cette cellule : rebâtir la rangée serait un pari sur la
 * disposition, pas une lecture. La reconstruction sert donc de PREUVE dans le
 * relevé au fournisseur, pas de valeur dans la base.
 */
const EPOQUE_EXCEL = Date.UTC(1899, 11, 30);
/** Avant l'an 2000, aucune VL de ce marché n'existe : la cellule est un nombre. */
const ANNEE_IMPOSSIBLE = 2000;

/** Le numéro de série que cette date encode, c'est-à-dire le montant imprimé. */
export function montantDerriereLaDate(iso: string): number | undefined {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(t)) return undefined;
  const n = Math.round((t - EPOQUE_EXCEL) / 86_400_000);
  return n > 0 ? n : undefined;
}

/** Cette date est-elle en réalité un montant ? */
export const estUnMontantEnDate = (iso: string): boolean => Number(iso.slice(0, 4)) < ANNEE_IMPOSSIBLE;

export interface VerdictVl {
  /** La VL à écrire, corrigée s'il y avait lieu. Absente : elle est écartée. */
  garde?: FundNav;
  /** L'ancienne date, quand l'année a été réparée. */
  coquille?: string;
  /** Pourquoi elle est écartée, quand elle l'est. */
  motif?: MotifVl;
  /**
   * Le montant que la cellule porte réellement, quand la date en est un.
   *
   * Il ne sert pas à écrire : il sert à PROUVER au fournisseur que la cellule
   * est mal typée, en lui rendant son propre nombre.
   */
  montantDeduit?: number;
}

const JOUR = 86_400_000;
/** La VL peut devancer la séance de quelques jours : la table est arrêtée avant d'être imprimée. */
const AVANCE = 7;
/** Au-delà, ce n'est plus une VL ancienne, c'est une date lue de travers. */
const RETARD = 400;

const jours = (a: string, b: string): number => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / JOUR);

/** Les règles en faute, dans l'ordre où on les nomme. */
function fautes(navDate: string, nav: number, inception: string | undefined, sessionDate: string): MotifVl[] {
  const out: MotifVl[] = [];
  const ecart = jours(navDate, sessionDate);
  if (!Number.isFinite(ecart)) return ["vieille"];
  if (ecart > AVANCE) out.push("future");
  if (ecart < -RETARD) out.push("vieille");
  if (!(nav > 0)) out.push("valeur");
  if (inception && navDate < inception) out.push("avant_creation");
  return out;
}

/**
 * La même date, un an plus tard, ou rien.
 *
 * Le 29 février n'existe pas tous les ans, et « 2025-02-29 » se changerait en
 * 1er mars sans le dire : on refuse la correction plutôt que de déplacer la
 * date d'un jour à l'insu de tout le monde.
 */
function anneeSuivante(iso: string): string | undefined {
  return decalerAnnee(iso, 1);
}

/** La même date, un an plus tôt, avec le même refus du 29 février. */
function anneePrecedente(iso: string): string | undefined {
  return decalerAnnee(iso, -1);
}

function decalerAnnee(iso: string, pas: number): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  const essai = `${Number(m[1]) + pas}-${m[2]}-${m[3]}`;
  const d = new Date(`${essai}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== essai ? undefined : essai;
}

/**
 * LA FENÊTRE SERRÉE DE LA COQUILLE INVERSE, et c'est elle qui fait tout.
 *
 * Retirer une année à une date future « résout toutes les fautes » bien trop
 * facilement : la borne générale tolère jusqu'à quatre cents jours de retard,
 * donc n'importe quelle date de l'année écoulée passerait. Mesuré sur les
 * vingt cas de la base, ce critère large en acceptait seize, dont douze
 * fausses.
 *
 * Une VALEUR PRÉCÉDENTE vieille de plus d'un mois n'est pas une valeur
 * précédente : c'est une autre faute. Trente et un jours séparent donc le
 * vrai du faux, et la mesure dit que la séparation est franche : les quatre
 * séances retenues tombent à 5, 7, 10 et 11 jours, les douze refusées à 276
 * jours au moins. Aucun cas limite, ce qui est exactement ce qu'on demande à
 * un seuil.
 */
const RETARD_COQUILLE = 31;

/** Garder, réparer, ou écarter en disant pourquoi. */
export function jugerLaVl(n: FundNav, sessionDate: string): VerdictVl {
  const faute = fautes(n.navDate, n.nav, n.inceptionDate, sessionDate);
  if (faute.length === 0) return { garde: n };

  /* AVANT TOUTE RÉPARATION : s'il n'y a pas de date dans la cellule, aucune
     correction de date n'a de sens. Ajouter une année à un montant produirait
     une date plausible à partir de rien, ce qui est exactement la valeur
     inventée que la maison refuse. */
  if (estUnMontantEnDate(n.navDate)) {
    return { motif: "montant_en_date", montantDeduit: montantDerriereLaDate(n.navDate) };
  }

  /* On ne répare que l'impossible, et seulement si la correction résout tout. */
  if (faute.includes("avant_creation")) {
    const suivante = anneeSuivante(n.navDate);
    if (suivante && fautes(suivante, n.nav, n.inceptionDate, sessionDate).length === 0) {
      return { garde: { ...n, navDate: suivante }, coquille: n.navDate };
    }
  }

  /**
   * LA MÊME COQUILLE, DANS L'AUTRE SENS, et c'est Georges qui l'a signalée.
   *
   * Le bulletin de mai 2024 imprime « 03/05/2025 » pour FCP ELITE CAPITAL
   * RECORD et FCP CCA PERFORMANCE : l'année a été tapée une de trop. La date
   * corrigée, le 3 mai 2024, est un VENDREDI, et ces deux fonds sont valorisés
   * chaque vendredi. Leur série porte 04-12, 04-19, puis un trou de deux
   * vendredis, puis 05-10 : la date réparée tombe exactement dedans, et les
   * valeurs voisines l'encadrent. La cadence du fonds confirme donc la
   * correction, indépendamment de la règle.
   *
   * ON NE SE SERT PAS DE CETTE CADENCE COMME GARDE, et c'est délibéré :
   * elle demanderait de charger la série du fonds au moment de l'ingestion,
   * pour un gain de deux points. La fenêtre serrée sépare déjà le vrai du
   * faux sans aucune donnée extérieure.
   */
  if (faute.includes("future")) {
    const precedente = anneePrecedente(n.navDate);
    const recule = precedente ? -jours(precedente, sessionDate) : Infinity;
    if (precedente && recule <= RETARD_COQUILLE && fautes(precedente, n.nav, n.inceptionDate, sessionDate).length === 0) {
      return { garde: { ...n, navDate: precedente }, coquille: n.navDate };
    }
  }
  return { motif: faute[0] };
}
