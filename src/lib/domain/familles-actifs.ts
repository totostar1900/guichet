import type { LinePerformance } from "./performance";
import type { Offer, OfferKind } from "./types";

/**
 * Ce que chaque famille d'actif pèse, et ce qu'elle a rendu.
 *
 * QUATRE FAMILLES ET LES ESPÈCES, pas neuf genres d'instrument. Un épargnant ne
 * raisonne pas en BTA contre OTA contre RACHAT : il veut savoir ce qu'il a en
 * dette d'État, en dette d'entreprise, en actions et en fonds. Le genre sert au
 * desk et au dépositaire ; la famille sert au lecteur.
 *
 * AUCUNE PART N'EST JUGÉE. La page dit ce que chaque famille pèse, jamais ce
 * qu'elle devrait peser. Une répartition conseillée demanderait un agrément que
 * la maison n'a pas, et une barre qui vire au rouge quand une famille dépasse
 * un seuil serait un conseil déguisé en couleur.
 */

export type Famille = "etat" | "entreprise" | "actions" | "fonds" | "especes";

export interface PartFamille {
  famille: Famille;
  /** Ce que la famille vaut aujourd'hui, en francs. */
  valeur: number;
  /** Ce que le client y a versé, pour que le rendu ait un dénominateur. */
  verse: number;
  /** Ce qui en est revenu : coupons, remboursements, produits de vente. */
  recu: number;
  /** La part du total, en pour cent, arrondie au dixième. */
  part: number;
  /** Le rendu, en pour cent du versé, quand le versé n'est pas nul. */
  rendu?: number;
}

/**
 * Le genre d'une ligne, ramené à sa famille.
 *
 * Un bon et une obligation du Trésor sont la même dette pour celui qui la
 * détient : seule la durée les sépare, et la durée a sa propre colonne. Un
 * rachat et un appel public à l'épargne portent une signature d'entreprise,
 * qu'ils passent par une adjudication ou par la cote.
 */
export const familleDuGenre = (k: OfferKind): Exclude<Famille, "especes"> =>
  k === "BTA" || k === "OTA" ? "etat" : k === "ACTIONS" ? "actions" : k === "FONDS" ? "fonds" : "entreprise";

/** Le nom d'une famille, au dictionnaire comme les autres chaînes. */
export const NOM_FAMILLE: Record<Famille, string> = {
  etat: "Obligations d'État",
  entreprise: "Obligations d'entreprise",
  actions: "Actions cotées",
  fonds: "Fonds",
  especes: "Espèces",
};

/** L'ordre d'affichage : du plus structurant au plus liquide, jamais par taille. */
const ORDRE: Famille[] = ["etat", "entreprise", "actions", "fonds", "especes"];

export function famillesDuPortefeuille(lignes: LinePerformance[], offres: Map<string, Offer>, especes: number): PartFamille[] {
  const pot = new Map<Famille, { valeur: number; verse: number; recu: number }>();
  const ajoute = (f: Famille, valeur: number, verse: number, recu: number) => {
    const p = pot.get(f) ?? { valeur: 0, verse: 0, recu: 0 };
    p.valeur += valeur;
    p.verse += verse;
    p.recu += recu;
    pot.set(f, p);
  };

  for (const l of lignes) {
    const o = offres.get(l.offerId);
    // Une ligne dont l'offre a disparu du catalogue n'est pas rangée d'office
    // en dette d'État : elle sort du tableau, et le total le dit.
    if (!o) continue;
    /**
     * UNE LIGNE SANS COURS N'EST JAMAIS COMPTÉE ZÉRO.
     *
     * C'est la règle du rapport de performance, et l'oublier ici a produit
     * exactement ce qu'elle existe pour empêcher : une famille valorisée à
     * zéro face à ce qu'on y avait versé, donc un rendu de moins cent pour
     * cent affiché à un client qui n'a rien perdu. Ces lignes paraissent à
     * part, avec ce qu'on y a mis.
     */
    if (!l.valuable) continue;
    ajoute(familleDuGenre(o.kind), l.valued, l.invested, l.returned);
  }
  if (especes > 0) ajoute("especes", especes, 0, 0);

  const total = [...pot.values()].reduce((s, p) => s + p.valeur, 0);
  return ORDRE.filter((f) => pot.has(f)).map((f) => {
    const p = pot.get(f)!;
    return {
      famille: f,
      valeur: p.valeur,
      verse: p.verse,
      recu: p.recu,
      part: total > 0 ? Math.round((p.valeur / total) * 1000) / 10 : 0,
      // Sans versé il n'y a pas de rendu : les espèces n'en ont pas, et une
      // ligne reçue sans être achetée n'en a pas non plus.
      rendu: p.verse > 0 ? Math.round(((p.valeur + p.recu - p.verse) / p.verse) * 1000) / 10 : undefined,
    };
  });
}
