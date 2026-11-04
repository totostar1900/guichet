"use client";

import { useSyncExternalStore } from "react";
import styles from "./Bulle.module.css";

/**
 * LA BULLE DE CONFIRMATION, UNE SEULE, ET ELLE SURVIT À SA PAGE (7 novembre 2026).
 *
 * Le menu « ··· » posait la sienne en bas de l'écran, le glissement dans la carte, l'étoile de la fiche n'en posait aucune : trois façons de dire « c'est
 * fait » pour le même geste. Une seule maintenant : or doux, filet or, centrée sous la barre de l'application, une seconde et demie.
 *
 * ELLE VIT HORS DES COMPOSANTS QUI LA DISENT. Sur les pages Suivies et Favoris, retirer une ligne la fait disparaître de la liste : le bouton qui venait de
 * parler était démonté avec elle, et la bulle partait avec lui avant d'être lue (mesuré : rien à l'écran 800 ms après le geste). L'état est donc un magasin
 * de module, et « HoteDeLaBulle » (posé une fois dans la mise en page) l'affiche, quelle que soit la page qui l'a demandée.
 */
let texte = "";
let minuterie: number | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

export function dire(t: string) {
  texte = t;
  if (minuterie) window.clearTimeout(minuterie);
  minuterie = window.setTimeout(() => {
    texte = "";
    prevenir();
  }, 1600);
  prevenir();
}

/** De quoi dire une confirmation. */
export function useBulle(): { dire: (texte: string) => void } {
  return { dire };
}

/** Posé une fois dans la mise en page : affiche la confirmation en cours. */
export function HoteDeLaBulle() {
  const t = useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => texte,
    () => "",
  );
  return t ? (
    <div className={styles.bulle} role="status" aria-live="polite">
      {t}
    </div>
  ) : null;
}

type Dire = (cle: string) => string;

/** Ce que la maison dit quand un suivi change : armé (une fois par jour à l'adjudication, à chaque mouvement sur la cote) ou retiré. */
export function texteDuSuivi(watching: boolean, cadence: "evenement" | "quotidien" | undefined, t: Dire): string {
  if (!watching) return t("Alerte retirée");
  return cadence === "quotidien" ? t("Alerte armée : un message par jour jusqu'à la clôture") : t("Ligne suivie : un message à chaque mouvement");
}
