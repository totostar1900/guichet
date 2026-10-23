"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * LA LIGNE QU'ON VIENT DE DÉSIGNER DOIT SE VOIR, ET SON REMPLACEMENT DOIT SE
 * SENTIR.
 *
 * Pointer un point du tracé fait monter sa ligne juste sous le nuage, au lieu
 * de quitter la page : les deux sont alors sous les yeux en même temps, ce qui
 * est tout l'objet du geste. Deux défauts le ruinaient.
 *
 *   LA CARTE PARAISSAIT HORS DE L'ÉCRAN. Elle se pose au-dessus de la liste,
 *   donc souvent au-dessus du point qu'on vient de toucher : qui avait
 *   descendu la page pour atteindre le nuage ne voyait rien arriver. Le geste
 *   répondait, l'écran restait muet, et l'on repointait le même point en
 *   croyant avoir manqué sa cible.
 *
 *   UN SECOND POINT NE SE VOYAIT PAS NON PLUS. Une seule épingle à la fois :
 *   la carte était donc remplacée SUR PLACE, au même endroit et de la même
 *   taille. Rien ne bougeait, et il fallait relire le nom pour savoir qu'on
 *   regardait une autre ligne.
 *
 * ─── Ce que cette pièce fait ───────────────────────────────────────────────
 *
 * ELLE AMÈNE LA CARTE SOUS LES YEUX, au plus court. « block: nearest » ne
 * déplace la page que de ce qu'il faut pour que la carte tienne entièrement à
 * l'écran : le tracé reste donc visible, ce qui serait perdu avec un
 * défilement qui recentre.
 *
 * ELLE MONTRE LE REMPLACEMENT PLUTÔT QUE DE L'OPÉRER. La carte sortante reste
 * le temps du mouvement, posée par-dessus, et s'efface vers le haut pendant
 * que l'entrante monte depuis le bas : on voit une ligne en remplacer une
 * autre, et la direction dit qu'il s'agit du même emplacement et non d'une
 * seconde carte.
 *
 * ELLE SE TAIT QUAND ON LUI DEMANDE. Sous « mouvement réduit », rien ne
 * glisse et le défilement ne s'anime pas : le remplacement reste lisible par
 * le seul changement de contenu, et c'est le choix du lecteur.
 */
const DUREE = 260;

export function AireEpinglee({ cle, children, className }: { cle: string; children: ReactNode; className?: string }) {
  const boite = useRef<HTMLDivElement>(null);
  /* Ce qui sort : gardé le temps du mouvement, et rien de plus. On garde le
     NŒUD, pas la clef : la carte sortante doit continuer d'afficher la ligne
     d'avant, et non celle qui arrive. */
  const [sortant, setSortant] = useState<ReactNode>(null);
  const precedent = useRef<{ cle: string; node: ReactNode }>({ cle, node: children });
  const premier = useRef(true);

  useEffect(() => {
    const avant = precedent.current;
    precedent.current = { cle, node: children };
    if (avant.cle === cle) return;

    const doux = typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Un remplacement seulement : la première épingle n'a rien à chasser, et
       lui faire jouer une sortie ferait clignoter une carte vide. */
    if (avant.cle && cle && doux) {
      setSortant(avant.node);
      const h = window.setTimeout(() => setSortant(null), DUREE);
      return () => window.clearTimeout(h);
    }
    setSortant(null);
  }, [cle, children]);

  useEffect(() => {
    /* AU MONTAGE, ON NE DÉFILE PAS. Arriver sur la page par un lien qui porte
       déjà une épingle ne doit pas arracher le lecteur du haut de la page :
       il n'a rien demandé, il vient de lire l'adresse. */
    if (premier.current) {
      premier.current = false;
      return;
    }
    if (!cle) return;
    const doux = typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Le temps que la carte soit peinte : mesurer une boîte qui n'existe pas
       encore ferait défiler vers sa position d'avant. */
    const h = window.requestAnimationFrame(() => {
      boite.current?.scrollIntoView({ behavior: doux ? "smooth" : "auto", block: "nearest", inline: "nearest" });
    });
    return () => window.cancelAnimationFrame(h);
  }, [cle]);

  return (
    <div ref={boite} className={className} data-aire-epinglee="" style={{ position: "relative" }}>
      {sortant && (
        <div data-epingle-sort="" aria-hidden="true">
          {sortant}
        </div>
      )}
      <div data-epingle-entre={sortant ? "" : undefined} key={cle}>
        {children}
      </div>
    </div>
  );
}
