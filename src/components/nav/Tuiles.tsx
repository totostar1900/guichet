"use client";

import Link from "next/link";
import styles from "./Tuiles.module.css";

/**
 * UNE GRILLE DE DESTINATIONS, POUR LES DEUX FEUILLES.
 *
 * La feuille du dock et celle du compte posaient des rangées pleine largeur,
 * nom et phrase. On lisait beaucoup pour choisir entre trois ou quatre
 * choses, alors qu'on ouvre ces feuilles pour aller ailleurs : en grille, les
 * destinations se voient d'un coup et le pouce n'a plus à descendre. Mesuré
 * sur le compte le 5 octobre 2026 : les huit destinations commençaient à 224
 * et finissaient à 741, pour 460 pixels visibles, donc la moitié ne se voyait
 * jamais sans défiler.
 *
 * CE QU'UNE TUILE PERD, C'EST LA PHRASE. Elle garde trois mots, jamais rien :
 * une grille d'icônes nues ne dit pas ce qu'elle ouvre, et c'est le défaut
 * habituel de ces grilles.
 *
 * ELLE SERT UNE DESTINATION, ET DESSERT LE RESTE. Un canal porte une valeur et
 * son état, un réglage porte une commande, une entrée « bientôt » ne mène
 * nulle part : ces trois-là restent des rangées. C'est la même ligne de
 * partage qui tient Trader hors des tuiles.
 */
export interface Tuile {
  key: string;
  href: string;
  /** Le nom court : le nom complet ne tient pas sous un cadre de 54 px. */
  nom: string;
  /** Trois ou quatre mots. Jamais une phrase, jamais rien. */
  mots?: string;
  /**
   * Ce que la page dit d'elle en ce moment, à la place des trois mots. Une
   * seule tuile en porte un aujourd'hui, l'état du dossier d'ouverture, et
   * c'est la seule information vivante des deux grilles.
   */
  etat?: string;
  /** Ce qu'il y a derrière, pour répondre avant le toucher. */
  compte?: number;
  icone: React.ReactNode;
  ici?: boolean;
}

export function Tuiles({ items, onPick }: { items: Tuile[]; onPick?: () => void }) {
  return (
    <div className={styles.tuiles} style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)` }}>
      {items.map((it) => (
        <Link key={it.key} href={it.href} className={`${styles.tuile} ${it.ici ? styles.tuileIci : ""}`} aria-current={it.ici ? "page" : undefined} onClick={onPick}>
          <span className={styles.ico}>
            {it.etat && <span className={styles.pastille} aria-hidden="true" />}
            {it.icone}
          </span>
          <b>{it.nom}</b>
          {it.etat ? <span className={styles.etat}>{it.etat}</span> : it.mots ? <em>{it.mots}</em> : null}
          {it.compte != null && <span className={styles.compte}>{it.compte}</span>}
        </Link>
      ))}
    </div>
  );
}
