import type { Offer } from "./types";
import { lieuDe } from "./sections";

/**
 * UNE ALERTE N'EXISTE QUE SI IL Y A QUELQUE CHOSE À ANNONCER (7 novembre 2026, demande du client).
 *
 * « L'alerte est sur les événements de la ligne, et sur les dates pour tout ce qui a des délais. Sans événement ou sans compte à rebours, pas d'alerte. »
 *
 *  · une séance (adjudication, rachat) a des DATES : tant qu'elle n'est pas close, il y a une clôture à compter, et l'alerte rappelle chaque jour ; une
 *    séance close n'a plus de compte à rebours, donc plus d'alerte à armer ;
 *  · un fonds a ses ÉVÉNEMENTS : chaque nouvelle valeur liquidative ;
 *  · une ligne cotée a les siens : chaque échange. Une ligne qui n'a jamais traité (pas de dernier cours) n'a rien à annoncer.
 *
 * Une alerte DÉJÀ armée sur une ligne qui n'en a plus reste visible, pour qu'on puisse la retirer : ce n'est pas ici qu'on la supprime.
 */
export function alerteOuverte(o: Offer, past: boolean): boolean {
  switch (lieuDe(o)) {
    case "adjudications":
      return !past;
    case "fonds":
      return Boolean(o.fund);
    default:
      return o.lastPrice != null;
  }
}
