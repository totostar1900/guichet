"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * ALLER PLUS LOIN GLISSE À GAUCHE, REVENIR GLISSE À DROITE.
 *
 * Le parcours de « Trade » a montré ce que le téléphone gagne à montrer la
 * direction : trois panneaux sur un ruban, et le mouvement dit si l'on
 * s'enfonce ou si l'on remonte. Mais ce ruban ne vaut que DANS une page —
 * entre deux pages, le reste de l'application remplaçait tout d'un coup, sans
 * un signe. Deux écrans se succédaient, et rien ne disait lequel contenait
 * l'autre.
 *
 * CETTE PIÈCE PORTE LA MÊME IDÉE ENTRE LES PAGES. La convention vient du
 * cinéma et de la page imprimée : avancer va vers la gauche, revenir vers la
 * droite. Elle est si ancrée que l'enfreindre désoriente.
 *
 * LA DIRECTION NE SE DEVINE PAS, ELLE SE DÉCLARE. Le navigateur ne sait pas
 * lequel de deux écrans est « au-dessus » de l'autre : c'est une affaire de
 * hiérarchie, que seule la maison connaît. Chaque lien dit donc ce qu'il
 * fait — `LienAvant` descend d'un cran, `LienRetour` remonte — et une
 * navigation sans étiquette ne joue aucune direction. C'est voulu : le retour
 * système, un rafraîchissement ou l'arrivée d'un contenu différé ne sont pas
 * des gestes de profondeur.
 *
 * SANS LE NAVIGATEUR QUI VA AVEC, RIEN NE CASSE. Les transitions de vue
 * demandent un navigateur récent ; là où elles manquent, les pages se
 * remplacent comme avant. Une animation est un confort, jamais une condition.
 *
 * ON ENVELOPPE LA PAGE, JAMAIS LA MISE EN PAGE. Une mise en page persiste
 * d'une navigation à l'autre : l'entrée et la sortie n'y partiraient jamais.
 */
const SENS = {
  "nav-avant": "nav-avant",
  "nav-retour": "nav-retour",
  default: "none",
} as const;

export function Glissement({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={SENS} exit={SENS} default="none">
      {children}
    </ViewTransition>
  );
}

/** Un cran plus loin : la page sortante part à gauche, l'entrante vient de la droite. */
export function LienAvant(p: ComponentProps<typeof Link>) {
  return <Link {...p} transitionTypes={["nav-avant"]} />;
}

/** Un cran en arrière : l'inverse, et c'est ce qui le rend lisible. */
export function LienRetour(p: ComponentProps<typeof Link>) {
  return <Link {...p} transitionTypes={["nav-retour"]} />;
}
