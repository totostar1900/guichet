"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * « Cette liste est lue du desk. »
 *
 * Les listes du Guichet et celles du desk sont les mêmes objets : mêmes
 * rangées, mêmes cartes, mêmes filtres, même tri. Deux choses seulement les
 * séparent, et ce sont deux choses que chaque composant de la liste devrait
 * sinon recevoir en cascade : où mène une ligne, et si les commandes faites
 * pour un client ont lieu d'être.
 *
 * Un contexte plutôt qu'une propriété de plus à chaque étage : la page du desk
 * enveloppe le corps commun, et les composants à l'intérieur le lisent là où
 * ils en ont besoin. Rien n'est recopié, donc rien ne peut diverger.
 *
 * Le corps de la fiche, lui, est rendu par le serveur et ne peut pas lire un
 * contexte : il reçoit son « mode » en clair.
 */
const Ctx = createContext(false);

export function DeskView({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={true}>{children}</Ctx.Provider>;
}

/** Vrai quand la liste est lue du desk : les commandes du client ne paraissent pas. */
export const useDeskView = (): boolean => useContext(Ctx);

/**
 * Le préfixe des pages qui existent des deux côtés à la même adresse : les
 * sociétés cotées, la comparaison. Une ligne, elle, ne se contente pas d'un
 * préfixe (voir `useLineHref`), parce que le desk la lit sous un autre nom.
 */
export const useDeskBase = (): string => (useContext(Ctx) ? "/desk" : "");

/**
 * Où mène une ligne : la fiche du client, ou la ligne au desk, qui porte la
 * même lecture plus les versions, le cycle de vie et la piste d'audit.
 */
export function useLineHref(): (id: string) => string {
  const desk = useContext(Ctx);
  return (id: string) => (desk ? `/desk/lignes/${id}` : `/offres/${id}`);
}
