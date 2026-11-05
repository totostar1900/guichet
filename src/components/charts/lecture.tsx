"use client";

import { useMemo } from "react";
import { useTracker } from "./tracker";
import styles from "./lecture.module.css";

/**
 * LA LECTURE D'UN POINT : UNE BULLE NOIRE AU-DESSUS DU TRACÉ (fiche d'une action, 9 novembre 2026).
 *
 * Au toucher d'un point (des barres, des repères) ou au glissement du doigt sur une courbe, une bulle noire dit ce que le point contient : sa date ou son année, puis
 * une ligne par grandeur (nom, valeur, unité). ELLE NE CACHE JAMAIS CE QU'ON LIT : elle est posée AU-DESSUS du dessin, hors du tracé, et non à côté du point où le
 * doigt se pose (le défaut relevé sur l'indice le 5 octobre 2026 : 30 % du dessin sous une bulle, le doigt dessus). Elle ne déplace rien : posée en absolu, elle ne
 * change pas la hauteur du graphique, donc le tracé ne bouge pas sous le doigt. Elle suit le doigt en abscisse, serrée contre le bord quand le point en est proche.
 *
 * Le suivi du pointeur est celui de toute la plateforme (`useTracker` : le point le plus proche, la capture du doigt, la fin de la lecture au défilement ou au toucher
 * ailleurs). Ce fichier ne fait que le dire en bulle.
 */
export interface LigneLue {
  nom: string;
  valeur: string;
  /** La pastille de la série : sa couleur (variable CSS ou valeur). */
  couleur?: string;
}

export interface Lecture {
  titre: string;
  lignes: LigneLue[];
}

/** Le point lu (ou `null`) et les gestes à poser sur le <svg>. `x` : l'abscisse d'un point dans le viewBox. */
export function useLecture(n: number, x: (i: number) => number, W: number) {
  const keys = useMemo(() => Array.from({ length: n }, (_, i) => String(i)), [n]);
  const { handlers, hover } = useTracker({ keys, x, W });
  return { handlers, index: hover };
}

/**
 * La bulle noire, à poser DANS le bloc qui enveloppe le <svg> (position: relative). `x` et `W` : l'abscisse du point dans le viewBox, pour que la bulle le suive ;
 * serrée à gauche sous 22 %, à droite au-delà de 78 %, centrée entre les deux.
 */
export function BulleNoire({ lecture, x, W }: { lecture: Lecture | null; x: number; W: number }) {
  if (!lecture) return null;
  const pct = Math.max(0, Math.min(100, (x / W) * 100));
  const ancre = pct < 22 ? styles.gauche : pct > 78 ? styles.droite : styles.centre;
  return (
    <div className={`${styles.bulle} ${ancre}`} style={{ left: `${pct}%` }} aria-hidden="true">
      <b>{lecture.titre}</b>
      {lecture.lignes.map((l) => (
        <span key={l.nom}>
          {l.couleur && <i style={{ background: l.couleur }} />}
          <em>{l.nom}</em>
          <strong>{l.valeur}</strong>
        </span>
      ))}
    </div>
  );
}
