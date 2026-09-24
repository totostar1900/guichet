import { l, type L } from "./types";

/**
 * La chaîne documentaire d'un ordre : une seule source, deux vues.
 *
 * Elle était écrite deux fois, et les deux copies avaient déjà divergé. Le
 * tableau du desk portait sept étapes avec leur destinataire et leur
 * déclencheur ; le schéma de la documentation en dessinait six, sans
 * l'annonce ni l'avis d'opéré, et sous d'autres libellés. Deux vérités sur le
 * même mécanisme, à deux endroits, dont personne ne savait laquelle valait.
 *
 * Ce qui suit est la seule. Le schéma en dessine les étapes et leur moment ;
 * le tableau ajoute le destinataire et le déclencheur. Chacun montre ce qu'il
 * montre, mais tous deux lisent la même liste, et une étape corrigée ici se
 * corrige partout.
 */
export interface ChainStep {
  /** Le moment de la relation : ce que le tableau met en première colonne. */
  step: L;
  /** Le document produit à ce moment. */
  doc: L;
  /** Qui le reçoit. */
  to: L;
  /** Ce qui le déclenche : le schéma s'en sert comme légende sous la boîte. */
  trigger: L;
}

export const DOCUMENT_CHAIN: ChainStep[] = [
  {
    step: l("Annonce", "Announcement"),
    doc: l("Message d'offre, teaser, note", "Offer message, teaser, note"),
    to: l("Clients du segment", "Clients of the segment"),
    trigger: l("Publication par le desk", "Published by the desk"),
  },
  {
    step: l("Intention", "Intention"),
    doc: l("Accusé de réception", "Acknowledgement"),
    to: l("Le client", "The client"),
    trigger: l("À l'enregistrement", "At registration"),
  },
  {
    step: l("Prise ferme", "Firm order"),
    doc: l("Bulletin d'ordre · appel de fonds", "Order form · call for funds"),
    to: l("Le client", "The client"),
    trigger: l("À la confirmation", "At confirmation"),
  },
  {
    step: l("Soumission", "Submission"),
    doc: l("Bordereau groupé · annexe par client", "Grouped slip · annex per client"),
    to: l("SVT", "Primary dealer"),
    trigger: l("À la clôture du carnet", "At the book's close"),
  },
  {
    step: l("Résultats", "Results"),
    doc: l("Avis de résultat · de non-allocation", "Result notice · non-allotment"),
    to: l("Chaque client", "Each client"),
    trigger: l("Aux résultats", "At the results"),
  },
  {
    step: l("Règlement", "Settlement"),
    doc: l("Avis d'opéré", "Contract note"),
    to: l("Le client", "The client"),
    trigger: l("Au règlement-livraison", "At settlement-delivery"),
  },
  {
    step: l("Vie du titre", "Life of the security"),
    doc: l("Avis de coupon · relevé", "Coupon notice · statement"),
    to: l("Porteurs", "Holders"),
    trigger: l("Programmé : étape suivante", "Scheduled: next step"),
  },
];
