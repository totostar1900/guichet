"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * CE QUI SE DESSINE SE LANCE QUAND ON LE VOIT (18 novembre 2026, le client : des icônes et un dessin « qui se dessinent progressivement »).
 *
 * Le contenu est rendu ENTIER par le serveur : sans script, ou avec « moins de mouvement » demandé au téléphone, rien ne se cache jamais.
 * Une fois la page chargée, on le MET EN ATTENTE (`data-pret`, avant la première image : pas de clignotement), puis l'observateur le LANCE (`data-vu`) la première fois qu'il est à moitié dans l'écran. Les feuilles de style de la vitrine lisent ces deux marques : « .trace[data-pret] » cache les traits, « .trace[data-vu] » les trace.
 * Une seule fois par visite de la page : le dessin reste entier ensuite.
 */
export function TraceSurVue({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    el.dataset.pret = "oui";
    const io = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          el.dataset.vu = "oui";
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
