"use client";

import { useEffect, type RefObject } from "react";

/**
 * CE QUI S'OUVRE SE FERME DE DEHORS, ET PAR ÉCHAP.
 *
 * Deux écouteurs, trois lignes, et pourtant la part la plus facile à écrire
 * de travers : oublier le retrait des écouteurs, écouter « click » plutôt que
 * « mousedown » — et le menu se referme alors AVANT que le clic n'atteigne
 * l'élément visé —, ou laisser Échap au navigateur. La liste déroulante des
 * filtres l'avait ; le titre de groupe des fonds en a eu besoin le même jour.
 * Deux fois la même mécanique est une fois de trop.
 */
export function useFermeDehors(boite: RefObject<HTMLElement | null>, ouvert: boolean, fermer: () => void): void {
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) fermer();
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);
}
