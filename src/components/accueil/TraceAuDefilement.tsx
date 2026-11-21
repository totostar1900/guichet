"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * LE DESSIN SUIT LE DOIGT (21 novembre 2026, planche « Accueil », choix 3A : « la carte, moins intense, dessinée avec le défilement de la page »).
 *
 * Le tracé n'est plus joué une fois à l'entrée dans l'écran : il est LIÉ À LA POSITION de la page. Il avance quand on descend, il recule quand on remonte, et les six pays se tracent l'un après l'autre. Le trait va de 0 à 1 de l'entrée de l'écran (par le bas) jusqu'à 90 % de sa traversée ; l'écran de la carte fait deux écrans et demi de haut (« .longue » dans Accueil.module.css), si bien que le tracé se fait à la vitesse du doigt, et non dans l'arrêt automatique.
 *
 * Le contenu est rendu ENTIER par le serveur : sans script, ou avec « moins de mouvement » demandé au téléphone, la carte reste entière et fixe. Une seule lecture de position par image (requestAnimationFrame), des écouteurs passifs.
 */
const borne = (v: number) => Math.min(1, Math.max(0, v));

export function TraceAuDefilement({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const traits = [...el.querySelectorAll<SVGPathElement>("path[data-trait]")];
    const ecran = el.closest("section") ?? el;
    let image = 0;
    const majour = () => {
      image = 0;
      const r = ecran.getBoundingClientRect();
      /* De l'entrée de l'écran par le bas jusqu'à 90 % de sa traversée : un écran haut comme le téléphone s'achève à son arrêt, un écran plus haut s'achève au défilement. */
      const p = borne((window.innerHeight - r.top) / (Math.max(r.height, window.innerHeight) * 0.9));
      traits.forEach((t, i) => {
        const q = borne(p * 1.7 - i * 0.14);
        t.style.strokeDashoffset = String(1 - q);
        t.style.fillOpacity = String(q);
      });
    };
    const demander = () => {
      if (!image) image = requestAnimationFrame(majour);
    };
    majour();
    window.addEventListener("scroll", demander, { passive: true, capture: true });
    window.addEventListener("resize", demander, { passive: true });
    return () => {
      window.removeEventListener("scroll", demander, { capture: true });
      window.removeEventListener("resize", demander);
      if (image) cancelAnimationFrame(image);
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
