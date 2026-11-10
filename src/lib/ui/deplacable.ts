"use client";

import { useCallback, useRef } from "react";

/**
 * UNE PASTILLE FLOTTANTE SE DÉPLACE À L'APPUI LONG (10 novembre 2026, planche « Pastilles flottantes », 2A).
 *
 * Un doigt posé 0,4 s sans bouger fait grossir la pastille ; elle suit alors le doigt, puis se range contre le bord le plus proche, à la hauteur lâchée. Un doigt qui bouge avant 0,4 s est un défilement : rien ne se déplace. Un appui long relâché sur place remet la pastille à sa place d'origine. La place est retenue sur l'appareil (téléphone seulement).
 */
const CLE = "guichet:pastilles";
const DELAI = 400;
const TAILLE = 34;
const MARGE = 12;

type Place = { cote: "g" | "d"; y: number };

function lire(): Record<string, Place> {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? "{}");
  } catch {
    return {};
  }
}
function ecrire(cle: string, place: Place | null) {
  try {
    const tout = lire();
    if (place) tout[cle] = place;
    else delete tout[cle];
    localStorage.setItem(CLE, JSON.stringify(tout));
  } catch {
    /* sans stockage, la pastille reprend sa place au prochain affichage */
  }
}
const telephone = () => window.matchMedia("(max-width: 760px)").matches;

function bornes() {
  const dock = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dock-h")) || 56;
  return { min: 72, max: window.innerHeight - dock - TAILLE - MARGE };
}
function poser(el: HTMLElement, place: Place) {
  const { min, max } = bornes();
  const top = Math.min(max, Math.max(min, place.y * window.innerHeight));
  el.style.top = `${top}px`;
  el.style.bottom = "auto";
  if (place.cote === "g") {
    el.style.left = `${MARGE}px`;
    el.style.right = "auto";
  } else {
    el.style.right = `${MARGE}px`;
    el.style.left = "auto";
  }
}
function remettre(el: HTMLElement) {
  for (const p of ["top", "bottom", "left", "right"]) el.style.removeProperty(p);
}

/** Renvoie une référence à poser sur la pastille (« ref={deplacable} ») : elle suit l'élément quand il paraît et disparaît. */
export function useDeplacable(cle: string) {
  const nettoyage = useRef<(() => void) | null>(null);
  return useCallback(
    (el: HTMLElement | null) => {
      nettoyage.current?.();
      nettoyage.current = null;
      if (!el) return;
    const stockee = lire()[cle];
    if (stockee && telephone()) poser(el, stockee);
    const recadrer = () => {
      const p = lire()[cle];
      if (p && telephone()) poser(el, p);
      else remettre(el);
    };
    window.addEventListener("resize", recadrer);

    let minuteur = 0;
    let depart: { x: number; y: number } | null = null;
    let glisse = false;
    let bouge = false;
    let avale = false;

    const fin = () => {
      clearTimeout(minuteur);
      depart = null;
    };
    const down = (e: PointerEvent) => {
      if (!telephone() || (e.pointerType === "mouse" && e.button !== 0)) return;
      depart = { x: e.clientX, y: e.clientY };
      bouge = false;
      minuteur = window.setTimeout(() => {
        if (!depart) return;
        glisse = true;
        el.setPointerCapture?.(e.pointerId);
        el.style.scale = "1.12";
        navigator.vibrate?.(10);
      }, DELAI);
    };
    const move = (e: PointerEvent) => {
      if (!depart) return;
      const dx = e.clientX - depart.x;
      const dy = e.clientY - depart.y;
      if (!glisse) {
        if (Math.hypot(dx, dy) > 10) fin();
        return;
      }
      if (Math.hypot(dx, dy) > 10) bouge = true;
      el.style.left = `${e.clientX - TAILLE / 2}px`;
      el.style.top = `${e.clientY - TAILLE / 2}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
    };
    const up = (e: PointerEvent) => {
      const etait = glisse;
      clearTimeout(minuteur);
      depart = null;
      if (!etait) return;
      glisse = false;
      el.style.removeProperty("scale");
      avale = true;
      setTimeout(() => (avale = false), 60);
      if (!bouge) {
        remettre(el);
        ecrire(cle, null);
        return;
      }
      const place: Place = { cote: e.clientX < window.innerWidth / 2 ? "g" : "d", y: (e.clientY - TAILLE / 2) / window.innerHeight };
      poser(el, place);
      ecrire(cle, place);
    };
    const toucher = (e: TouchEvent) => {
      if (glisse && e.cancelable) e.preventDefault();
    };
    const menu = (e: Event) => {
      if (depart || glisse) e.preventDefault();
    };
    const clic = (e: Event) => {
      if (avale) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", fin);
    el.addEventListener("touchmove", toucher, { passive: false });
    el.addEventListener("contextmenu", menu);
    el.addEventListener("click", clic, true);
    nettoyage.current = () => {
      window.removeEventListener("resize", recadrer);
      clearTimeout(minuteur);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", fin);
      el.removeEventListener("touchmove", toucher);
      el.removeEventListener("contextmenu", menu);
      el.removeEventListener("click", clic, true);
    };
    },
    [cle],
  );
}
