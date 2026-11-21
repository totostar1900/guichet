import { MARCHE_PREFIXES, isMarcheSection } from "./nav-section";

/**
 * LA FAMILLE D'UNE PAGE, POUR SON ACCENT (21 novembre 2026, planche « Marché en bleu », 4A).
 *
 * Une seule famille aujourd'hui, « marché » : les six pages que la navigation range sous le siège Marché. Les adjudications ont quitté ce siège pour Instruments : elles gardent l'or. Le mot choisi par « ACCENTS » (src/lib/config.ts) dit de quelle couleur la famille se pose ; ce fichier dit seulement où elle commence et où elle finit.
 */
export type Famille = "marche";
const HORS_FAMILLE = ["/marche/adjudications"] as const;

export const familleDe = (chemin: string): Famille | null => {
  const p = chemin.split("?")[0];
  if (HORS_FAMILLE.some((h) => p.startsWith(h))) return null;
  return isMarcheSection(p) ? "marche" : null;
};

/** Le script du <head> : pose la famille avant la première image, pour qu'une page ouverte directement n'ait pas un instant d'or. Les préfixes viennent de la même table que la navigation. */
export const FAMILLE_BOOT = `(function(){try{var M=${JSON.stringify(MARCHE_PREFIXES)},X=${JSON.stringify(HORS_FAMILLE)},p=location.pathname,r=document.documentElement,f=null,i;for(i=0;i<X.length;i++)if(p.indexOf(X[i])===0)f="x";if(f===null)for(i=0;i<M.length;i++)if(p.indexOf(M[i])===0)f="marche";if(f==="marche")r.setAttribute("data-famille","marche");else r.removeAttribute("data-famille");}catch(e){}})();`;
