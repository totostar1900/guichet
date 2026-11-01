/**
 * GARDER LA PLACE : CE QUI CHANGE DE HAUTEUR NE FAIT PAS SAUTER CE QUE LE DOIGT TIENT.
 *
 * Relevé le 1er novembre 2026 sur la fiche d'un fonds, à 390 px, page défilée de
 * 279 px : un clic sur « Chiffres » faisait descendre la barre d'onglets de 73 à
 * 334 px — 261 px de saut —, ramenait le défilement à 18 px et réduisait la page
 * de 1 123 à 862 px. Les volets n'ont pas la même hauteur ; la page se raccourcit,
 * le navigateur ramène le défilement, et l'élément qu'on vient de toucher part
 * sous le doigt. Même défaut à la bascule « Souscription / Rachat de parts » de
 * la page d'intention (la page passe de 844 à 877 px).
 *
 * LE REMÈDE EST DE NOTER OÙ ÉTAIT L'ÉLÉMENT, puis de défiler de l'écart une fois
 * le contenu changé. Quand la page est devenue trop courte pour qu'on puisse
 * défiler assez, la hauteur manquante — et seulement elle — est rendue au
 * conteneur : un vide sous un volet court, jamais un saut.
 */
export interface Repere {
  /** Position de l'élément dans la fenêtre, avant le changement. */
  top: number;
  /** Défilement de la page, avant le changement. */
  scrollY: number;
}

/** Ce qu'il faut faire après le changement : où défiler, et combien de hauteur rendre. */
export function correction(avant: Repere, topApres: number, scrollYApres: number, hauteurDocument: number, hauteurFenetre: number): { cible: number; ajout: number } {
  const cible = Math.max(0, Math.round(scrollYApres + (topApres - avant.top)));
  const maxi = Math.max(0, hauteurDocument - hauteurFenetre);
  return { cible, ajout: Math.max(0, cible - maxi) };
}

export function repere(el: Element | null): Repere | null {
  if (!el || typeof window === "undefined") return null;
  return { top: el.getBoundingClientRect().top, scrollY: window.scrollY };
}

/**
 * À appeler une fois le nouveau contenu posé, avant la peinture.
 *
 * LA HAUTEUR SE FAIT EN PLUSIEURS PASSES. Tant que le contenu est plus court
 * que la fenêtre, « scrollHeight » rend la hauteur de la FENÊTRE, pas celle du
 * contenu : un premier calcul sous-estime alors le manque (59 px mesurés sur la
 * fiche d'un fonds). Une fois la hauteur ajoutée, le contenu dépasse la fenêtre,
 * la mesure redevient juste, et la deuxième passe achève.
 */
export function restituer(avant: Repere | null, el: Element | null, conteneur: HTMLElement | null): void {
  if (!avant || !el || !conteneur || typeof window === "undefined") return;
  conteneur.style.minHeight = "";
  const { cible } = correction(avant, el.getBoundingClientRect().top, window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
  let minHeight = conteneur.offsetHeight;
  for (let passe = 0; passe < 4; passe++) {
    const manque = cible - Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (manque <= 0) break;
    minHeight += manque;
    conteneur.style.minHeight = `${minHeight}px`;
  }
  /* « instant », et non le défilement doux de la page : une animation lancée ici laisserait la barre glisser sous le doigt, ce que ce fichier existe pour éviter. */
  if (Math.abs(cible - window.scrollY) >= 1) window.scrollTo({ top: cible, left: 0, behavior: "instant" });
}
