import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Ligne.module.css";

/**
 * UNE LIGNE DE DOCUMENT : ce qu'il est, où il en est, et AU PLUS UN GESTE.
 *
 * Le geste est celui que le papier attend : signer un bulletin, régler un
 * appel de fonds, contester un avis de garde, suivre une réclamation. Tout le
 * reste (télécharger, partager, voir l'opération) vit dans la page de la
 * pièce : une ligne qui porte quatre boutons devient une barre d'outils, et
 * on ne lit plus ce qu'elle dit.
 *
 * Elle ne porte aucun compteur et ne s'additionne nulle part : l'accueil est
 * seul à compter les devoirs. Deux compteurs finissent toujours par donner
 * deux chiffres, et c'est le genre de désaccord qui se paie en confiance.
 *
 * Aucun appel au traducteur ici : les textes arrivent déjà traduits, parce
 * que cette ligne sert aussi bien au serveur qu'au client.
 */
export interface GesteDeLigne {
  label: string;
  href: string;
  /** Le geste attendu se voit ; les autres restent discrets. */
  primaire?: boolean;
}

export function Ligne({ titre, sous, etat, ton, geste }: { titre: string; sous?: ReactNode; etat?: string; ton?: "fait" | "attend"; geste?: GesteDeLigne }) {
  return (
    <div className={styles.ligne}>
      <span className={styles.quoi}>
        <b>{titre}</b>
        {sous && <small>{sous}</small>}
      </span>
      {etat && <span className={`${styles.etat} ${ton ? styles[ton] : ""}`}>{etat}</span>}
      {geste && (
        <span className={styles.geste}>
          <Link className={`btn sm ${geste.primaire ? "primary" : ""}`} href={geste.href}>
            {geste.label}
          </Link>
        </span>
      )}
    </div>
  );
}

/** Le séparateur d'année, dans les rayons qui courent sur plusieurs exercices. */
export function Annee({ an }: { an: string }) {
  return (
    <div className={styles.annee}>
      <span>{an}</span>
      <i />
    </div>
  );
}
