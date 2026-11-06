/**
 * LA BOÎTE D'UN GRAPHE DE LECTURE (6 novembre 2026, planche « 1A ») : 320 unités de large, 190 de haut, affichée à peu près à sa taille (une unité ≈ un pixel à 390 px).
 * Le texte du dessin se règle par les jetons `--graphe-texte` et `--graphe-valeur` de `globals.css`, jamais en px dans la feuille d'un composant. Une boîte plus large
 * (720, 680) réduit le texte au tiers de sa taille : c'est ce qui rendait les graduations illisibles.
 */
export const GRAPHE_L = 320;
export const GRAPHE_H = 190;

/** La largeur estimée d'un caractère du texte d'un dessin (10 px) : sert à ne pas écrire deux repères d'axe l'un sur l'autre (`reperesSansChevauchement`). */
export const GRAPHE_CAR = 5.8;
