import { BAREME_DE_FRAIS_FERME, type BaremeDeFrais } from "@/lib/domain/frais";

/**
 * LE BARÈME DES FRAIS, LU DE FAÇON SYNCHRONE PAR LE CALCUL D'UN ORDRE.
 *
 * Même principe que le registre : le serveur le lit de la table de référence avec `loadRegistry()` et l'installe ; le calcul
 * (`positionFor`) le lit sans attendre. Fermé tant que personne ne l'a posé : un calcul qui tourne sans l'avoir chargé ne prend rien,
 * il n'invente rien. Il ne porte JAMAIS ce que la maison reçoit de tiers (voir `baremePourLeClient`).
 */
let FRAIS: BaremeDeFrais = BAREME_DE_FRAIS_FERME;

export const getFraisClient = (): BaremeDeFrais => FRAIS;
export function setFraisClient(b: BaremeDeFrais): void {
  FRAIS = b;
}
