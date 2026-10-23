"use client";

import { LienAvant } from "./Glissement";
import styles from "./Rubriques.module.css";

/**
 * LES RUBRIQUES D'UN SIÈGE, UNE PAR LIGNE, ET CHACUNE MÈNE PLUS LOIN.
 *
 * C'est la liste du premier niveau de « Trade », sortie de sa page : les
 * quatre autres sièges ont la même forme — un nom, ce qu'on y trouve, un
 * chevron — et trois copies de cette liste auraient divergé au premier
 * correctif.
 *
 * ELLE N'EST PAS UN MENU, C'EST UN SOMMAIRE. Un menu dit où aller, un
 * sommaire dit ce qu'il y a : chaque ligne porte donc une phrase, et c'est
 * elle qui épargne le détour. Sur un téléphone, ouvrir une page pour
 * découvrir qu'on s'est trompé coûte deux gestes et une attente.
 *
 * CHAQUE LIGNE EST UN LIEN « AVANT » : on descend d'un cran, donc la page
 * sortante part à gauche et l'entrante vient de la droite. La direction est
 * la seule chose qui dise au lecteur qu'il s'enfonce plutôt qu'il ne saute.
 *
 * UNE CIBLE PLEINE LARGEUR ET HAUTE : sur un téléphone un doigt vise mal, et
 * la maison a déjà payé la leçon des cibles de huit pixels.
 */
export function Rubriques({
  items,
  bandes,
}: {
  items: { href: string; nom: string; quoi?: string; etiquette?: string }[];
  /** EN BANDES PLUTÔT QU'EN FILETS : la forme de « Mes documents », dont l'étalon est tiré. Un filet sépare, une bande désigne — et une rubrique qui ouvre une page est une destination. */
  bandes?: boolean;
}) {
  return (
    <ul className={`${styles.liste} ${bandes ? styles.bandes : ""}`}>
      {items.map((x) => (
        <li key={x.href}>
          <LienAvant href={x.href} className={styles.ligne}>
            <span className={styles.quoi}>
              <b>{x.nom}</b>
              {x.quoi && <small>{x.quoi}</small>}
            </span>
            {x.etiquette && <span className={styles.etiquette}>{x.etiquette}</span>}
            <svg className={styles.chev} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </LienAvant>
        </li>
      ))}
    </ul>
  );
}
