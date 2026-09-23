"use client";

import { useCallback, useRef } from "react";

/**
 * Valider une recherche referme le clavier et rend la liste.
 *
 * Au moment où l'on touche une suggestion, la frappe est finie et la lecture
 * commence. Mais le champ garde le focus, donc le téléphone garde son clavier,
 * donc la moitié basse de l'écran reste couverte : exactement là où vient de
 * s'afficher ce qu'on a demandé. Le web n'a pas de « masquer le clavier », il
 * n'a que le focus ; valider veut donc dire flouter.
 *
 * Trois précautions, chacune pour un piège vu de près :
 *
 * 1. On rend d'abord, on floute ensuite, à la frame suivante. Flouter dans le
 *    gestionnaire du toucher fait remonter la page pendant que le clic
 *    synthétique est encore en vol, et celui-ci atterrit sur ce qui a glissé
 *    sous le doigt, c'est-à-dire la première ligne du résultat.
 * 2. Le clavier ne se retire pas instantanément : la fenêtre visuelle grandit
 *    d'environ trois cent cinquante pixels un instant plus tard. On attend ce
 *    redimensionnement, avec une échéance de secours, avant de regarder si la
 *    liste est encore à portée du regard.
 * 3. Rien de tout cela sur un pointeur fin : sans clavier logiciel il n'y a pas
 *    d'occultation, et retirer le focus d'un champ gênerait qui navigue au
 *    clavier.
 */
export function useSearchCommit<I extends HTMLElement = HTMLInputElement, L extends HTMLElement = HTMLElement>() {
  const input = useRef<I | null>(null);
  const list = useRef<L | null>(null);

  const commit = useCallback((apply?: () => void) => {
    apply?.();
    if (typeof window === "undefined" || !window.matchMedia?.("(pointer: coarse)").matches) return;
    requestAnimationFrame(() => {
      const el = input.current;
      if (!el) return;
      el.blur();
      revealAfterKeyboard(list.current);
    });
  }, []);

  return { input, list, commit };
}

/** La liste revient sous les yeux une fois le clavier parti, et seulement si elle en était sortie. */
function revealAfterKeyboard(el: HTMLElement | null): void {
  if (!el) return;
  const look = () => {
    const b = el.getBoundingClientRect();
    const h = window.visualViewport?.height ?? window.innerHeight;
    // Déjà en vue : on ne bouge rien. Rien n'agace autant qu'une page qui saute sans raison.
    if (b.top >= 0 && b.top < h * 0.75) return;
    el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const vv = window.visualViewport;
  if (!vv) return void window.setTimeout(look, 250);
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    vv.removeEventListener("resize", once);
    look();
  };
  vv.addEventListener("resize", once);
  // Le clavier était peut-être déjà fermé : l'échéance de secours évite d'attendre un événement qui ne viendra pas.
  window.setTimeout(once, 400);
}
