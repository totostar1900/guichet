"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * LA BARRE DU DESK SE MESURE, parce qu'elle ne tient pas toujours sur une
 * ligne.
 *
 * Tout ce qu'une page du desk fige en haut — le rail du Carnet, celui de
 * « Cotes et VL », un en-tête de tableau — doit se figer SOUS elle. Une
 * constante aurait menti : la barre porte six groupes et trente-deux
 * onglets, elle passe à deux lignes entre 900 et 1 300 pixels, et se range
 * en une seule bande qui défile en dessous. Trois hauteurs, donc, pour la
 * même barre.
 *
 * Elle publie donc la sienne dans `--desk-bar-h`, et `--gel-desk` l'ajoute à
 * celle de l'en-tête. Mesurer plutôt que deviner : c'est ce que fait déjà le
 * tableau haut, qui mesure sa vingt-et-unième ligne au lieu d'estimer en rem.
 *
 * Elle la retire en partant : hors du desk la variable vaut zéro, et une
 * valeur oubliée décalerait les pages qui n'ont pas de barre.
 */
export function BarreGelee({ className, children, ...reste }: { className?: string; children: ReactNode } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const racine = document.documentElement;
    const poser = () => racine.style.setProperty("--desk-bar-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    poser();
    const observeur = new ResizeObserver(poser);
    observeur.observe(el);
    return () => {
      observeur.disconnect();
      racine.style.removeProperty("--desk-bar-h");
    };
  }, []);

  return (
    <nav ref={ref} className={className} {...reste}>
      {children}
    </nav>
  );
}
