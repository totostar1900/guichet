"use client";

import { useEffect } from "react";

/**
 * UN RÉGLAGE S'APPLIQUE EN CHANGEANT, PAS EN CLIQUANT.
 *
 * Même raison que le filtre du tableau des résultats : choisir un Trésor puis
 * oublier le bouton montre l'écran d'avant, et on lit des chiffres en croyant
 * avoir réglé. C'est pire qu'un réglage qui ne marche pas, parce que rien ne
 * le signale.
 *
 * Celui-ci part aussi sur une case à cocher et sur un bouton radio, que le
 * filtre des résultats ignorait faute d'en avoir.
 *
 * LE BOUTON RESTE. Il sert au clavier, il sert quand ce script n'a pas tourné,
 * et un formulaire dont le seul moyen de partir est un écouteur est un
 * formulaire qui ne part pas chez quelqu'un.
 */
export function ReglageAuto({ formId }: { formId: string }) {
  useEffect(() => {
    const f = document.getElementById(formId) as HTMLFormElement | null;
    if (!f) return;
    const change = (e: Event) => {
      const c = e.target;
      const coche = c instanceof HTMLInputElement && (c.type === "checkbox" || c.type === "radio");
      if (c instanceof HTMLSelectElement || coche) f.requestSubmit();
    };
    f.addEventListener("change", change);
    return () => f.removeEventListener("change", change);
  }, [formId]);
  return null;
}
