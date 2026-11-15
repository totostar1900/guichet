import { BAREME_DE_FRAIS_FERME, baremeALaDate, type BaremeDeFrais, type HistoriqueDeFrais } from "@/lib/domain/frais";

/**
 * LE BARÈME DES FRAIS, LU DE FAÇON SYNCHRONE PAR LE CALCUL D'UN ORDRE.
 *
 * Même principe que le registre : le serveur le lit de la table de référence avec `loadRegistry()` et l'installe ; le calcul
 * (`positionFor`) le lit sans attendre. Fermé tant que personne ne l'a posé : un calcul qui tourne sans l'avoir chargé ne prend rien,
 * il n'invente rien. Il ne porte JAMAIS ce que la maison reçoit de tiers (voir `baremePourLeClient`).
 */
let FRAIS: BaremeDeFrais = BAREME_DE_FRAIS_FERME;
let HISTORIQUE: HistoriqueDeFrais = [];

export const getFraisClient = (): BaremeDeFrais => FRAIS;
export const getFraisHistorique = (): HistoriqueDeFrais => HISTORIQUE;
export function setFraisClient(b: BaremeDeFrais, historique: HistoriqueDeFrais = []): void {
  FRAIS = b;
  HISTORIQUE = historique;
}

/** Le barème tel qu'il était le jour d'un ordre : un ordre se calcule avec la règle de sa date, jamais avec celle d'aujourd'hui. */
export const fraisClientAu = (jour: string): BaremeDeFrais => baremeALaDate(FRAIS, HISTORIQUE, jour);
