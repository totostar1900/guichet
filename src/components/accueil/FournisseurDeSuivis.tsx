"use client";

import { SuivisContext } from "@/lib/ui/suivi";
import { useMemo } from "react";

/**
 * LES LIGNES SUIVIES, POSÉES POUR TOUT CE QU'ELLES ENVELOPPENT : le glissement d'une rangée de l'accueil retrouve son état (« Suivre » ou « Suivie ») comme celui des cartes des listes.
 * Un composant serveur ne peut pas rendre un contexte client : ce fournisseur le fait à sa place.
 */
export function FournisseurDeSuivis({ ids, children }: { ids: string[]; children: React.ReactNode }) {
  const set = useMemo(() => new Set(ids), [ids]);
  return <SuivisContext.Provider value={set}>{children}</SuivisContext.Provider>;
}
