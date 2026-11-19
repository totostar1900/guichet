"use client";

import styles from "./Interrupteur.module.css";

/**
 * L'INTERRUPTEUR DE LA MAISON (19 novembre 2026, planche « Paramètres et connexion », 2A).
 *
 * La seule commande qui dise oui ou non, et la seule qui agisse sans confirmation : on la rebascule du même doigt. Un réglage qui échoue revient en arrière chez l'appelant.
 */
export function Interrupteur({ actif, onChange, label, occupe = false }: { actif: boolean; onChange: (suivant: boolean) => void; label: string; occupe?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={actif} aria-label={label} className={`${styles.switch} ${actif ? styles.on : ""}`} disabled={occupe} onClick={() => onChange(!actif)}>
      <i />
    </button>
  );
}
