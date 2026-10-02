import type { Famille } from "./familles-actifs";

/**
 * Les couleurs des graphiques, mesurées et non choisies.
 *
 * POURQUOI PAS CELLES DES FAMILLES. L'application a déjà une teinte par famille
 * d'instrument (`--fam-OTA` et les autres), et le réflexe était de les
 * reprendre. Passées au contrôle, elles échouent comme palette de graphique :
 *
 *   bande de clarté      le navy #0b2545 est à 0,264, hors bande
 *   plancher de chroma   navy et teal lisent gris une fois en aplat
 *   vision normale       or #8a6408 ↔ vert #2f7d4f à ΔE 12,6, sous le seuil de 15
 *
 * Ce n'est pas un défaut de ces teintes : elles ont été faites pour être UNE
 * ENCRE SUR UN FOND PÂLE, dans une pastille, et elles y sont bonnes, contraste
 * vérifié. Remplir une barre est un autre métier : un aplat demande de la
 * clarté et du chroma là où une encre demande du contraste.
 *
 * CELLE-CI PASSE LES CINQ CONTRÔLES, sur fond clair comme sur fond sombre :
 * clarté, chroma, daltonisme (pire voisin ΔE 9,6 en deutan), vision normale
 * (pire voisin ΔE 24,3) et contraste.
 *
 * ÉCLAIRCIR POUR LA NUIT ÉTAIT UN RÉFLEXE, ET IL ÉTAIT FAUX. La version
 * éclaircie échoue deux contrôles, la bande de clarté et le daltonisme, alors
 * que ces cinq teintes passent telles quelles sur fond sombre. Mesuré, pas
 * supposé.
 *
 * L'ORDRE EST FIXE ET NE TOURNE JAMAIS. Une famille garde sa couleur quel que
 * soit le nombre de familles affichées : un filtre qui en retire une ne doit
 * pas repeindre les autres, sinon la couleur désigne un rang et plus une chose.
 */
export const PALETTE_GRAPHIQUE = ["#3366cc", "#c2570a", "#0a9396", "#9b4fc0", "#4a8c2a"] as const;

/**
 * Une couleur par famille, dans l'ordre d'affichage des familles.
 *
 * La carte est écrite en toutes lettres plutôt que calculée par index : un
 * index se décale le jour où l'on insère une famille, et toutes les couleurs
 * glissent d'un cran sans que rien n'échoue.
 */
export const COULEUR_FAMILLE: Record<Famille, string> = {
  etat: "#3366cc",
  entreprise: "#c2570a",
  actions: "#0a9396",
  fonds: "#9b4fc0",
  especes: "#4a8c2a",
};

/**
 * La couleur d'une seule série, quand il n'y a rien à distinguer.
 *
 * Un graphique à une série n'a pas besoin d'une palette : il prend la première
 * teinte, et son titre dit ce qu'elle est.
 */
export const UNE_SERIE = PALETTE_GRAPHIQUE[0];
