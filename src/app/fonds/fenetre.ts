"use client";

import { createContext, useContext } from "react";
import { FENETRE_PAR_DEFAUT, type FenetreId } from "@/lib/domain/fund-perf";
import { fmtDate } from "@/lib/format";
import { useT } from "@/i18n/client";
import type { FundCurve } from "@/lib/domain/fund-curve";

/**
 * LA FENÊTRE CHOISIE, LUE PAR LES RANGÉES SANS LEUR ÊTRE PASSÉE.
 *
 * Le tableau, la liste et les cartes affichent tous la même mesure, et chacun
 * la rend par un composant séparé. La faire descendre en paramètre voudrait
 * dire la poser dans six signatures, puis se souvenir de les changer
 * ensemble.
 *
 * ELLE VIT DANS SON PROPRE FICHIER, et non dans la liste qui la fournit : la
 * carte importe déjà son type de la liste, et la liste importe la carte. Un
 * type s'efface à la compilation, un contexte non : l'importer de là aurait
 * fait un vrai cycle à l'exécution.
 */
export const FenetreCtx = createContext<FenetreId>(FENETRE_PAR_DEFAUT);
export const useFenetre = (): FenetreId => useContext(FenetreCtx);

/**
 * LES QUATRE NOMS, ÉCRITS EN TOUTES LETTRES, ET C'EST POURQUOI ILS SONT ICI.
 *
 * « FENETRES » porte déjà un nom par fenêtre, et l'évidence était d'écrire
 * « t(f.nom) ». Le scanner de clefs ne voit que ce qui est littéral dans la
 * source : passé en variable, aucun des quatre n'aurait eu de clef, et la
 * colonne serait restée en français sur toute la version anglaise. C'est le
 * premier des trois angles morts connus, et il a encore mordu aujourd'hui.
 *
 * Les quatre appels vivent donc ici, au même endroit, et les trois vues les
 * lisent de là.
 */
export function useNomFenetre(): Record<FenetreId, string> {
  const t = useT();
  return { m3: t("3 mois"), m6: t("6 mois"), a1: t("1 an"), a3: t("3 ans") };
}

/** Ce qu'il faut d'une ligne pour lire sa fenêtre : rien de plus que sa courbe. */
interface AvecCourbe {
  navDate: string;
  curve?: FundCurve;
}

/** La performance d'un fonds sur une fenêtre, ou rien quand elle n'est pas mesurable. */
export const valeurFenetre = (r: AvecCourbe, f: FenetreId): number | undefined => r.curve?.fenetres?.[f]?.pct;

/**
 * De quelle VL la mesure part, et jusqu'à laquelle.
 *
 * C'est ce qui explique un chiffre surprenant : une borne prise trois
 * semaines avant la date visée, parce que le fonds ne publiait pas cette
 * semaine-là, déplace le résultat sans que rien ne le dise.
 */
export function depuisQuand(r: AvecCourbe, f: FenetreId): string | undefined {
  const d = r.curve?.fenetres?.[f]?.depuis;
  return d ? `${fmtDate(d)} → ${fmtDate(r.navDate)}` : undefined;
}
