"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * D'OÙ VIENT UNE FICHE, DIT PAR LA FICHE (8 novembre 2026).
 *
 * La barre du haut dit le lieu à partir de l'ADRESSE seule. Or une fiche vit sous « /offres/… » quelle que soit sa famille : la barre répondait « Trade ·
 * Titres » devant une adjudication. Elle ne peut pas deviner la famille d'une ligne ; la fiche, qui la connaît, la lui dit. « LieuDeLaFiche » (posé par la
 * page) publie l'adresse de la liste de la famille ; « useListeDeLaFiche » la rend à la barre, et seulement pour CETTE adresse : une fiche qu'on quitte
 * ne laisse pas son lieu à la page suivante.
 */
let courant: { chemin: string; liste: string } | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

export function LieuDeLaFiche({ chemin, liste }: { chemin: string; liste: string }) {
  useEffect(() => {
    courant = { chemin, liste };
    prevenir();
    return () => {
      if (courant?.chemin === chemin) courant = null;
      prevenir();
    };
  }, [chemin, liste]);
  return null;
}

/** L'adresse de la liste de la famille de la fiche ouverte à `chemin`, quand elle l'a dite. */
export function useListeDeLaFiche(chemin: string): string | undefined {
  const c = useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => courant,
    () => null,
  );
  return c && c.chemin === chemin ? c.liste : undefined;
}
