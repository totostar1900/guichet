import type { Offer } from "./types";
import { lieuDe } from "./sections";

/**
 * UNE ALERTE N'EXISTE QUE SI IL Y A QUELQUE CHOSE À ANNONCER (7 novembre 2026, demande du client).
 *
 * « L'alerte est sur les événements de la ligne, et sur les dates pour tout ce qui a des délais. Sans événement ou sans compte à rebours, pas d'alerte. »
 *
 *  · une séance (adjudication, rachat) a des DATES : tant qu'elle n'est pas close, il y a une clôture à compter, et l'alerte rappelle chaque jour ; une
 *    séance close n'a plus de compte à rebours, donc plus d'alerte à armer ;
 *  · un fonds a ses ÉVÉNEMENTS : chaque nouvelle valeur liquidative. Aucune condition (réponse du client, 8 novembre 2026) ;
 *  · une ligne cotée a les siens : chaque échange. Une ligne qui n'a jamais traité (pas de dernier cours) n'a rien à annoncer.
 *
 * PAS DE SEUIL D'ÂGE, ET L'ALERTE EST DÉFINITIVE (8 novembre 2026, réponse du client : « l'alerte est définitive, c'est le client qui la retire »).
 * Une ligne cotée n'a pas d'alerte « tant que son dernier échange a moins de N jours » : l'âge d'un cours ne retire rien (l'âge médian y est de 412 jours,
 * un seuil aurait supprimé l'alerte de presque toutes les lignes). Et rien, côté maison, ne désarme une alerte : une séance qui se clôt, un cours qui vieillit,
 * une ligne retirée du catalogue la laissent armée ; seul le client la retire (« toggleWatch », seul appelant de « removeWatch »). Une alerte DÉJÀ armée reste
 * donc visible partout, pour qu'on puisse la retirer, même quand la règle ci-dessous ne propose plus d'en armer une nouvelle.
 */
export function alerteOuverte(o: Offer, past: boolean): boolean {
  switch (lieuDe(o)) {
    case "adjudications":
      return !past;
    case "fonds":
      return true;
    default:
      return o.lastPrice != null;
  }
}
