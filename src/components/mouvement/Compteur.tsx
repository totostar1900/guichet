"use client";

import { useLayoutEffect, useRef } from "react";
import { fmt } from "@/lib/format";

/**
 * LE SOLDE QUI COMPTE (21 novembre 2026, « Plaisir d'usage », point 2A : le chiffre d'arrivée monte jusqu'à sa valeur).
 *
 * Le serveur rend la valeur FINALE : sans script, ou avec « moins de mouvement » demandé, le chiffre est déjà juste. Au montage, une fois par chargement de l'application et par chiffre (la clé),
 * le texte repart de zéro et monte en 0,4 s ; un retour sur la page ne le rejoue pas. Le texte final est toujours remis à la fin : un chiffre faux, même une image, est une faute.
 */
const JOUES = new Set<string>();
const DUREE_MS = 400;

export function Compteur({ cle, valeur }: { cle: string; valeur: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || JOUES.has(cle) || valeur === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const debut = performance.now();
    let image = 0;
    const pas = (maintenant: number) => {
      const x = Math.min(1, Math.max(0, (maintenant - debut) / DUREE_MS));
      el.textContent = fmt(Math.round(valeur * (1 - Math.pow(1 - x, 3))));
      if (x < 1) image = requestAnimationFrame(pas);
      else {
        el.textContent = fmt(valeur);
        JOUES.add(cle);
      }
    };
    el.textContent = fmt(0);
    image = requestAnimationFrame(pas);
    return () => {
      cancelAnimationFrame(image);
      el.textContent = fmt(valeur);
    };
  }, [cle, valeur]);
  return (
    <span ref={ref} suppressHydrationWarning>
      {fmt(valeur)}
    </span>
  );
}
