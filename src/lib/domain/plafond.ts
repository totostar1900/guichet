import { positionFor } from "@/lib/documents/position";
import type { Intent, IntentType, Offer } from "./types";

/**
 * « AU PLUS CECI », ET LE RESTE SUIT.
 *
 * Une part d'OPCVM se signe pour un montant : on verse 100 000 francs, et
 * c'est le nombre de parts qui se découvre à la valeur liquidative. L'ordre
 * est donc signable tel quel, et il l'est depuis le 8 octobre 2026.
 *
 * Un titre marche à l'envers. Le client veut un nominal, et c'est la DÉPENSE
 * qui se découvre, au prix servi par l'adjudication ou par le marché. On ne
 * peut pas demander une signature sur un montant inconnu, et c'est pour cela
 * que les titres attendaient encore un aller-retour avec le desk : il fallait
 * bien que quelqu'un dise le chiffre.
 *
 * Le chiffre existe pourtant, et il est connu d'avance : c'est ce que l'ordre
 * coûterait AU PRIX LE PLUS CHER QUE LE CLIENT AIT ACCEPTÉ. Au-dessus, il
 * n'était pas preneur ; en dessous, il paie moins. Signer cette borne engage
 * exactement ce qu'il voulait engager, sans rien deviner.
 *
 * LE PLAFOND SE FIGE À LA DÉCLARATION. Recalculé au moment de signer, il
 * suivrait les conditions du jour : un prix annoncé qui bouge, une commission
 * qui change, et le client signerait autre chose que ce qu'il a lu. La borne
 * est donc écrite une fois, à la création de l'ordre, et elle ne bouge plus.
 */

/** Les ordres dont la dépense dépend du prix servi : ceux-là se signent par une borne. */
export const seSigneAuPlafond = (t: IntentType): boolean => t === "ferme" || t === "achat";

/** Les ordres qui rapportent au lieu de coûter : rien à borner, le produit se découvre. */
export const rapporteAuLieuDeCouter = (t: IntentType): boolean => t === "vente" || t === "cession" || t === "rachat";

/**
 * Le prix le plus cher que le client ait accepté, en pourcentage du nominal.
 *
 * Sa limite s'il en a posé une, sinon le prix annoncé de la ligne, sinon le
 * pair. Un bon précompté n'a pas de prix en pourcentage : son taux fait sa
 * décote, et la position se calcule sans cet argument.
 */
export function prixDuPlafond(intent: Intent, offer: Offer): number | undefined {
  if (offer.kind === "BTA") return undefined;
  return intent.limitPrice ?? offer.pricePct ?? 100;
}

/** Au franc près, ce que l'ordre coûterait au prix du plafond, commission comprise. */
export function coutAuPrixDuPlafond(intent: Intent, offer: Offer): number {
  const p = prixDuPlafond(intent, offer);
  return Math.abs(positionFor(intent, offer, p != null ? { pricePct: p } : {}).total);
}

/**
 * Le plafond proposé au client, arrondi au millier supérieur.
 *
 * L'arrondi n'est pas de la coquetterie : il absorbe les centimes d'un calcul
 * de coupon couru, qui se décalent d'un jour à l'autre, et il donne un chiffre
 * qu'on retient. Il est toujours ARRONDI AU-DESSUS : un plafond trop bas
 * d'un franc ferait échouer un ordre entièrement servi.
 */
export function plafondPropose(intent: Intent, offer: Offer): number {
  return Math.ceil(coutAuPrixDuPlafond(intent, offer) / 1000) * 1000;
}

/** Le plafond qui engage : celui qui a été signé, à défaut celui qu'on proposerait. */
export const plafondEnVigueur = (intent: Intent, offer: Offer): number => intent.maxAmount ?? plafondPropose(intent, offer);

/**
 * Ce service ne peut pas coûter plus que la borne signée.
 *
 * Rendu au desk au moment où il inscrit un prix servi : au-delà, ce n'est pas
 * une erreur d'arrondi, c'est un engagement que le client n'a pas pris.
 */
export function depasseLePlafond(intent: Intent, offer: Offer, prixServi: number | undefined): { depasse: boolean; cout: number; plafond: number } {
  const plafond = plafondEnVigueur(intent, offer);
  const cout = Math.abs(positionFor(intent, offer, prixServi != null ? { pricePct: prixServi } : {}).total);
  // Le franc d'arrondi du calcul de position ne fait pas un dépassement.
  return { depasse: cout > plafond + 1, cout, plafond };
}
