"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

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
 * LA PAGE NE BOUGE PAS. Le formulaire partait en navigation complète, et la page
 * se rechargeait en haut : on réglait en lisant le bas, et l'on perdait sa place à
 * chaque choix. Le réglage passe maintenant par le routeur, sans remonter
 * (`scroll: false`) ; la page se redessine à l'endroit où l'on lisait.
 *
 * LE BOUTON « APPLIQUER » NE RESTE QUE SANS SCRIPT : la page le pose dans un
 * « noscript ». Un formulaire dont le seul moyen de partir est un écouteur ne
 * partirait pas chez quelqu'un dont le script n'a pas tourné ; avec le script, le
 * bouton fait croire qu'il faut cliquer, ce qui est faux.
 */
export function ReglageAuto({ formId }: { formId: string }) {
  const router = useRouter();
  const chemin = usePathname();
  useEffect(() => {
    const f = document.getElementById(formId) as HTMLFormElement | null;
    if (!f) return;
    const change = (e: Event) => {
      const c = e.target;
      const coche = c instanceof HTMLInputElement && (c.type === "checkbox" || c.type === "radio");
      if (c instanceof HTMLSelectElement || coche) {
        const q = new URLSearchParams();
        for (const [k, v] of new FormData(f)) if (typeof v === "string") q.append(k, v);
        router.replace(`${chemin}?${q.toString()}`, { scroll: false });
      }
    };
    f.addEventListener("change", change);
    return () => f.removeEventListener("change", change);
  }, [formId, router, chemin]);
  return null;
}
