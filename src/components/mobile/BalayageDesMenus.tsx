"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FEUILLE_OUVERTE } from "@/lib/ui/feuille-ouverte";
import { racineVoisine, sensEntre } from "@/lib/nav-ruban";
import { tic } from "@/lib/ui/haptique";

/**
 * LE BALAYAGE ENTRE LES MENUS (18 novembre 2026, planche « Statuts et mouvement », 3C, temps 1) : un balayage franc de côté passe à la racine voisine du ruban, avec le glissement
 * de l'autre sens et un tic. La page ne suit pas le doigt (c'est le temps 2, si le geste plaît).
 *
 * IL SE TAIT là où le geste est déjà pris : une zone qui défile de côté, une rangée à glissement, une courbe qu'on touche (`data-balayage-local`), un champ de saisie, une feuille
 * ouverte, et les 24 pixels des bords (le retour système). Il ne tient que si le geste est franc : au moins 35 % de la largeur (ou 60 px et vif), plus horizontal que vertical.
 */
const BORD = 24;

function geste(e: Element | null): boolean {
  for (let el: Element | null = e; el && el !== document.body; el = el.parentElement) {
    if (el.hasAttribute("data-balayage-local")) return true;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
    const s = getComputedStyle(el);
    if ((s.overflowX === "auto" || s.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 2) return true;
  }
  return false;
}

export function BalayageDesMenus() {
  const router = useRouter();
  const chemin = usePathname();
  useEffect(() => {
    let d: { x: number; y: number; t: number } | null = null;
    const debut = (e: TouchEvent) => {
      d = null;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX < BORD || t.clientX > window.innerWidth - BORD) return;
      if (document.querySelector(FEUILLE_OUVERTE)) return;
      if (geste(e.target as Element)) return;
      d = { x: t.clientX, y: t.clientY, t: Date.now() };
    };
    const fin = (e: TouchEvent) => {
      const g = d;
      d = null;
      if (!g || e.changedTouches.length === 0) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - g.x;
      const dy = t.clientY - g.y;
      const vite = Math.abs(dx) / Math.max(1, Date.now() - g.t) > 0.5;
      const franc = Math.abs(dx) >= window.innerWidth * 0.35 || (Math.abs(dx) >= 60 && vite);
      if (!franc || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      const vers = racineVoisine(chemin, dx < 0 ? 1 : -1);
      if (!vers) return;
      tic(8);
      router.replace(vers, { transitionTypes: sensEntre(chemin, vers) });
    };
    document.addEventListener("touchstart", debut, { passive: true });
    document.addEventListener("touchend", fin, { passive: true });
    return () => {
      document.removeEventListener("touchstart", debut);
      document.removeEventListener("touchend", fin);
    };
  }, [chemin, router]);
  return null;
}
