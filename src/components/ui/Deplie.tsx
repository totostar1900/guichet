"use client";

import styles from "./Deplie.module.css";

/**
 * UN CONTENU QUI SE DÉPLIE EN GLISSANT, JAMAIS D'UN COUP (10 novembre 2026).
 *
 * Les réponses de l'aide, les blocs repliables, le détail d'un ordre : ils apparaissaient et disparaissaient brusquement (« {open && …} »). La hauteur glisse maintenant, de zéro à celle du contenu, par la même courbe et la même durée que les cartes
 * déplies de Titres (0,34 s, 0,32 · 0,72 · 0 · 1) ; le contenu fermé reste monté mais inerte (ni focus, ni lecteur d'écran). Pas de fondu, pas de rebond.
 */
export function Deplie({ ouvert, children, className }: { ouvert: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.region} ${className ?? ""}`.trim()} data-ouvert={ouvert} inert={!ouvert}>
      <div className={styles.interieur}>{children}</div>
    </div>
  );
}
