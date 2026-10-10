import type { IntakeItem } from "@/lib/domain/types";

/**
 * QUI A DEMANDÉ LA RELECTURE D'UN BROUILLON D'ENTRÉE.
 *
 * Le nom se lit d'un CHAMP (`reviewBy`) depuis le 10 octobre 2026. Il se
 * lisait d'une phrase, avec une expression qui attendait un tiret cadratin
 * quand la note s'écrivait avec deux points : le garde des quatre yeux n'a
 * jamais tiré, et une personne seule pouvait demander une relecture puis
 * publier elle-même. Un fait ne se range pas dans une phrase que l'on peut
 * réécrire.
 *
 * Le repli sur la phrase sert les brouillons écrits avant le champ, et il
 * accepte les deux ponctuations : c'est la maison qui a changé de tiret en
 * cours de route, pas le desk.
 *
 * Cette fonction vit hors des actions parce qu'un fichier « use server »
 * n'exporte que des fonctions asynchrones : une fonction pure exportée de
 * là-bas casse la compilation. Deuxième fois que la maison s'y prend.
 */
const REVUE_AVANT_LE_CHAMP = /^Revue demandée par (.+?)\s*[:—]/;

export const demandeurDeLaRevue = (item: Pick<IntakeItem, "reviewBy" | "notes">): string | undefined => item.reviewBy || item.notes?.match(REVUE_AVANT_LE_CHAMP)?.[1]?.trim();
