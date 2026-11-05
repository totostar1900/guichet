import type { ReactNode } from "react";
import styles from "./Mosaique.module.css";

/**
 * LA MOSAÏQUE (fiche d'une action, 9 novembre 2026, planche 2B) : le chiffre MAJEUR en haut, à la taille dominante (« --t-8 »), et les autres chiffres dessous,
 * côte à côte, en tuiles douces. Une tuile sans valeur n'existe pas : on ne passe que ce que la maison sait.
 * Deux colonnes pour deux ou quatre tuiles, trois pour trois, une pour une seule.
 */
export function Majeur({ etiquette, valeur, unite, sous, or = false }: { etiquette: string; valeur: string; unite?: string; sous?: ReactNode; or?: boolean }) {
  return (
    <div className={styles.majeur}>
      <span className={styles.etiquette}>{etiquette}</span>
      <b className={`${styles.valeur} ${or ? styles.or : ""}`}>
        {valeur}
        {unite && <i>{unite}</i>}
      </b>
      {sous && <span className={styles.sous}>{sous}</span>}
    </div>
  );
}

/** Les tuiles seules : sous un graphe, par exemple. Deux colonnes pour deux ou quatre, trois pour trois, une pour une seule. */
export function Tuiles({ tuiles, deux = false }: { tuiles: [string, string][]; /** Deux colonnes même pour trois tuiles : la dernière prend toute la largeur (des libellés longs ne tiennent pas à trois). */ deux?: boolean }) {
  const n = tuiles.length;
  if (n === 0) return null;
  return (
    <div className={`${styles.tuiles} ${n === 1 ? styles.c1 : n === 3 && !deux ? styles.c3 : styles.c2} ${deux && n % 2 === 1 ? styles.derniereLarge : ""}`}>
      {tuiles.map(([k, v]) => (
        <div key={k} className={styles.tuile}>
          <span>{k}</span>
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}

export function Mosaique({ majeur, tuiles, deux = false }: { majeur: ReactNode; tuiles: [string, string][]; deux?: boolean }) {
  return (
    <div className={styles.mosaique}>
      {majeur}
      <Tuiles tuiles={tuiles} deux={deux} />
    </div>
  );
}
