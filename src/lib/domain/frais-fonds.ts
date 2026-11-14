import { enVigueur, fraisDuClient } from "@/lib/domain/frais";
import { getFraisClient } from "@/lib/frais-registre";

/**
 * LES FRAIS D'UN FONDS, TOTAUX ET SANS DÉCOMPOSITION (14 novembre 2026, règle de la maison).
 *
 * Le client ne voit JAMAIS la destination d'un frais ni sa décomposition : pour toute transaction il lit une seule ligne, les frais
 * totaux à payer. Sur un fonds, ils sont la somme de deux choses que le client ne distingue pas : les droits que porte le fonds (entrée
 * ou sortie) et la règle « fonds » du barème de la maison. Ce module est le seul endroit qui les additionne : l'estimation du
 * formulaire, le récapitulatif de l'ordre, les avis, la fiche et la carte passent tous par ici, sinon l'un dirait un total et l'autre un autre.
 *
 * Sans règle en vigueur, le résultat est exactement celui d'avant (les droits du fonds seuls), au même arrondi.
 */
const aujourdHui = (): string => new Date().toISOString().slice(0, 10);

/** Ce que la maison ajoute sur un montant de fonds, en francs, plancher et plafond compris ; zéro hors règle en vigueur. */
export const fraisAjoutes = (operation: "souscription" | "rachat", base: number, jour: string = aujourdHui()): number =>
  fraisDuClient(getFraisClient()[operation === "souscription" ? "fonds.souscription" : "fonds.rachat"], base, jour);

/**
 * Pour un montant versé : ce qui est investi, et les frais totaux.
 * Le montant est ferme et les frais s'y prennent : net + droits du fonds + frais ajoutés = montant. Le plancher et le plafond rendent
 * l'inversion non linéaire, on la résout par itération (les frais sont moins du montant, la suite converge en quelques tours).
 */
export function souscriptionNette(f: { entryFeePct: number }, montant: number, jour: string = aujourdHui()): { net: number; frais: number } {
  let net = montant / (1 + f.entryFeePct / 100);
  for (let i = 0; i < 6; i++) {
    const ajoutes = fraisAjoutes("souscription", net, jour);
    if (ajoutes === 0) break;
    net = (montant - ajoutes) / (1 + f.entryFeePct / 100);
  }
  return { net, frais: montant - net };
}

/** Pour un rachat : le produit net et les frais totaux sur le montant brut. */
export function rachatNet(f: { exitFeePct: number }, brut: number, jour: string = aujourdHui()): { produit: number; frais: number } {
  const frais = brut * (f.exitFeePct / 100) + fraisAjoutes("rachat", brut, jour);
  return { produit: brut - frais, frais };
}

/** Le taux total affiché sur une carte ou une fiche : les droits du fonds plus le taux de la règle en vigueur. Les bornes ne se lisent que sur un montant. */
export function pctTotal(f: { entryFeePct: number; exitFeePct: number }, operation: "souscription" | "rachat", jour: string = aujourdHui()): number {
  const regle = getFraisClient()[operation === "souscription" ? "fonds.souscription" : "fonds.rachat"];
  const base = operation === "souscription" ? f.entryFeePct : f.exitFeePct;
  return enVigueur(regle, jour) ? base + regle.clientPct : base;
}
