import { coverageOf, etatSeance, fourchette, headline, thin, type AuctionResult } from "./auction-results";
import { auctionYield, prixDuBon, tenorDays, vieRestante, YIELD_ORIGIN_LABEL } from "./yield";

/**
 * La table des séances : ce qu'on y range, ce qu'on y trie, ce qu'on en sort.
 *
 * Une séance à la fois, c'est bon pour relire un communiqué ; ce n'est pas bon
 * pour voir. Un taux mal recopié, 70 % au lieu de 7,00 %, ne se remarque pas
 * dans un formulaire et saute aux yeux dans une colonne triée. La table est
 * d'abord l'instrument de contrôle de la relecture, et seulement ensuite la
 * matière des analyses.
 *
 * Elle regarde la zone entière par défaut. Un Trésor se lit contre les cinq
 * autres : le Cameroun à 26 semaines ne veut rien dire seul, il veut dire
 * quelque chose à côté du Tchad et du Congo au même moment. Les filtres
 * resserrent ensuite sur un pays, un instrument ou une durée.
 */

export type SortKey = "date" | "pays" | "instrument" | "duree" | "chiffre" | "rendement" | "couverture" | "soumis" | "servi" | "etat";

export interface TableFilter {
  pays?: string;
  instrument?: string;
  duree?: string;
  /** « relues », « a-relire », ou rien pour tout. */
  etat?: string;
  /** Bornes de séance, incluses. */
  du?: string;
  au?: string;
}

/**
 * UN INTERVALLE, MÊME QUAND C'EST UN POINT.
 *
 * Trente-sept bons sur cent soixante-huit ne publient qu'une fourchette, et
 * prendre leur milieu inventerait un chiffre que personne n'a servi. La même
 * forme porte donc les deux cas, `lo` valant `hi` quand le Trésor a tranché :
 * l'affichage n'a plus à choisir entre deux chemins, et la fourchette cesse
 * d'être un repli pour devenir une lecture de plein droit.
 */
export interface Bande {
  lo: number;
  hi: number;
  /** Vrai quand le chiffre ne vient pas de la pièce mais d'un calcul déclaré. */
  calcule?: boolean;
}

export const estUnPoint = (b: Bande | null): boolean => !!b && Math.abs(b.hi - b.lo) < 1e-9;

/** Une ligne, telle que la table l'affiche et telle que le CSV l'exporte. */
export interface TableRow {
  r: AuctionResult;
  chiffre: number | null;
  unite: "taux" | "prix" | null;
  /**
   * LE PRIX, EN POUR CENT DU NOMINAL, ET C'EST LA SEULE COLONNE HOMOGÈNE.
   *
   * Imprimé pour une obligation, calculé pour un bon à partir de son escompte.
   * Null quand ni l'un ni l'autre ne se tient.
   */
  prix: Bande | null;
  /** L'escompte servi, que seuls les bons publient. Null pour une obligation. */
  taux: Bande | null;
  /** Ce que la séance publie, dans son unité d'origine. Toujours rendue. */
  plage: { lo: number; hi: number; unit: "taux" | "prix" } | null;
  /**
   * LE RENDEMENT, ET LA VIE SUR LAQUELLE IL EST CALCULE.
   *
   * Les deux vont ensemble ou aucun ne se lit. Mesure du 14 octobre 2026 :
   * 28 obligations sur 76 portent une echeance PLUS PROCHE que leur duree
   * annoncee, l etiquette « 6 ans » nommant la ligne d origine et non ce qui
   * reste a courir. Un 6 % achete a 90,59 a dix-huit mois de l echeance rend
   * quinze pour cent, et le chiffre est juste : c est son contexte qui
   * manquait. Sans la vie restante a cote, il passe pour une aberration et
   * quelqu un finit par le « corriger ».
   */
  rendement: { pct: number; origine: string; vie?: number; vieDe?: string } | null;
  couverture: number | null;
  mince: boolean;
}

/** L'escompte servi d'un bon, point ou fourchette. */
function tauxDeLaLigne(r: AuctionResult): Bande | null {
  if (r.instrument !== "BTA") return null;
  const v = r.rateAvg ?? r.rateLimit;
  if (v != null) return { lo: v, hi: v };
  const f = fourchette(r);
  return f?.unit === "taux" ? { lo: f.lo, hi: f.hi } : null;
}

/**
 * Le prix de la ligne, ramené à la même unité pour les deux instruments.
 *
 * Pour une obligation il est imprimé ; pour un bon il se déduit de l'escompte
 * et porte sa marque, parce qu'un chiffre calculé qui ne se dit pas calculé
 * finit par être cité comme une publication.
 */
function prixDeLaLigne(r: AuctionResult): Bande | null {
  if (r.instrument !== "BTA") {
    const v = r.priceAvg ?? r.priceLimit;
    if (v != null) return { lo: v, hi: v };
    const f = fourchette(r);
    return f?.unit === "prix" ? { lo: f.lo, hi: f.hi } : null;
  }
  const t = tauxDeLaLigne(r);
  const j = tenorDays(r.tenor);
  if (!t || !j) return null;
  /* L'escompte et le prix vont en sens inverse : le taux haut donne le prix
     bas, et oublier l'inversion rendrait une bande à l'envers. */
  const a = prixDuBon(t.hi, j);
  const b = prixDuBon(t.lo, j);
  return a == null || b == null ? null : { lo: a, hi: b, calcule: true };
}

export const toRow = (r: AuctionResult): TableRow => {
  const h = headline(r);
  return {
    r,
    chiffre: h?.value ?? null,
    unite: h?.unit ?? null,
    prix: prixDeLaLigne(r),
    taux: tauxDeLaLigne(r),
    /* LA FOURCHETTE EST UNE COLONNE, PAS UN REPLI, et le commentaire de la
       page le disait déjà alors que le code ne le faisait pas : elle ne
       paraissait qu'à défaut de chiffre servi, c'est-à-dire presque jamais,
       alors que c'est elle qui dit si la séance s'est jouée serré ou large. */
    plage: fourchette(r) ?? null,
    rendement: (() => {
      const y = auctionYield(r);
      if (!y) return null;
      const v = vieRestante(r);
      return { pct: y.pct, origine: YIELD_ORIGIN_LABEL[y.origin], vie: v?.years, vieDe: v?.from };
    })(),
    couverture: coverageOf(r) ?? null,
    mince: thin(r),
  };
};

const has = (v: string | undefined) => Boolean(v && v !== "tout");

export function applyFilter(rows: AuctionResult[], f: TableFilter): AuctionResult[] {
  return rows.filter(
    (r) =>
      (!has(f.pays) || r.country === f.pays) &&
      (!has(f.instrument) || r.instrument === f.instrument) &&
      (!has(f.duree) || r.tenor === f.duree) &&
      (f.etat !== "relues" || etatSeance(r) === "relue") &&
      (f.etat !== "a-relire" || etatSeance(r) === "a_relire") &&
      (f.etat !== "a-lire" || etatSeance(r) === "a_lire") &&
      (!f.du || r.sessionOn >= f.du) &&
      (!f.au || r.sessionOn <= f.au),
  );
}

/**
 * Le tri.
 *
 * Une colonne vide se range toujours en dernier, dans les deux sens. Sans cela,
 * trier par taux croissant remonterait en tête toutes les séances pas encore
 * relues, qui n'ont pas de taux : l'écran ferait mine de répondre à la question
 * posée et montrerait exactement ce qu'on ne cherchait pas.
 */
export function sortRows(rows: TableRow[], key: SortKey, rev: boolean): TableRow[] {
  const txt = (x: TableRow): string | null => {
    switch (key) {
      case "pays":
        return x.r.country;
      case "instrument":
        return x.r.instrument;
      case "duree":
        return x.r.tenor;
      case "etat":
        return x.r.confirmedBy ?? null;
      case "date":
        return x.r.sessionOn;
      default:
        return null;
    }
  };
  const num = (x: TableRow): number | null => {
    switch (key) {
      /**
       * ON TRIE SUR LE PRIX, QUI EST LA SEULE COLONNE COMPARABLE.
       *
       * Trier sur « chiffre » rangeait un escompte de 6,75 à côté d'un prix
       * de 90,00 : les deux familles étant disjointes, le classement
       * n'opposait jamais que des bons entre eux puis des obligations entre
       * elles, séparés par un abîme de quatre-vingt-trois points. Le prix du
       * bon étant maintenant calculé, les deux se rangent sur la même échelle.
       *
       * Sur une fourchette, c'est le BAS qui classe : c'est le prix qu'un
       * acheteur a pu obtenir, et le seul des deux bouts qui soit certain
       * d'avoir existé.
       */
      case "chiffre":
        return x.prix ? x.prix.lo : null;
      /**
       * LE RENDEMENT EST LA COLONNE QUI REPOND A « QUELLE SEANCE A COUTE CHER ».
       *
       * Trier le prix ne le dit pas, et pour un bon il le dit a l envers :
       * l escompte et le prix vont en sens inverse, donc le bon le plus cher
       * pour l Etat est celui dont le prix est le plus BAS. Le rendement,
       * lui, se lit dans le meme sens pour les deux instruments.
       */
      case "rendement":
        return x.rendement?.pct ?? null;
      case "couverture":
        return x.couverture;
      case "soumis":
        return x.r.bidders ?? null;
      case "servi":
        return x.r.served ?? null;
      default:
        return null;
    }
  };
  const vide = (x: TableRow) => (txt(x) ?? num(x)) == null;
  const out = [...rows].sort((a, b) => {
    if (vide(a) !== vide(b)) return vide(a) ? 1 : -1;
    const na = num(a);
    const nb = num(b);
    const d = na != null && nb != null ? na - nb : (txt(a) ?? "").localeCompare(txt(b) ?? "");
    // À égalité, la séance la plus récente d'abord : c'est l'ordre naturel du sujet.
    return d || b.r.sessionOn.localeCompare(a.r.sessionOn);
  });
  if (!rev) return out;
  // L'inversion laisse les vides au fond : ils n'ont pas de place dans l'ordre.
  const pleins = out.filter((x) => !vide(x)).reverse();
  return [...pleins, ...out.filter(vide)];
}

/**
 * Ce que la tranche affichée dit de la zone.
 *
 * Le compte des séances ne suffit pas : trois séances relues sur deux cents ne
 * fondent aucune analyse, et l'écran doit le dire avant qu'on trace une courbe
 * avec. « relues » est donc la mesure qui compte, pas le total.
 */
export interface TableSummary {
  total: number;
  relues: number;
  minces: number;
  pays: number;
  du?: string;
  au?: string;
  /** Moyenne simple des chiffres relus, par unité : deux familles, deux moyennes. */
  moyenneTaux: number | null;
  moyennePrix: number | null;
}

export function summarise(rows: TableRow[]): TableSummary {
  const relues = rows.filter((x) => x.r.confirmedBy);
  const dates = rows.map((x) => x.r.sessionOn).sort();
  const moy = (u: "taux" | "prix") => {
    const v = relues.filter((x) => x.unite === u && x.chiffre != null).map((x) => x.chiffre!);
    return v.length ? v.reduce((s, n) => s + n, 0) / v.length : null;
  };
  return {
    total: rows.length,
    relues: relues.length,
    minces: relues.filter((x) => x.mince).length,
    pays: new Set(rows.map((x) => x.r.country)).size,
    du: dates[0],
    au: dates[dates.length - 1],
    moyenneTaux: moy("taux"),
    moyennePrix: moy("prix"),
  };
}

/** Les valeurs distinctes d'une colonne, pour peupler un filtre sans les inventer. */
export const distinct = (rows: AuctionResult[], f: (r: AuctionResult) => string | undefined): string[] =>
  [...new Set(rows.map(f).filter((v): v is string => Boolean(v && v !== "—")))].sort();
