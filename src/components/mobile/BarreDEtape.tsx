"use client";

import styles from "./BarreDEtape.module.css";

/**
 * LA BARRE DE L'ÉTAPE EN COURS : COLLANTE EN BAS, GRISÉE TANT QUE L'ÉTAPE N'EST PAS REMPLIE (10 novembre 2026).
 *
 * Demandé pour tous les formulaires qui ont un bouton de validation d'étape : il est toujours collant en bas, comme « Passer un ordre » sur la fiche ; grisé tant que les informations nécessaires manquent, plein dès qu'elles sont là ; et
 * un bouton « Retour » plus petit ramène à la page ou à l'étape précédente. Un bouton grisé ne dit pas pourquoi : l'`indice` le dit, en une ligne, au-dessus des boutons.
 *
 * Sur téléphone elle est fixée au-dessus de la barre du bas (comme la barre de la fiche) et laisse sa cale dans le flux, pour que la fin du formulaire reste atteignable. Sur grand écran elle reste dans le flux, alignée à droite.
 * Les enfants sont les boutons : ils prennent les classes `retour` et `suivant` de la feuille, que le formulaire importe.
 */
export function BarreDEtape({ indice, children }: { indice?: string; children: React.ReactNode }) {
  return (
    <>
      <div className={`${styles.cale} ${indice ? styles.caleHaute : ""}`} aria-hidden="true" />
      <div className={styles.barre} data-coach="action">
        {indice && (
          <p className={styles.indice} role="status">
            {indice}
          </p>
        )}
        <div className={styles.rangee}>{children}</div>
      </div>
    </>
  );
}
