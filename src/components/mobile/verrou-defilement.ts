"use client";

import { useEffect } from "react";

/**
 * LA PAGE NE DÉFILE PAS DERRIÈRE UNE FEUILLE OUVERTE.
 *
 * Quatre composants posaient `document.body.style.overflow = "hidden"` à
 * l'ouverture, chacun sa copie. Sur un ordinateur cela suffit. Sur iOS Safari
 * non : `overflow: hidden` sur le corps n'y arrête pas le défilement de la
 * page, et c'est la raison pour laquelle, le doigt sur un menu, l'écran du
 * dessous partait avec lui. Signalé le 4 octobre 2026.
 *
 * LE SEUL VERROU QUI TIENT PARTOUT est de sortir le corps du flux : on retient
 * la position, on fixe le corps à l'écran avec un décalage négatif égal à
 * cette position, et on la rend à la fermeture. Le lecteur ne voit rien bouger,
 * et il n'y a plus rien à faire défiler derrière.
 *
 * UN COMPTEUR, PARCE QU'UNE FEUILLE EN OUVRE UNE AUTRE. Le « ⋮ » ouvre une
 * feuille qui peut en ouvrir une seconde ; si chacune restaurait le corps en
 * se fermant, la première fermeture déverrouillerait pendant que la seconde
 * est encore là. Seule la dernière rend la position, et c'est la première qui
 * l'a retenue.
 *
 * CE QUI RESTE À LA CHARGE DU CSS : `overscroll-behavior: contain` sur le
 * panneau qui défile à l'intérieur. Le verrou empêche la page de bouger, pas
 * le geste de se propager au parent une fois la feuille arrivée en bout.
 */
let ouvertes = 0;
let positionRetenue = 0;

export function verrouiller(): void {
  if (ouvertes++ > 0) return;
  positionRetenue = window.scrollY;
  const b = document.body.style;
  b.position = "fixed";
  b.top = `-${positionRetenue}px`;
  b.left = "0";
  b.right = "0";
  b.width = "100%";
  b.overflow = "hidden";
  /* TIRER VERS LE BAS NE RAFRAICHIT PAS LA PAGE tant qu'une feuille est
     ouverte. Le corps hors du flux empêche le défilement, pas le geste : le
     navigateur reconnaît le tiré au bord haut et recharge, ce qui ferme la
     feuille ET perd ce que le lecteur y avait coché. Signalé sur la feuille
     des filtres le 4 octobre 2026. */
  b.overscrollBehavior = "none";
}

export function deverrouiller(): void {
  if (ouvertes === 0) return;
  if (--ouvertes > 0) return;
  const b = document.body.style;
  b.position = "";
  b.top = "";
  b.left = "";
  b.right = "";
  b.width = "";
  b.overflow = "";
  b.overscrollBehavior = "";
  /* `scrollTo` sans animation : la restauration doit être invisible, une
     feuille qui se ferme sur un glissement doux ramènerait l'œil en haut. */
  window.scrollTo({ top: positionRetenue, behavior: "instant" as ScrollBehavior });
}

/** Le verrou pendant qu'une feuille est ouverte, rendu à sa fermeture comme au démontage. */
export function useVerrouDeDefilement(ouvert: boolean): void {
  useEffect(() => {
    if (!ouvert) return;
    verrouiller();
    return deverrouiller;
  }, [ouvert]);
}
