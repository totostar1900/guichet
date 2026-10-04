"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * « LA BARRE EST-ELLE PASSÉE SOUS L'EN-TÊTE ? »
 *
 * C'est le signal des deux boutons flottants d'une liste : celui qui ramène
 * aux filtres, à gauche, et celui qui remonte en haut, à droite. Ils
 * répondaient à deux questions différentes — l'un guettait la barre d'outils,
 * l'autre comptait les pixels défilés (quatre cinquièmes d'écran) — donc ils
 * ne paraissaient pas ensemble : l'un arrivait, puis l'autre, et le coin de
 * l'écran changeait deux fois. Signalé à l'écran le 5 octobre 2026.
 *
 * Une seule question, posée une fois, et les deux y répondent en même temps.
 * L'en-tête du site couvre les soixante premiers pixels : la barre est
 * « passée » quand elle est dessous.
 */
export function usePasse(watch: RefObject<HTMLElement | null>): boolean {
  const [passe, setPasse] = useState(false);
  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPasse(!e.isIntersecting && e.boundingClientRect.bottom < 60), { rootMargin: "-60px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [watch]);
  return passe;
}
