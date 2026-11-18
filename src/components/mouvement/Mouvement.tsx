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
 * TOUTES LES PAGES LES REÇOIVENT, hors celles qui portent un engagement (18 novembre 2026, le client : « sur toutes les pages » ; d'abord sur les sept racines) : « cibles() » parcourt la page, descend dans tout bloc
 * plus haut que l'écran et dans toute pile, et retient chaque pièce (bloc, carte, rangée) qui n'est ni collante, ni fixe, ni déjà marquée. Elles s'animent À CHAQUE OUVERTURE de la page (les pièces du
 * premier écran, en cascade), puis AU DÉFILEMENT, chacune à son entrée dans l'écran. Une rangée basse prend une arrivée douce (réserve « montant »), un grand bloc n'a jamais de flou (il coûterait cher sur un
 * téléphone modeste). LES PAGES QUI ENGAGENT NE BOUGENT PAS (voir « PAGES_FIXES ») : saisie et récapitulatif d'un ordre, signature, mandat, virement, lecteur de document, desk.
 *
 * LES ANIMATIONS SONT CELLES DU NAVIGATEUR (`element.animate`), jamais une classe ni un attribut posés sur un élément que React a rendu : ce serait écrire dans une page que React n'a pas
 * fini d'hydrater, et il refuse (« a tree hydrated but some attributes… didn't match »). Uniquement `transform`, `opacity`, `filter` et le tracé : aucune mise en page ne saute.
 */
type Image = Keyframe;
const STANDARD = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
 * L'INTENSITÉ : UN SEUL NOMBRE RÈGLE LA DOUCEUR DE TOUT LE MOUVEMENT (18 novembre 2026, le client : « légèrement plus subtil » ; 0,65). Il multiplie chaque distance (px) et chaque écart d'échelle, à l'ouverture comme au défilement :
 * 1 redonne les valeurs d'origine, 0 supprime le déplacement. Pour régler au doigt sur un téléphone, on change ce nombre et rien d'autre.
 */
export const INTENSITE = 0.65;
const px = (n: number) => `${Math.round(n * INTENSITE * 10) / 10}px`;
const echelle = (e: number) => Math.round((1 - (1 - e) * INTENSITE) * 1000) / 1000;
/** La part des tirages qui prend l'effet dominant (le premier de la réserve) : le hasard reste, il agite moins. */
const PART_DOMINANTE = 0.7;

/** La réserve : par genre, des arrivées nommées (images de départ, durée, courbe). La dernière image est toujours l'état normal de l'élément. */
export const RESERVES = {
  bloc: {
    monte: { de: { opacity: 0, transform: `translateY(${px(14)})` }, ms: 500 },
    fond: { de: { opacity: 0 }, ms: 600 },
    "glisse-g": { de: { opacity: 0, transform: `translateX(${px(-18)})` }, ms: 500 },
    "glisse-d": { de: { opacity: 0, transform: `translateX(${px(18)})` }, ms: 500 },
    zoom: { de: { opacity: 0, transform: `scale(${echelle(0.96)})` }, ms: 500 },
    flou: { de: { opacity: 0, filter: `blur(${px(4)})` }, ms: 550 },
  },
  montant: {
    pose: { de: { opacity: 0, transform: `translateY(${px(8)})`, filter: `blur(${px(2)})` }, ms: 450 },
    tombe: { de: { opacity: 0, transform: `translateY(${px(-10)})` }, ms: 450 },
    "zoom-doux": { de: { opacity: 0, transform: `scale(${echelle(0.94)})` }, ms: 450 },
  },
  courbe: {
    trace: { ms: 700 },
    "trace-rebond": { ms: 900, courbe: "cubic-bezier(0.34, 1.4, 0.64, 1)" },
    revele: { de: { clipPath: "inset(0 100% 0 0)" }, ms: 800 },
  },
} as const;
type Genre = keyof typeof RESERVES;

/** Le choix dans une liste : l'effet dominant (le premier) à 70 %, les autres se partagent le reste. */
export const choisir = (noms: readonly string[], hasard: () => number = Math.random): string => {
  if (noms.length < 2) return noms[0];
  const h = hasard();
  if (h < PART_DOMINANTE) return noms[0];
  const autres = noms.slice(1);
  return autres[Math.min(autres.length - 1, Math.floor(((h - PART_DOMINANTE) / (1 - PART_DOMINANTE)) * autres.length))];
};

/** Le tirage : un nom de la réserve du genre, l'effet dominant en tête. */
export const tirer = (genre: Genre, hasard: () => number = Math.random, sans: readonly string[] = []): string => choisir(Object.keys(RESERVES[genre]).filter((n) => !sans.includes(n)), hasard);

/** Un grand bloc ne reçoit ni flou ni zoom : ils recalculent trop de pixels pour peu d'effet. */
const SANS_POUR_LES_GRANDS = ["flou", "zoom"] as const;
const GRAND_PX = 300;
const RANGEE_PX = 140;

/** Les pages où un chiffre ou un texte engage le client : rien n'y bouge, jamais. */
export const PAGES_FIXES: RegExp[] = [
  /^\/desk(\/|$)/,
  /^\/lire(\/|$)/,
  /^\/offres\/[^/]+\/intention/,
  /^\/moi\/ordres\/[^/]+/,
  /^\/moi\/prelevements\/(?!historique)[^/]+/,
  /^\/moi\/epargne\/nouvelle/,
  /^\/moi\/provision\/alimenter/,
  /^\/moi\/documents\/(?!argent|signes|demarches|operations)[^/]+/,
];
export const pageAnimee = (chemin: string): boolean => !PAGES_FIXES.some((r) => r.test(chemin));

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
      const enfants = x.children.length;
      /* Un simple emballage (un seul enfant) n'est pas une pièce : on le traverse. Le premier niveau est la page elle-même. */
      const emballage = enfants === 1 || (prof === 0 && enfants > 0);
      const groupe = /(^|\s)(pile|chapitres)(\s|$)/.test(x.className);
      if (prof < 8 && (emballage || (enfants > 1 && (groupe || (prof < 6 && x.offsetHeight > haut * 0.9))))) marche(x, prof + 1);
      else if (!marque(x)) out.push(x);
    }
  };
  marche(page as HTMLElement, 0);
  return out;
}

/** Le dernier instant où une pièce a joué : une pièce qui frôle le bord de l'écran ne rejoue pas en rafale. */
const dernier = new WeakMap<Element, number>();
const REPOS_MS = 600;

/**
 * L'ARRIVÉE AU DÉFILEMENT (18 novembre 2026, le client : « une animation à chaque défilement », puis « légèrement plus subtile » et « retirer l'effet à la remontée ») : une pièce rejoue son arrivée à CHAQUE ENTRÉE
 * DANS L'ÉCRAN EN DESCENDANT, d'en bas ; en remontant, rien ne bouge. Un grand bloc n'a ni zoom ni flou. Les distances sont celles d'origine, multipliées par l'INTENSITÉ.
 */
export const DEFILE = {
  bloc: {
    monte: () => ({ opacity: 0, transform: `translateY(${px(44)})` }),
    "monte-zoom": () => ({ opacity: 0, transform: `translateY(${px(32)}) scale(${echelle(0.94)})` }),
    glisse: (i: number) => ({ opacity: 0, transform: `translate(${px(i % 2 ? 30 : -30)}, ${px(22)})` }),
  },
  montant: {
    pose: () => ({ opacity: 0, transform: `translateY(${px(24)}) scale(${echelle(0.92)})` }),
    glisse: (i: number) => ({ opacity: 0, transform: `translate(${px(i % 2 ? 22 : -22)}, ${px(12)})` }),
  },
} as const;
const MS_DEFILE = 500;

function animer(el: HTMLElement, rang: number, force?: Genre, defile = false) {
  const genre = force ?? (el.dataset.anim as Genre | undefined);
  if (!genre || !(genre in RESERVES)) return;
  const maintenant = performance.now();
  if (maintenant - (dernier.get(el) ?? -1e9) < REPOS_MS) return;
  dernier.set(el, maintenant);
  const delay = Math.min(rang * PAS_MS, PLAFOND_MS);
  const grand = el.offsetHeight > GRAND_PX;
  if (defile && genre !== "courbe") {
    const reserve = (genre === "montant" ? DEFILE.montant : DEFILE.bloc) as Record<string, (i: number) => Image>;
    const noms = Object.keys(reserve).filter((n) => !(grand && n === "monte-zoom"));
    const nom = choisir(noms);
    el.animate([reserve[nom](rang), {}], { duration: MS_DEFILE, delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" });
    return;
  }
  const nom = tirer(genre, Math.random, genre === "bloc" && grand ? SANS_POUR_LES_GRANDS : []);
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
    const animee = pageAnimee(chemin);
    /* Les pièces à animer : celles que la page a marquées, et celles que « cibles » trouve. Chacune garde son genre. */
    const genres = new Map<HTMLElement, Genre | undefined>();
    const recolter = () => {
      if (animee) document.querySelectorAll<HTMLElement>("[data-anim]").forEach((el) => genres.set(el, undefined));
      const page = document.querySelector("main");
      if (animee && page) for (const el of cibles(page)) if (!genres.has(el)) genres.set(el, el.offsetHeight < RANGEE_PX ? "montant" : "bloc");
    };
    /* Le sens du geste : on descend, ou on remonte. Seule la descente anime : en remontant, les pièces reviennent sans mouvement. */
    let descend = true;
    let y = window.scrollY;
    const surDefilement = () => {
      const n = window.scrollY;
      if (n !== y) {
        descend = n > y;
        y = n;
      }
    };
    window.addEventListener("scroll", surDefilement, { passive: true });
    /* Chaque ENTRÉE dans l'écran, en descendant, rejoue l'arrivée de la pièce ; ce qui est déjà à l'écran à l'ouverture n'est pas rejoué par l'observateur. */
    const visible = new Map<HTMLElement, boolean>();
    const io = new IntersectionObserver(
      (entrees) => {
        let lot = 0;
        for (const e of entrees) {
          const el = e.target as HTMLElement;
          const avant = visible.get(el) ?? false;
          visible.set(el, e.isIntersecting);
          if (e.isIntersecting && !avant && descend) animer(el, lot++, genres.get(el), true);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -4% 0px" },
    );
    const ouverts = new WeakSet<HTMLElement>();
    const lancer = () => {
      recolter();
      let rang = 0;
      for (const [el, genre] of genres) {
        if (ouverts.has(el)) continue;
        ouverts.add(el);
        const r = el.getBoundingClientRect();
        const dans = r.bottom > 0 && r.top < window.innerHeight;
        visible.set(el, dans);
        if (dans) animer(el, rang++, genre);
        io.observe(el);
      }
    };
    lancer();
    /* Une page qui se remplit après coup (un bloc rendu à son tour) reçoit son mouvement elle aussi, un instant après. */
    const tard = [setTimeout(lancer, 350), setTimeout(lancer, 1000)];
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", surDefilement);
      tard.forEach(clearTimeout);
    };
  }, [chemin]);
  return null;
}
