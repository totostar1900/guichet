"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { estRacine } from "@/lib/nav-profondeur";

/**
 * LE MOUVEMENT DES PAGES (18 novembre 2026, planche « Statuts et dynamisme », 2A + 2B) : des arrivées courtes, TIRÉES AU HASARD dans une réserve, une fois par visite d'une page.
 *
 * Un élément porte `data-anim="bloc"`, `"montant"` ou `"courbe"` ; à son entrée dans l'écran il reçoit UNE animation de sa réserve, tirée au hasard. Ceux qui arrivent ensemble se
 * décalent de 70 ms (la cascade). Rien ne rejoue quand on revoit la page dans la même séance, rien ne bouge pour qui a demandé « réduire les animations » ou l'économiseur de données,
 * et rien ne touche à un chiffre contractuel : seuls les éléments marqués bougent, jamais un récapitulatif d'ordre, une signature ni un avis.
 *
 * LES SEPT RACINES (l'Accueil, l'Activité, Investir, le Marché, l'Aide…) ONT EN PLUS LEURS PIÈCES MARQUÉES PAR LA PAGE ELLE-MÊME (18 novembre 2026, le client : « des animations sur le défilement dans les 5 pages principales ainsi qu'à leur ouverture ») :
 * « cibles() » parcourt la page, descend dans tout bloc plus haut que l'écran, et retient chaque pièce (bloc, carte, rangée) qui n'est ni collante ni déjà marquée. Elles s'animent À CHAQUE OUVERTURE de la page
 * (les pièces du premier écran, en cascade), puis AU DÉFILEMENT, chacune à son entrée dans l'écran. Une rangée basse prend une arrivée douce (réserve « montant »), un grand bloc n'a jamais de flou (il coûterait cher sur un téléphone modeste).
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
export const tirer = (genre: Genre, hasard: () => number = Math.random, sans: readonly string[] = []): string => {
  const noms = Object.keys(RESERVES[genre]).filter((n) => !sans.includes(n));
  return noms[Math.floor(hasard() * noms.length)];
};

/** Un grand bloc ne reçoit ni flou ni zoom : ils recalculent trop de pixels pour peu d'effet. */
const SANS_POUR_LES_GRANDS = ["flou", "zoom"] as const;
const GRAND_PX = 300;
const RANGEE_PX = 140;

const animes = new WeakSet<Element>();
const PAS_MS = 70;
const PLAFOND_MS = 350;

function permis(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !c?.saveData;
}

/** Les pièces d'une page-racine : on descend dans un bloc plus haut que l'écran, on retient le reste. Aucune pièce collante, fixe ou déjà marquée, et aucune qui en contient une marquée. */
export function cibles(page: Element, haut = typeof window === "undefined" ? 800 : window.innerHeight): HTMLElement[] {
  const out: HTMLElement[] = [];
  const marque = (el: Element) => el.hasAttribute("data-anim") || Boolean(el.closest("[data-anim]")) || Boolean(el.querySelector("[data-anim]"));
  const marche = (el: HTMLElement, prof: number) => {
    for (const x of Array.from(el.children) as HTMLElement[]) {
      if (x.offsetHeight < 8 || x.hasAttribute("hidden")) continue;
      const pos = getComputedStyle(x).position;
      if (pos === "fixed" || pos === "sticky" || pos === "absolute") continue;
      /* On descend dans un bloc plus haut que l'écran, et dans une pile ou un groupe de chapitres : une pile est une page, pas une pièce. */
      if (x.children.length > 1 && prof < 4 && (x.offsetHeight > haut * 0.9 || /(^|\s)(pile|chapitres)(\s|$)/.test(x.className))) marche(x, prof + 1);
      else if (!marque(x)) out.push(x);
    }
  };
  marche(page as HTMLElement, 0);
  return out;
}

function animer(el: HTMLElement, rang: number, force?: Genre) {
  const genre = force ?? (el.dataset.anim as Genre | undefined);
  if (!genre || !(genre in RESERVES) || animes.has(el)) return;
  animes.add(el);
  const delay = Math.min(rang * PAS_MS, PLAFOND_MS);
  const nom = tirer(genre, Math.random, genre === "bloc" && el.offsetHeight > GRAND_PX ? SANS_POUR_LES_GRANDS : []);
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
    if (!permis()) return;
    const racine = estRacine(chemin);
    /* Les pièces à animer : celles que la page a marquées, et, sur une racine, celles que « cibles » trouve. Chacune garde son genre. */
    const genres = new Map<HTMLElement, Genre | undefined>();
    const recolter = () => {
      document.querySelectorAll<HTMLElement>("[data-anim]").forEach((el) => genres.set(el, undefined));
      const page = document.querySelector("main");
      if (racine && page) for (const el of cibles(page)) if (!genres.has(el)) genres.set(el, el.offsetHeight < RANGEE_PX ? "montant" : "bloc");
    };
    const io = new IntersectionObserver(
      (entrees) => {
        let lot = 0;
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          animer(el, lot++, genres.get(el));
          io.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    const lancer = () => {
      recolter();
      let rang = 0;
      for (const [el, genre] of genres) {
        if (animes.has(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) animer(el, rang++, genre);
        else io.observe(el);
      }
    };
    lancer();
    /* Une page qui se remplit après coup (un bloc rendu à son tour) reçoit son mouvement elle aussi, un instant après. */
    const tard = [setTimeout(lancer, 350), setTimeout(lancer, 1000)];
    return () => {
      io.disconnect();
      tard.forEach(clearTimeout);
    };
  }, [chemin]);
  return null;
}
