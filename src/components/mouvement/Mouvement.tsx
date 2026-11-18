"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * LE MOUVEMENT DES PAGES (18 novembre 2026, planche « Statuts et dynamisme », 2A + 2B) : des arrivées courtes, TIRÉES AU HASARD dans une réserve, une fois par visite d'une page.
 *
 * Un élément porte `data-anim="bloc"`, `"montant"` ou `"courbe"` ; à son entrée dans l'écran il reçoit UNE animation de sa réserve, tirée au hasard. Ceux qui arrivent ensemble se
 * décalent de 70 ms (la cascade). Rien ne rejoue quand on revoit la page dans la même séance, rien ne bouge pour qui a demandé « réduire les animations » ou l'économiseur de données,
 * et rien ne touche à un chiffre contractuel : seuls les éléments marqués bougent, jamais un récapitulatif d'ordre, une signature ni un avis.
 *
 * LES ANIMATIONS SONT CELLES DU NAVIGATEUR (`element.animate`), jamais une classe ni un attribut posés sur un élément que React a rendu : ce serait écrire dans une page que React n'a pas
 * fini d'hydrater, et il refuse (« a tree hydrated but some attributes… didn't match »). Uniquement `transform`, `opacity`, `filter` et le tracé : aucune mise en page ne saute.
 */
type Image = Keyframe;
const STANDARD = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** La réserve : par genre, des arrivées nommées (images de départ, durée, courbe). La dernière image est toujours l'état normal de l'élément. */
export const RESERVES = {
  bloc: {
    monte: { de: { opacity: 0, transform: "translateY(14px)" }, ms: 500 },
    fond: { de: { opacity: 0 }, ms: 600 },
    "glisse-g": { de: { opacity: 0, transform: "translateX(-18px)" }, ms: 500 },
    "glisse-d": { de: { opacity: 0, transform: "translateX(18px)" }, ms: 500 },
    zoom: { de: { opacity: 0, transform: "scale(0.96)" }, ms: 500 },
    flou: { de: { opacity: 0, filter: "blur(4px)" }, ms: 550 },
  },
  montant: {
    pose: { de: { opacity: 0, transform: "translateY(8px)", filter: "blur(2px)" }, ms: 450 },
    tombe: { de: { opacity: 0, transform: "translateY(-10px)" }, ms: 450 },
    "zoom-doux": { de: { opacity: 0, transform: "scale(0.94)" }, ms: 450 },
  },
  courbe: {
    trace: { ms: 700 },
    "trace-rebond": { ms: 900, courbe: "cubic-bezier(0.34, 1.4, 0.64, 1)" },
    revele: { de: { clipPath: "inset(0 100% 0 0)" }, ms: 800 },
  },
} as const;
type Genre = keyof typeof RESERVES;

/** Le tirage : un nom de la réserve du genre, au hasard. */
export const tirer = (genre: Genre, hasard: () => number = Math.random): string => {
  const noms = Object.keys(RESERVES[genre]);
  return noms[Math.floor(hasard() * noms.length)];
};

const jouees = new Set<string>();
const animes = new WeakSet<Element>();
const PAS_MS = 70;
const PLAFOND_MS = 350;

function permis(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !c?.saveData;
}

function animer(el: HTMLElement, rang: number) {
  const genre = el.dataset.anim as Genre | undefined;
  if (!genre || !(genre in RESERVES) || animes.has(el)) return;
  animes.add(el);
  const delay = Math.min(rang * PAS_MS, PLAFOND_MS);
  const nom = tirer(genre);
  const r = (RESERVES[genre] as Record<string, { de?: Image; ms: number; courbe?: string }>)[nom];
  if (genre === "courbe" && !r.de) {
    /* Le tracé : la longueur réelle du trait, du vide au plein ; aucun attribut n'est posé sur le dessin. */
    el.querySelectorAll<SVGGeometryElement>("path, polyline").forEach((p) => {
      const L = p.getTotalLength?.() ?? 0;
      if (L > 0) p.animate([{ strokeDasharray: `${L}`, strokeDashoffset: L }, { strokeDasharray: `${L}`, strokeDashoffset: 0 }], { duration: r.ms, delay, easing: r.courbe ?? "ease-out", fill: "backwards" });
    });
    return;
  }
  el.animate([r.de as Image, {}], { duration: r.ms, delay, easing: r.courbe ?? STANDARD, fill: "backwards" });
}

export function Mouvement() {
  const chemin = usePathname();
  useEffect(() => {
    if (!permis() || jouees.has(chemin)) return;
    jouees.add(chemin);
    const tous = [...document.querySelectorAll<HTMLElement>("[data-anim]")];
    let rang = 0;
    const plusBas: HTMLElement[] = [];
    for (const el of tous) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) animer(el, rang++);
      else plusBas.push(el);
    }
    let lot = 0;
    const io = new IntersectionObserver(
      (entrees) => {
        lot = 0;
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          animer(e.target as HTMLElement, lot++);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.12 },
    );
    plusBas.forEach((el) => io.observe(el));
    /* Une page qui se remplit après coup (un bloc rendu à son tour) reçoit son mouvement elle aussi, un instant après. */
    const tard = setTimeout(() => {
      document.querySelectorAll<HTMLElement>("[data-anim]").forEach((el, i) => {
        if (animes.has(el)) return;
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) animer(el, i);
        else io.observe(el);
      });
    }, 500);
    return () => {
      io.disconnect();
      clearTimeout(tard);
    };
  }, [chemin]);
  return null;
}
