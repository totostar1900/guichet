import { cashPosition, type CashEntry, type CashPayout, type CashPolicy } from "./cash";
import type { Intent } from "./types";

/**
 * Ce qu'un client peut réclamer, et ce que le desk peut lui verser.
 *
 * Le calcul tient en une ligne, et c'est pour cela qu'il mérite d'être ici plutôt
 * que dans une action : il est lu à trois endroits, l'écran du client, la file du
 * desk et le paiement, et trois copies de la même règle finiraient par diverger
 * sur un arrondi ou sur un état d'intention.
 *
 * LA RÈGLE : le client peut réclamer son solde INOCCUPÉ, c'est-à-dire tout ce
 * que la maison lui doit et qu'aucune opération vivante n'attend. L'argent
 * affecté à un ordre en cours n'est pas réclamable tant que l'ordre vit, sans
 * quoi le règlement de cet ordre resterait sans provision.
 *
 * LE MONTANT SE RECALCULE AU PAIEMENT. Entre la demande et le virement, un
 * coupon peut tomber, un ordre peut se régler, et le disponible n'est plus
 * celui que le client a vu. Payer le montant demandé viderait un solde qui ne
 * l'est plus, ou laisserait derrière de l'argent qui aurait dû partir. La
 * demande garde donc ce qu'elle a vu, et le paiement regarde à nouveau.
 */

/** Ce que le client peut réclamer aujourd'hui. */
export function reclamable(entries: CashEntry[], intents: Intent[], now = new Date()): number {
  return Math.round(cashPosition(entries, intents, now).idle);
}

/** La demande encore ouverte d'un client, s'il en a une. */
export const demandeOuverte = (payouts: CashPayout[]): CashPayout | undefined => payouts.find((p) => p.state === "demandee");

export type RefusDeDemande = "rien" | "deja" | "ferme";

/**
 * Pourquoi ce client ne peut pas demander, ou rien.
 *
 * Trois raisons, et chacune se dit autrement à l'écran : il n'y a rien à
 * réclamer, une demande court déjà, ou la maison a refermé la politique et
 * renvoie alors les soldes d'elle-même.
 */
export function pourquoiPasDeDemande(montant: number, payouts: CashPayout[], policy: CashPolicy): RefusDeDemande | null {
  if (!policy.holdIdle) return "ferme";
  if (montant <= 0) return "rien";
  if (demandeOuverte(payouts)) return "deja";
  return null;
}

/**
 * L'écart entre ce qui a été demandé et ce qui est payé, quand il y en a.
 *
 * Il n'est pas une erreur : le solde a bougé, et c'est normal. Mais il doit se
 * voir, parce qu'un client qui a demandé 272 500 et reçu 180 000 se demandera
 * pourquoi, et l'avis doit répondre avant qu'il ait à poser la question.
 */
export const ecartDeDemande = (p: Pick<CashPayout, "askedAmount" | "paidAmount">): number =>
  p.paidAmount == null ? 0 : Math.round(p.paidAmount) - Math.round(p.askedAmount);
