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

/**
 * LA VARIANTE COLLANTE, POUR UN FORMULAIRE QUI VIT DANS LE FLUX DE LA PAGE (10 novembre 2026).
 *
 * « BarreDEtape » est fixée et laisse une cale ; celle-ci est « sticky » : elle reste à sa place à la fin du formulaire quand il tient dans l'écran, et se colle au bas de l'écran (au-dessus de la barre de l'application, ou au ras du bas
 * dans une page) tant que le formulaire dépasse. Les boutons qui valident la page (« Approvisionner », « Préparer, puis signer », « Signer ») y vivent : un bouton qu'il faut aller chercher en bas d'une page longue n'est pas un bouton.
 */
export function BarreCollante({ indice, children }: { indice?: string; children: React.ReactNode }) {
  return (
    <div className={styles.collante}>
      {indice && (
        <p className={styles.indice} role="status">
          {indice}
        </p>
      )}
      <div className={styles.rangee}>{children}</div>
    </div>
  );
}
