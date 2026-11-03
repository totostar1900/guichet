import type { Country, LigneSondee } from "@/lib/domain/types";
import { compteDansLesResultats, coverageOf, fourchette, type AuctionResult } from "@/lib/market/auction-results";
import { PAYS_CEMAC } from "@/lib/market/budget";
import { anneesDeLEtiquette, estLigneNeuve, PANIERS, panierDe, type Panier } from "@/lib/market/niveau-marche";
import { auctionYield, vieRestante } from "@/lib/market/yield";

/**
 * CE QUE LA PLACE A SERVI, À CÔTÉ DE CE QUE LE CLIENT A DIT (3 novembre 2026).
 *
 * Demandé : « une page dédiée plus fournie, avec un comparatif des adjudications similaires
 * passées ». Les séances viennent de la table des résultats, relues par le desk.
 *
 * LES SÉANCES SIMILAIRES, ET ELLES SONT CHOISIES COMME LE REPÈRE DU FORMULAIRE : même instrument,
 * jamais un abondement (`estLigneNeuve`), jamais une séance écartée ni non relue. Une seule logique
 * d'appariement dans la maison : deux logiques finiraient par donner deux « séances comparables »
 * à la même ligne. Aucune fenêtre de temps ici, à la différence du niveau du marché : le client veut
 * voir la tendance, pas seulement la dernière année.
 *
 * LE CLIENT CHOISIT LE PAYS ET LA DURÉE (« un seul pays à la fois, durée exacte et/ou panier »).
 * Par défaut, ceux de sa ligne. La durée est EXACTE (« 5 ans » ne se mêle pas à « 4 ans » : c'est ce
 * qui montrait deux lignes du même jour sans rien pour les distinguer) ou un PANIER de vie restante,
 * les mêmes que ceux du niveau du marché (`PANIERS`).
 *
 * LE NIVEAU EST DANS L'UNITÉ OÙ LE CLIENT TAPE : un prix en % du nominal sur une OTA, un taux
 * précompté sur un bon. Le rendement, lui, vient de `auctionYield` (finance) — jamais recalculé ici.
 *
 * ET ON COMPTE, ON NE PRÉDIT PAS. `servies` dit sur combien de séances le niveau moyen servi
 * respectait la limite du client. Une phrase qui dirait « vous seriez servi » serait un conseil ; un
 * compte du passé est un fait, à lire avec sa mention. Moins de deux séances ne fondent aucun
 * compte : `servies` est alors absent, et l'écran n'écrit pas de phrase.
 */
export interface SeanceComparee {
  id: string;
  le: string;
  pays: Country;
  /** La durée telle que le communiqué la nomme : dit sur la ligne, pour ne jamais confondre deux émissions du même jour. */
  tenor: string;
  /** Prix moyen servi (OTA) ou taux moyen servi (bon) ; absent quand le communiqué ne l'imprime pas. */
  niveau?: number;
  bas?: number;
  haut?: number;
  /** Le coupon de la ligne adjugée (OTA) : fixé par le Trésor à l'émission. */
  coupon?: number;
  /** Rendement moyen, en %, calculé par `auctionYield`. */
  rendement?: number;
  /** Couverture, en % de l'annoncé. */
  couverture?: number;
  soumissionnaires?: number;
}

/** Une durée exacte (« 5 ans ») ou un panier de vie restante (« 4-5 ans »). */
export type ChoixDeDuree = { type: "exacte"; annees: number; libelle: string } | { type: "panier"; nom: Panier };

export interface ChoixDeComparaison {
  pays: Country;
  duree: ChoixDeDuree;
}

export interface OptionsDeComparaison {
  /** Les pays qui ont au moins une séance de cet instrument, et combien. */
  pays: { pays: Country; n: number }[];
  /** Les durées exactes vues sur cet instrument ; `n` compte celles du pays choisi (0 : elle est grisée, jamais cachée). */
  exactes: { annees: number; libelle: string; n: number }[];
  paniers: { nom: Panier; n: number }[];
}

export interface Comparatif {
  unite: "prix" | "taux";
  /** La limite du client dans cette unité : prix sur une OTA, taux minimum sur un bon. */
  limite?: number;
  /** Le coupon minimum du client (OTA). */
  limiteCoupon?: number;
  choix: ChoixDeComparaison;
  /** Ce que la ligne du client donne d'office : sert à « revenir à ma ligne ». */
  parDefaut: ChoixDeComparaison;
  options: OptionsDeComparaison;
  /** Les dernières séances du choix, la plus récente d'abord. */
  seances: SeanceComparee[];
  /** Combien de séances le choix trouve en tout (au plus `NB_SEANCES` sont montrées). */
  trouvees: number;
  /** Séances dont le niveau moyen servi respecte la limite, sur celles qui ont un niveau. */
  servies?: { n: number; sur: number };
}

export const NB_SEANCES = 5;

/** La clef de la durée dans l'adresse : « 5 ans » ou « panier:4-5 ans ». */
export const cleDeDuree = (d: ChoixDeDuree): string => (d.type === "panier" ? `panier:${d.nom}` : d.libelle);

const memeDuree = (a: number | undefined, b: number): boolean => a != null && Math.abs(a - b) < 1e-6;

const comparee = (r: AuctionResult): SeanceComparee => {
  const f = fourchette(r);
  const niveau = r.instrument === "BTA" ? (r.rateAvg ?? r.rateLimit) : (r.priceAvg ?? r.priceLimit);
  return {
    id: r.id,
    le: r.sessionOn,
    pays: r.country,
    tenor: r.tenor,
    niveau,
    bas: f?.lo,
    haut: f?.hi,
    coupon: r.instrument === "OTA" ? r.couponRate : undefined,
    rendement: auctionYield(r)?.pct,
    couverture: coverageOf(r),
    soumissionnaires: r.bidders,
  };
};

/**
 * CE QUE L'ADRESSE DIT, LUE AVEC MÉFIANCE : un pays inconnu ou une durée qui n'existe pas retombent
 * sur ceux de la ligne, jamais sur un écran vide ni sur une erreur.
 */
export function choixDeLAdresse(l: Pick<LigneSondee, "country" | "tenor">, pays?: string, duree?: string): ChoixDeComparaison {
  const parDefaut = choixParDefaut(l);
  const p = PAYS_CEMAC.find((x) => x === pays) ?? parDefaut.pays;
  if (duree?.startsWith("panier:")) {
    const nom = PANIERS.find((x) => x.nom === duree.slice(7))?.nom;
    return { pays: p, duree: nom ? { type: "panier", nom } : parDefaut.duree };
  }
  const annees = duree ? anneesDeLEtiquette(duree) : undefined;
  return { pays: p, duree: annees != null && annees > 0 ? { type: "exacte", annees, libelle: duree! } : parDefaut.duree };
}

export function choixParDefaut(l: Pick<LigneSondee, "country" | "tenor">): ChoixDeComparaison {
  return { pays: l.country, duree: { type: "exacte", annees: anneesDeLEtiquette(l.tenor) ?? 0, libelle: l.tenor } };
}

export function comparatifDeLigne(l: Pick<LigneSondee, "instrument" | "country" | "tenor" | "rate" | "pricePct">, historique: AuctionResult[], aujourdHui: string, choisi?: ChoixDeComparaison): Comparatif | undefined {
  const parDefaut = choixParDefaut(l);
  const choix = choisi ?? parDefaut;

  const retenues = historique
    .filter((r) => r.instrument === l.instrument && compteDansLesResultats(r) && !!r.confirmedBy && r.sessionOn <= aujourdHui && estLigneNeuve(r))
    .sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));
  if (!retenues.length) return undefined;

  const dupays = retenues.filter((r) => r.country === choix.pays);
  const paniersDe = (r: AuctionResult) => {
    const v = vieRestante(r);
    return v ? panierDe(v.years) : undefined;
  };

  const exactes = new Map<number, { libelle: string; n: number }>();
  for (const r of retenues) {
    const a = anneesDeLEtiquette(r.tenor);
    if (a == null) continue;
    const vu = exactes.get(a) ?? { libelle: r.tenor, n: 0 };
    exactes.set(a, vu);
  }
  if (parDefaut.duree.type === "exacte" && parDefaut.duree.annees > 0 && !exactes.has(parDefaut.duree.annees)) exactes.set(parDefaut.duree.annees, { libelle: parDefaut.duree.libelle, n: 0 });
  for (const r of dupays) {
    const a = anneesDeLEtiquette(r.tenor);
    if (a != null) exactes.get(a)!.n += 1;
  }

  const options: OptionsDeComparaison = {
    pays: PAYS_CEMAC.map((p) => ({ pays: p, n: retenues.filter((r) => r.country === p).length })).filter((x) => x.n > 0 || x.pays === l.country),
    exactes: [...exactes.entries()].sort((a, b) => a[0] - b[0]).map(([annees, v]) => ({ annees, libelle: v.libelle, n: v.n })),
    paniers: PANIERS.map((p) => ({ nom: p.nom, n: dupays.filter((r) => paniersDe(r) === p.nom).length })).filter((p) => p.n > 0 || (choix.duree.type === "panier" && choix.duree.nom === p.nom)),
  };

  const duChoix = dupays.filter((r) => (choix.duree.type === "panier" ? paniersDe(r) === choix.duree.nom : memeDuree(anneesDeLEtiquette(r.tenor), choix.duree.annees)));
  const seances = duChoix.slice(0, NB_SEANCES).map(comparee);

  const unite = l.instrument === "BTA" ? "taux" : "prix";
  const limite = unite === "taux" ? l.rate : l.pricePct;
  const avecNiveau = seances.filter((s) => s.niveau != null);
  const servies =
    limite != null && avecNiveau.length >= 2
      ? { n: avecNiveau.filter((s) => (unite === "prix" ? s.niveau! <= limite : s.niveau! >= limite)).length, sur: avecNiveau.length }
      : undefined;
  return { unite, limite, limiteCoupon: l.instrument === "OTA" ? l.rate : undefined, choix, parDefaut, options, seances, trouvees: duChoix.length, servies };
}
