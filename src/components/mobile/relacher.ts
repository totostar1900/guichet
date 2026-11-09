/**
 * LE RELÂCHEMENT D'UNE FEUILLE OU D'UNE FENÊTRE TIRÉE (9 novembre 2026, planche « Gestes et feuilles », 3A).
 *
 * Avant : au relâchement d'un tiré de plus de 80 px, on remettait la feuille à sa position ouverte (« transform = "" » avec sa transition), PUIS on la fermait : elle remontait un battement avant
 * de redescendre, c'était le rebond. Maintenant : une fermeture REPREND LÀ OÙ EST LE DOIGT. La feuille garde sa position et glisse vers le bord d'où elle est venue ; la durée suit la vitesse
 * du geste (160 à 300 ms, pour tenir dans les 300 ms de présence de `useSheetPresence`), la courbe est celle des feuilles mobiles (0,32 · 0,72 · 0 · 1) et ne dépasse jamais.
 * Un tiré trop court revient en place avec la même courbe.
 */
export const COURBE_DES_FEUILLES = "cubic-bezier(0.32, 0.72, 0, 1)";

export interface Geste {
  y0: number;
  dy: number;
  /** La dernière ordonnée et l'instant, pour la vitesse (px par ms). */
  last: number;
  t: number;
  v: number;
}

export function commencerLeGeste(y: number): Geste {
  return { y0: y, dy: 0, last: y, t: performance.now(), v: 0 };
}

/** Met à jour le déplacement et la vitesse ; renvoie le déplacement (≥ 0 dans le sens de la fermeture). */
export function suivreLeGeste(g: Geste, y: number, haut: boolean): number {
  const now = performance.now();
  const sens = haut ? -1 : 1;
  g.dy = Math.max(0, sens * (y - g.y0));
  g.v = (sens * (y - g.last)) / Math.max(1, now - g.t);
  g.last = y;
  g.t = now;
  return g.dy;
}

/**
 * Relâche : renvoie vrai si la feuille se ferme. Le déclenchement de la fermeture (`onClose`) est du ressort de l'appelant, APRÈS cet appel, pour que l'animation soit déjà posée.
 */
export function relacherLaFeuille(el: HTMLElement | null, g: Geste | null, opts: { haut?: boolean; centre?: boolean; classeDeGlissement: string }): boolean {
  const dy = g?.dy ?? 0;
  const v = g?.v ?? 0;
  if (!el) return dy > 80;
  el.classList.remove(opts.classeDeGlissement);
  const ferme = dy > 80 || v > 0.5;
  if (ferme) {
    const reste = Math.max(40, el.offsetHeight - dy);
    const ms = Math.round(Math.min(300, Math.max(160, reste / Math.max(0.6, v || 1))));
    el.style.transition = `transform ${ms}ms ${COURBE_DES_FEUILLES}, opacity ${ms}ms linear`;
    el.style.transform = opts.centre ? `translate(-50%, calc(-50% + 55vh))` : opts.haut ? "translateY(-105%)" : "translateY(105%)";
    if (opts.centre) el.style.opacity = "0";
    return true;
  }
  el.style.transition = `transform 0.3s ${COURBE_DES_FEUILLES}`;
  el.style.transform = "";
  window.setTimeout(() => {
    el.style.transition = "";
  }, 320);
  return false;
}
