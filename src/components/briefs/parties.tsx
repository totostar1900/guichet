"use client";

import type { ReactNode } from "react";
import styles from "../EnBref.module.css";

/**
 * LES DEUX FORMES QU'UNE PROSE DE BRIEF AJOUTE, et ce sont des composants,
 * pas des classes.
 *
 * Les modules CSS scopent leurs noms : un fichier qui écrirait « enbref-titre »
 * en clair ne toucherait rien. La première écriture exportait donc la feuille
 * entière — « classesDuBrief » — et les pages y puisaient « .titre » et
 * « .cats ». ÇA A TENU UNE HEURE : le relevé des classes mortes cherche
 * « <nom local>.X » dans les fichiers qui IMPORTENT la feuille, et aucune
 * page n'importait celle-ci ; « .cats » est donc ressortie morte alors que
 * deux pages l'employaient. L'épreuve avait raison sur le fond — un fichier
 * ne doit pas nommer les classes d'un autre.
 *
 * Deux composants le disent mieux : l'appelant passe son contenu, la feuille
 * garde ses noms, et le relevé les voit. Il n'y a rien d'autre à exposer — un
 * brief n'a que des titres de section et des définitions.
 *
 * ILS VIVENT ICI PLUTÔT QUE DANS « EnBref », depuis le 31 octobre 2026, et
 * c'est une question de sens de lecture : « EnBref » lit la prose, la prose
 * lit ces deux formes. Les laisser dans « EnBref » faisait que les deux
 * fichiers s'importaient l'un l'autre — un cycle que les modules résolvent
 * tant que personne n'appelle rien au chargement, c'est-à-dire tant que
 * personne ne touche au fichier.
 */
export function TitreDeBrief({ children }: { children: ReactNode }) {
  return <h3 className={styles.titre}>{children}</h3>;
}

/** Une définition par ligne : son nom, sa phrase. Voir « .cats ». */
export function DefinitionsDeBrief({ children }: { children: ReactNode }) {
  return <dl className={styles.cats}>{children}</dl>;
}
