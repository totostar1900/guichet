/**
 * LA RÉTROCESSION SUR L'ENCOURS ET LE RAPPROCHEMENT DE CE QUI EST REÇU DE TIERS (15 novembre 2026).
 *
 * La maison attend, d'un partenaire ou d'un émetteur, deux sortes de sommes : une part de chaque opération (taux, part des droits ; voir
 * `frais-suivi.ts`) et, sur un fonds, une rétrocession mensuelle sur l'encours : encours moyen du mois × taux annuel ÷ 12, plancher et
 * plafond mensuels compris (`retrocessionDuMois`). Ce module calcule l'encours moyen, et dit si ce qui a été reçu est ce qui était attendu.
 *
 * L'ENCOURS EST CELUI DE NOS CLIENTS, JOUR PAR JOUR : les parts détenues ce jour-là × la dernière VL connue ce jour-là. Les parts d'un jour
 * viennent des ordres réglés, à la date où ils l'ont été ; un jour sans VL connue ne compte pas (on ne l'invente pas).
 *
 * Module sans dépendance : il se lit du serveur comme du navigateur.
 */

/** Un mouvement de parts d'un client dans un fonds : positif pour une souscription réglée, négatif pour un rachat réglé. */
export interface MouvementDeParts {
  /** Le jour où l'ordre a été réglé (AAAA-MM-JJ). */
  jour: string;
  units: number;
}

export interface VlDuJour {
  navDate: string;
  nav: number;
}

/** Le dernier jour d'un mois « AAAA-MM ». */
export function finDuMois(mois: string): string {
  const [a, m] = mois.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

/** Les jours d'un mois « AAAA-MM », du premier au dernier. */
export function joursDuMois(mois: string): string[] {
  const fin = Number(finDuMois(mois).slice(8));
  return Array.from({ length: fin }, (_, i) => `${mois}-${String(i + 1).padStart(2, "0")}`);
}

/** Les parts détenues un jour donné : la somme des mouvements jusqu'à ce jour inclus, jamais négative. */
export function partsAuJour(mouvements: MouvementDeParts[], jour: string): number {
  return Math.max(0, mouvements.filter((m) => m.jour <= jour).reduce((s, m) => s + m.units, 0));
}

/** La dernière VL connue un jour donné ; rien avant la première. `navs` va dans n'importe quel ordre. */
export function vlAuJour(navs: VlDuJour[], jour: string): number | undefined {
  let best: VlDuJour | undefined;
  for (const n of navs) if (n.navDate <= jour && n.nav > 0 && (!best || n.navDate > best.navDate)) best = n;
  return best?.nav;
}

/** L'encours moyen d'un mois, en francs : la moyenne, sur les jours où une VL est connue, des parts détenues × cette VL. Zéro sans aucun jour valorisable. */
export function encoursMoyenDuMois(mouvements: MouvementDeParts[], navs: VlDuJour[], mois: string): number {
  let somme = 0;
  let jours = 0;
  for (const j of joursDuMois(mois)) {
    const vl = vlAuJour(navs, j);
    if (vl == null) continue;
    somme += partsAuJour(mouvements, j) * vl;
    jours++;
  }
  return jours === 0 ? 0 : Math.round(somme / jours);
}

export interface RecuDeTiers {
  /** Ce qui est réellement arrivé, en francs. */
  montant: number;
  /** Le jour où la somme est arrivée (AAAA-MM-JJ). */
  le: string;
}

export type EtatDuRecu = "sans_recu" | "juste" | "ecart";

/** Un franc près : un arrondi ne fait pas un écart. L'écart est signé (reçu moins attendu). */
export function rapprocherLeRecu(attendu: number, recu: RecuDeTiers | undefined): { etat: EtatDuRecu; ecart: number } {
  if (!recu) return { etat: "sans_recu", ecart: 0 };
  const ecart = Math.round(recu.montant - attendu);
  return { etat: Math.abs(ecart) <= 1 ? "juste" : "ecart", ecart };
}

/** Où ranger le reçu d'une source pour un mois, dans la table du desk. */
export const RECU_KIND = "recu_de_tiers";
export const cleDuRecu = (source: string, mois: string): string => `${source}|${mois}`;
