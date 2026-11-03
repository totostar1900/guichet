import type { Country, LigneSondee } from "@/lib/domain/types";
import { compteDansLesResultats, coverageOf, fourchette, type AuctionResult } from "@/lib/market/auction-results";
import { anneesDeLEtiquette, estLigneNeuve, panierDe } from "@/lib/market/niveau-marche";
import { auctionYield, vieRestante } from "@/lib/market/yield";

/**
 * CE QUE LA PLACE A SERVI, À CÔTÉ DE CE QUE LE CLIENT A DIT (3 novembre 2026).
 *
 * Demandé : « une page dédiée plus fournie, avec un comparatif des adjudications similaires
 * passées ». Les séances viennent de la table des résultats, relues par le desk.
 *
 * LES SÉANCES SIMILAIRES, ET ELLES SONT CHOISIES COMME LE REPÈRE DU FORMULAIRE : même instrument,
 * même panier de vie restante (`panierDe`), jamais un abondement (`estLigneNeuve`), jamais une
 * séance écartée ni non relue. Une seule logique d'appariement dans la maison : deux logiques
 * finiraient par donner deux « séances comparables » à la même ligne. Aucune fenêtre de temps ici,
 * à la différence du niveau du marché : le client veut voir la tendance, pas seulement la
 * dernière année.
 *
 * LE NIVEAU EST DANS L'UNITÉ OÙ LE CLIENT TAPE : un prix en % du nominal sur une OTA, un taux
 * précompté sur un bon. Le rendement, lui, vient de `auctionYield` (finance) — jamais recalculé ici.
 *
 * ET ON COMPTE, ON NE PRÉDIT PAS. `servies` dit sur combien de séances le niveau moyen servi
 * était à la limite du client ou mieux. Une phrase qui dirait « vous seriez servi » serait un
 * conseil ; un compte du passé est un fait, à lire avec sa mention. Moins de deux séances ne
 * fondent aucun compte : `servies` est alors absent, et l'écran n'écrit pas de phrase.
 */
export interface SeanceComparee {
  id: string;
  le: string;
  pays: Country;
  /** Prix moyen servi (OTA) ou taux moyen servi (bon) ; absent quand le communiqué ne l'imprime pas. */
  niveau?: number;
  bas?: number;
  haut?: number;
  /** Rendement moyen, en %, calculé par `auctionYield`. */
  rendement?: number;
  /** Couverture, en % de l'annoncé. */
  couverture?: number;
  soumissionnaires?: number;
}

export interface Comparatif {
  unite: "prix" | "taux";
  /** La limite du client dans cette unité : prix sur une OTA, taux min sur un bon. */
  limite?: number;
  /** Les séances du pays de la ligne, la plus récente d'abord. */
  duPays: SeanceComparee[];
  /** Les autres pays, même instrument et même durée : en repli, étiquetés. */
  ailleurs: SeanceComparee[];
  /** Séances du pays dont le niveau moyen servi respecte la limite, sur celles qui ont un niveau. */
  servies?: { n: number; sur: number };
}

export const NB_SEANCES = 5;

const comparee = (r: AuctionResult): SeanceComparee => {
  const f = fourchette(r);
  const niveau = r.instrument === "BTA" ? (r.rateAvg ?? r.rateLimit) : (r.priceAvg ?? r.priceLimit);
  return {
    id: r.id,
    le: r.sessionOn,
    pays: r.country,
    niveau,
    bas: f?.lo,
    haut: f?.hi,
    rendement: auctionYield(r)?.pct,
    couverture: coverageOf(r),
    soumissionnaires: r.bidders,
  };
};

export function comparatifDeLigne(l: Pick<LigneSondee, "instrument" | "country" | "tenor" | "rate" | "pricePct">, historique: AuctionResult[], aujourdHui: string): Comparatif | undefined {
  const annees = anneesDeLEtiquette(l.tenor);
  const panier = annees == null ? undefined : panierDe(annees);
  if (!panier) return undefined;

  const retenues = historique
    .filter((r) => r.instrument === l.instrument && compteDansLesResultats(r) && !!r.confirmedBy && r.sessionOn <= aujourdHui && estLigneNeuve(r))
    .filter((r) => {
      const v = vieRestante(r);
      return v != null && panierDe(v.years) === panier;
    })
    .sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));

  const duPays = retenues.filter((r) => r.country === l.country).slice(0, NB_SEANCES).map(comparee);
  const ailleurs = retenues.filter((r) => r.country !== l.country).slice(0, NB_SEANCES).map(comparee);
  if (!duPays.length && !ailleurs.length) return undefined;

  const unite = l.instrument === "BTA" ? "taux" : "prix";
  const limite = unite === "taux" ? l.rate : l.pricePct;
  const avecNiveau = duPays.filter((s) => s.niveau != null);
  const servies =
    limite != null && avecNiveau.length >= 2
      ? { n: avecNiveau.filter((s) => (unite === "prix" ? s.niveau! <= limite : s.niveau! >= limite)).length, sur: avecNiveau.length }
      : undefined;
  return { unite, limite, duPays, ailleurs, servies };
}
