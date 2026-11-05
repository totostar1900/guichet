import { fundYtdPct, type FundCurve } from "@/lib/domain/fund-curve";
import type { FenetreId } from "@/lib/domain/fund-perf";
import type { PeriodeCours } from "./periodes";

/**
 * LE COMPARATIF D'UN FONDS : SES PAIRS, CLASSÉS SUR LA MÊME PÉRIODE (11 novembre 2026, planche « Comparatif », option A).
 *
 * UNE SEULE DÉFINITION : la performance de chaque fonds sur une période est celle de la LISTE DES FONDS (`curve.fenetres` : la dernière VL publiée avant la date visée, refusée si
 * trop ancienne ; l'année en cours : `fundYtdPct`). L'onglet et la liste ne se contredisent donc jamais. Les périodes sans fenêtre dans la liste (5 ans, Max) ne se comparent pas :
 * deux fonds d'âges différents n'ont pas la même « Max ». Un fonds sans mesure sur la période n'est pas classé et n'est pas dessiné : jamais de « 0 % » inventé.
 *
 * Ce fichier ne lit rien (il est partagé avec le navigateur) : il reçoit les courbes déjà lues.
 */
export type CleDeComparaison = FenetreId | "debut";

/** Les périodes de la carte qui se comparent entre fonds, et la mesure de la liste qui leur répond. */
export const CLE_DE_PERIODE: Partial<Record<PeriodeCours, CleDeComparaison>> = { "3m": "m3", "6m": "m6", "1a": "a1", debut: "debut", "2a": "a2", "3a": "a3" };

export interface LigneDeComparaison {
  id: string;
  titre: string;
  pcts: Partial<Record<CleDeComparaison, { pct: number; depuis?: string }>>;
}

export interface Comparaison {
  /** La catégorie du fonds, en toutes lettres (« Diversifié »). */
  categorie: string;
  moi: LigneDeComparaison;
  pairs: LigneDeComparaison[];
}

/** Les mesures d'un fonds, prises sur sa courbe (celle de la liste). */
export function ligneDeComparaison(id: string, titre: string, curve?: FundCurve): LigneDeComparaison {
  const pcts: LigneDeComparaison["pcts"] = {};
  for (const [k, v] of Object.entries(curve?.fenetres ?? {})) if (v && Number.isFinite(v.pct)) pcts[k as FenetreId] = { pct: v.pct, depuis: v.depuis };
  const ytd = fundYtdPct(curve);
  if (ytd != null) pcts.debut = { pct: ytd, depuis: curve?.ytdDate };
  return { id, titre, pcts };
}

export interface LigneClassee {
  id: string;
  titre: string;
  pct: number;
  depuis?: string;
  moi: boolean;
  /** 1 pour le meilleur ; deux fonds à égalité partagent leur rang. */
  rang: number;
}

export interface Classement {
  /** Les lignes dessinées : les `max` mieux classées, et le fonds lui-même s'il n'en fait pas partie. */
  lignes: LigneClassee[];
  /** Le rang du fonds, ou rien quand il n'a pas de mesure sur la période. */
  rang?: number;
  /** Les fonds classés (avec une mesure). */
  total: number;
  /** Les fonds sans mesure sur la période (jeunes, ou la borne tombe dans un trou de la série). */
  sans: number;
  /** Le premier de la catégorie quand ce n'est pas le fonds. */
  premier?: LigneClassee;
}

export function classer(moi: LigneDeComparaison, pairs: LigneDeComparaison[], cle: CleDeComparaison, max = 6): Classement {
  const tous = [moi, ...pairs];
  const avec = tous
    .filter((l) => l.pcts[cle])
    .map((l) => ({ id: l.id, titre: l.titre, pct: l.pcts[cle]!.pct, depuis: l.pcts[cle]!.depuis, moi: l.id === moi.id }))
    .sort((a, b) => b.pct - a.pct || a.titre.localeCompare(b.titre, "fr"));
  const classees: LigneClassee[] = avec.map((l) => ({ ...l, rang: 1 + avec.filter((x) => x.pct > l.pct).length }));
  const soi = classees.find((l) => l.moi);
  const tete = classees.slice(0, max);
  const lignes = soi && !tete.includes(soi) ? [...classees.slice(0, max - 1), soi] : tete;
  return { lignes, rang: soi?.rang, total: classees.length, sans: tous.length - classees.length, premier: classees.find((l) => !l.moi && l.rang === 1 && (!soi || soi.rang > 1)) };
}

/** « 1ᵉʳ », « 2ᵉ »… : le rang du fonds, écrit à la française. */
export const rangEcrit = (rang: number): string => (rang === 1 ? "1ᵉʳ" : `${rang}ᵉ`);
