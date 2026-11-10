"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./DansLaBarre.module.css";

/**
 * UN BOUTON DE LA PAGE, POSÉ DANS LA BARRE DU HAUT SUR TÉLÉPHONE (10 novembre 2026, option A).
 *
 * Dans une page, la barre du haut porte les boutons qui lui sont propres (le suivi d'une ligne, par exemple), à côté du menu. La page déclare le sien en l'entourant de ce composant : sur téléphone il est rendu dans l'emplacement de la barre
 * (un portail : c'est le même composant, le même état, pas une copie) ; ailleurs il reste là où la page l'a écrit. La copie en ligne est cachée par la feuille de style sur téléphone, de sorte que rien ne saute d'un endroit à l'autre au chargement.
 */
export function DansLaBarre({ children }: { children: React.ReactNode }) {
  const [hote, setHote] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 760px)");
    /* Deux barres du haut sont montées (téléphone et écran large) : on prend celle qui se voit. */
    const lire = () => setHote(m.matches ? ([...document.querySelectorAll<HTMLElement>("[data-barre-contextuelle]")].find((e) => e.getClientRects().length > 0) ?? null) : null);
    lire();
    m.addEventListener("change", lire);
    return () => m.removeEventListener("change", lire);
  }, []);
  return (
    <>
      <span className={styles.enLigne}>{children}</span>
      {hote && createPortal(<span className={styles.dansLaBarre}>{children}</span>, hote)}
    </>
  );
}
