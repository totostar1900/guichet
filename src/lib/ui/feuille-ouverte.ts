/**
 * Le sélecteur d'une feuille modale OUVERTE : une feuille fermée reste dans le DOM (`aria-hidden="true"`), seule l'ouverte retient un geste de page (le balayage entre menus s'y tait).
 */
export const FEUILLE_OUVERTE = '[role="dialog"][aria-modal="true"]:not([aria-hidden="true"])';
