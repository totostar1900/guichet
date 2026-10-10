"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { poserLePli } from "@/components/Pli";
import styles from "./page.module.css";

/**
 * REPLIER LES QUATRE RAYONS D'UN COUP, et les redéplier.
 *
 * Replié, l'écran tient en quatre bandes : on lit en une seconde qu'il y a un
 * bulletin à signer et un appel de fonds à régler, parce que chaque bande
 * porte ce qu'elle cache. C'est la lecture rapide de la page, et elle mérite
 * un bouton.
 */
export function ToutReplier({ cles }: { cles: string[] }) {
  const t = useT();
  const [plie, setPlie] = useState(false);
  return (
    <button
      type="button"
      className={styles.tout}
      data-plie={plie ? "oui" : "non"}
      onClick={() => {
        cles.forEach((c) => poserLePli(c, plie));
        setPlie(!plie);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
      {t(plie ? "Tout déplier" : "Tout replier")}
    </button>
  );
}
