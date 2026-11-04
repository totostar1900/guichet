"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./Bulle.module.css";

/**
 * LA BULLE DE CONFIRMATION, UNE SEULE (7 novembre 2026).
 *
 * Le menu « ··· » posait la sienne en bas de l'écran, le glissement dans la carte, l'étoile de la fiche n'en posait aucune : trois façons de dire « c'est
 * fait » pour le même geste. Une seule maintenant : or doux, filet or, centrée sous la barre de l'application, une seconde et demie, lisible quel que soit
 * l'endroit de la page où le doigt a appuyé. `useBulle` rend de quoi la dire (`dire`) et de quoi la poser (`bulle`, à mettre dans le rendu).
 */
export function useBulle(): { dire: (texte: string) => void; bulle: React.ReactNode } {
  const [texte, setTexte] = useState("");
  const minuterie = useRef<number | null>(null);
  const monte = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dire = useCallback((t: string) => {
    setTexte(t);
    if (minuterie.current) window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => setTexte(""), 1600);
  }, []);
  useEffect(
    () => () => {
      if (minuterie.current) window.clearTimeout(minuterie.current);
    },
    [],
  );
  const bulle =
    monte && texte
      ? createPortal(
          <div className={styles.bulle} role="status" aria-live="polite">
            {texte}
          </div>,
          document.body,
        )
      : null;
  return { dire, bulle };
}

type Dire = (cle: string) => string;

/** Ce que la maison dit quand un suivi change : armé (une fois par jour à l'adjudication, à chaque mouvement sur la cote) ou retiré. */
export function texteDuSuivi(watching: boolean, cadence: "evenement" | "quotidien" | undefined, t: Dire): string {
  if (!watching) return t("Alerte retirée");
  return cadence === "quotidien" ? t("Alerte armée : un message par jour jusqu'à la clôture") : t("Ligne suivie : un message à chaque mouvement");
}
