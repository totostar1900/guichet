import { coverageOf, headline, thin, type AuctionResult } from "./auction-results";

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

export type SortKey = "date" | "pays" | "instrument" | "duree" | "chiffre" | "couverture" | "soumis" | "servi" | "etat";

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

/** Une ligne, telle que la table l'affiche et telle que le CSV l'exporte. */
export interface TableRow {
  r: AuctionResult;
  chiffre: number | null;
  unite: "taux" | "prix" | null;
  couverture: number | null;
  mince: boolean;
}

export const toRow = (r: AuctionResult): TableRow => {
  const h = headline(r);
  return { r, chiffre: h?.value ?? null, unite: h?.unit ?? null, couverture: coverageOf(r) ?? null, mince: thin(r) };
};

const has = (v: string | undefined) => Boolean(v && v !== "tout");

export function applyFilter(rows: AuctionResult[], f: TableFilter): AuctionResult[] {
  return rows.filter(
    (r) =>
      (!has(f.pays) || r.country === f.pays) &&
      (!has(f.instrument) || r.instrument === f.instrument) &&
      (!has(f.duree) || r.tenor === f.duree) &&
      (f.etat !== "relues" || Boolean(r.confirmedBy)) &&
      (f.etat !== "a-relire" || !r.confirmedBy) &&
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
      case "chiffre":
        return x.chiffre;
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
