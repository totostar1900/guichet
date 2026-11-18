"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import { FEUILLE_OUVERTE } from "@/lib/ui/feuille-ouverte";
import { racineVoisine, sensEntre } from "@/lib/nav-ruban";
import { tic } from "@/lib/ui/haptique";

/**
 * LE BALAYAGE ENTRE LES MENUS (18 novembre 2026, planche « Statuts et mouvement », 3C ; temps 2 le même jour, le client : « pas très fluide, il faut s'y reprendre à plusieurs fois, et on n'a pas de mouvement »).
 *
 * LA PAGE SUIT LE DOIGT. Dès que le geste est reconnu pour horizontal (10 px, plus de côté que de haut), le contenu de la page (« main », jamais les barres) se déplace avec lui ; aux deux bouts du ruban, où il n'y a pas de page voisine, il
 * résiste (le quart du déplacement, 40 px au plus). Un tic dit le moment où le geste est assez long ; relâché avant, la page revient en place d'un mouvement doux.
 *
 * IL TIENT POUR UN GESTE COURANT, pas pour un grand geste : au moins 22 % de la largeur, ou 40 px à 0,3 px/ms (un pouce qui glisse). Mesuré avant : un geste de 100 à 130 px en un quart de seconde ne passait presque jamais, il fallait 136 px
 * (35 %) ou 60 px à plus de 0,5 px/ms.
 *
 * LE NAVIGATEUR NE LE PREND PLUS : « touch-action: pan-y pinch-zoom » sur le contenu d'une racine (voir « globals.css ») laisse le défilement vertical et le zoom au navigateur et réserve le sens horizontal à ce geste, sans « pointercancel ». Les zones qui
 * défilent de côté (leur propre conteneur) gardent leur geste.
 *
 * IL SE TAIT là où le geste est déjà pris : une zone qui défile de côté, une rangée à glissement, une courbe qu'on touche (`data-balayage-local`), un champ de saisie, une feuille ouverte, et les 24 pixels des bords (le retour système).
 * Au toucher validé, la navigation part avec le glissement de l'autre sens (« nav-avant » / « nav-retour ») ; la page déplacée reste où le doigt l'a laissée jusqu'au changement de page, et la transition prend le relais sans saut.
 */
const BORD = 24;
const VERROU_PX = 10;
const PART_DE_LARGEUR = 0.22;
const MIN_PX = 40;
const VITESSE_PX_MS = 0.3;
const RESISTANCE = 0.25;
const RESISTANCE_MAX_PX = 40;
const RETOUR_MS = 220;

function geste(e: Element | null): boolean {
  for (let el: Element | null = e; el && el !== document.body; el = el.parentElement) {
    if (el.hasAttribute("data-balayage-local")) return true;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
    const s = getComputedStyle(el);
    if ((s.overflowX === "auto" || s.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 2) return true;
  }
  return false;
}

/** Le contenu de la page, que le doigt déplace. */
const contenu = () => document.querySelector<HTMLElement>("main");

/**
 * LE DÉBORDEMENT EST COUPÉ PENDANT LE GESTE. Une page tirée vers la droite sort de l'écran à droite : le document s'élargit, le navigateur change de largeur de vue et la transition de page est abandonnée (« Viewport size changed »),
 * sans que la navigation parte (mesuré : un balayage vers la droite ne passait pas, vers la gauche si). « overflow-x: clip » sur le « body » (par l'attribut « data-balayage » de « html » : le corps n'est pas à toucher à la main, voir « verrou-defilement ») coupe le dessin sans créer de conteneur de défilement (le parent de « main » est un « display: contents » : le couper ne ferait rien ; mesuré, le document passe de 490 à 390 px).
 */
const coupe = (el: HTMLElement | null, on: boolean) => {
  if (el) document.documentElement.toggleAttribute("data-balayage", on);
};

function place(el: HTMLElement | null, dx: number, doux: boolean) {
  if (!el) return;
  if (dx) coupe(el, true);
  el.style.transition = doux ? `transform ${RETOUR_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : "none";
  el.style.transform = dx ? `translateX(${Math.round(dx)}px)` : "";
  /* Le retour doux fini, le parent ne coupe plus rien. */
  if (!dx && doux) setTimeout(() => coupe(el, false), RETOUR_MS + 30);
}

function remetre(el: HTMLElement | null) {
  if (!el) return;
  el.style.transition = "";
  el.style.transform = "";
  coupe(el, false);
}

export function BalayageDesMenus() {
  const router = useRouter();
  const chemin = usePathname();

  /* LA PAGE REVIENT À SA PLACE AU CHANGEMENT DE PAGE, avant que la transition ne photographie la nouvelle : un effet de mise en page, et non un effet ordinaire. */
  useLayoutEffect(() => {
    remetre(contenu());
  }, [chemin]);

  useEffect(() => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Les deux racines voisines sont préparées d'avance : au toucher validé, la page arrive sans attendre. */
    for (const pas of [1, -1] as const) {
      const v = racineVoisine(chemin, pas);
      if (v) router.prefetch(v);
    }
    type Doigt = { x: number; y: number; t: number; verrou: "h" | "v" | null; dx: number; tic: boolean; vers: string | undefined };
    let d: Doigt | null = null;
    let reprise: ReturnType<typeof setTimeout> | undefined;

    const debut = (e: TouchEvent) => {
      d = null;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX < BORD || t.clientX > window.innerWidth - BORD) return;
      const cible = e.target as Element;
      const main = contenu();
      if (!main || !main.contains(cible)) return;
      if (document.querySelector(FEUILLE_OUVERTE)) return;
      if (geste(cible)) return;
      clearTimeout(reprise);
      remetre(main);
      d = { x: t.clientX, y: t.clientY, t: Date.now(), verrou: null, dx: 0, tic: false, vers: undefined };
    };

    const bouge = (e: TouchEvent) => {
      if (!d || d.verrou === "v" || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - d.x;
      const dy = t.clientY - d.y;
      if (!d.verrou) {
        if (Math.hypot(dx, dy) < VERROU_PX) return;
        d.verrou = Math.abs(dx) > Math.abs(dy) * 1.2 ? "h" : "v";
        if (d.verrou === "v") return;
      }
      d.dx = dx;
      d.vers = racineVoisine(chemin, dx < 0 ? 1 : -1);
      const assez = Math.abs(dx) >= window.innerWidth * PART_DE_LARGEUR;
      if (d.vers && assez && !d.tic) {
        d.tic = true;
        tic(6);
      } else if (!assez) d.tic = false;
      if (!reduit) place(contenu(), d.vers ? dx : Math.sign(dx) * Math.min(RESISTANCE_MAX_PX, Math.abs(dx) * RESISTANCE), false);
      /* Le défilement vertical ne doit pas partir pendant qu'on tire de côté. */
      if (e.cancelable) e.preventDefault();
    };

    const fin = (e: TouchEvent) => {
      const g = d;
      d = null;
      if (!g || g.verrou !== "h") return;
      const t = e.changedTouches[0];
      const dx = t ? t.clientX - g.x : g.dx;
      const vitesse = Math.abs(dx) / Math.max(1, Date.now() - g.t);
      const franc = Math.abs(dx) >= window.innerWidth * PART_DE_LARGEUR || (Math.abs(dx) >= MIN_PX && vitesse >= VITESSE_PX_MS);
      const vers = racineVoisine(chemin, dx < 0 ? 1 : -1);
      if (!franc || !vers) {
        place(contenu(), 0, true);
        return;
      }
      if (!g.tic) tic(8);
      router.replace(vers, { transitionTypes: sensEntre(chemin, vers) });
      /* Si la page ne change pas (réseau, erreur), elle revient à sa place plutôt que de rester décalée. */
      reprise = setTimeout(() => place(contenu(), 0, true), 2500);
    };

    const annule = () => {
      if (!d) return;
      const g = d;
      d = null;
      if (g.verrou === "h") place(contenu(), 0, true);
    };

    document.addEventListener("touchstart", debut, { passive: true });
    document.addEventListener("touchmove", bouge, { passive: false });
    document.addEventListener("touchend", fin, { passive: true });
    document.addEventListener("touchcancel", annule, { passive: true });
    return () => {
      document.removeEventListener("touchstart", debut);
      document.removeEventListener("touchmove", bouge);
      document.removeEventListener("touchend", fin);
      document.removeEventListener("touchcancel", annule);
      clearTimeout(reprise);
    };
  }, [chemin, router]);
  return null;
}
