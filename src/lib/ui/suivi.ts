"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

/**
 * LE SUIVI D'UNE LIGNE, UN SEUL ÉTAT PAR LIGNE (5 novembre 2026).
 *
 * Le menu « ··· » et le glissement à gauche armaient le même suivi, chacun avec SON état local : armé par l'un, l'autre disait toujours
 * « Suivre », et la cloche de la carte ne bougeait pas. Les trois lisent maintenant ce magasin : la valeur du serveur sert de départ,
 * la première bascule la remplace pour toute la page.
 */
const etat = new Map<string, boolean>();
const ecouteurs = new Set<() => void>();
const abonner = (f: () => void) => {
  ecouteurs.add(f);
  return () => {
    ecouteurs.delete(f);
  };
};

export function poserSuivi(id: string, v: boolean): void {
  etat.set(id, v);
  for (const f of ecouteurs) f();
}

/** Les lignes suivies que le serveur a lues, posées par la liste : un menu ou un glissement qui n'a pas reçu l'état de sa carte le retrouve ici (sans cela, un rafraîchissement le remettait à « Suivre »). */
export const SuivisContext = createContext<ReadonlySet<string> | null>(null);

export function useSuivi(id: string, departExplicite?: boolean): [boolean, (v: boolean) => void] {
  const serveur = useContext(SuivisContext);
  const depart = departExplicite ?? Boolean(serveur?.has(id));
  const lu = useSyncExternalStore(
    abonner,
    () => (etat.has(id) ? (etat.get(id) ? "oui" : "non") : ""),
    () => "",
  );
  return [lu ? lu === "oui" : depart, (v) => poserSuivi(id, v)];
}
