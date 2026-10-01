"use client";

import { useEffect } from "react";

/**
 * Un filtre s'applique en changeant, pas en cliquant.
 *
 * Les quatre commandes du tableau attendaient « Filtrer ». Choisir un Trésor
 * puis oublier le bouton montre la liste d'avant, et on lit des chiffres en
 * croyant avoir filtré : c'est le pire des deux, pire qu'un filtre qui ne
 * marche pas, parce que rien ne le signale.
 *
 * Le bouton reste. Il sert au clavier, il sert quand ce script n'a pas tourné,
 * et un formulaire dont le seul moyen de partir est un écouteur est un
 * formulaire qui ne part pas chez quelqu'un.
 */
export function FiltreAuto({ formId }: { formId: string }) {
  useEffect(() => {
    const f = document.getElementById(formId) as HTMLFormElement | null;
    if (!f) return;
    const change = (e: Event) => {
      const c = e.target;
      // Les dates se tapent chiffre par chiffre : partir au premier « change »
      // d'un champ vide renverrait la page au milieu de la saisie.
      const estDate = c instanceof HTMLInputElement && c.type === "date";
      if (c instanceof HTMLSelectElement || (estDate && c.value)) f.requestSubmit();
    };
    f.addEventListener("change", change);
    return () => f.removeEventListener("change", change);
  }, [formId]);
  return null;
}
