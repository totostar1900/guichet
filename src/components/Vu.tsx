"use client";

import { useEffect, useRef } from "react";
import { noterConsultation } from "@/app/journal-actions";

/**
 * « CETTE PAGE A ÉTÉ REGARDÉE », et seulement si elle l'a vraiment été.
 *
 * Trois raisons de passer par le navigateur plutôt que d'écrire au rendu :
 *
 *   - LE PRÉFETCH. Les listes préchargent la fiche voisine avant tout clic,
 *     et un rendu qui noterait son passage inscrirait des fiches survolées.
 *   - L'ONGLET EN ARRIÈRE-PLAN. Une page ouverte dans un onglet qu'on ne
 *     regarde pas n'est pas une consultation ; on attend qu'elle soit visible.
 *   - LE RENDU QUI SE REJOUE. Un composant serveur peut être rendu deux fois
 *     pour une seule visite ; le registre n'a pas à compter les rendus.
 *
 * Rien n'est affiché, rien n'est attendu : si l'appel échoue, la page ne s'en
 * aperçoit pas, et le client non plus. Une ligne de registre ne vaut pas
 * qu'on interrompe une lecture.
 */
export function Vu({ geste, objet, detail }: { geste: string; objet: string; detail?: string }) {
  const fait = useRef(false);

  useEffect(() => {
    if (fait.current) return;
    const noter = () => {
      if (fait.current || document.visibilityState !== "visible") return;
      fait.current = true;
      void noterConsultation(geste, objet, detail).catch(() => {});
    };
    noter();
    if (fait.current) return;
    document.addEventListener("visibilitychange", noter);
    return () => document.removeEventListener("visibilitychange", noter);
  }, [geste, objet, detail]);

  return null;
}
