"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * UNE BANDE COLLANTE QUI CONDUIT : le comportement, écrit une fois.
 *
 * Les titres l'ont d'abord eu pour leurs sections, les fonds le veulent pour
 * leurs groupes. Ce sont deux barres différentes à l'écran — l'une porte des
 * sections fixes avec leurs comptes, l'autre des sociétés de gestion ou des
 * dépositaires — mais c'est le même comportement, et c'est lui qui a coûté
 * cher à régler. Il vit donc ici, et les deux barres l'appellent.
 *
 * DEUX CHOSES, PAS UNE DE PLUS.
 *
 *  - CE QU'ON LIT S'ÉCLAIRE TOUT SEUL : le bloc dont le haut vient de passer
 *    sous la bande. Pas son titre : le titre est lui-même collant et reste
 *    épinglé tant que son bloc est à l'écran, ce qui donnait toujours le bloc
 *    PRÉCÉDENT.
 *  - LA TOUCHER Y CONDUIT, en posant le bloc juste SOUS la bande, ce qu'une
 *    ancre ordinaire ne fait pas : elle le glisse dessous.
 *
 * LE SAUT EST INSTANTANÉ, ET C'EST CE QUI LE REND JUSTE. Trois chemins ont été
 * mesurés le 4 octobre 2026 sur un saut de section :
 *
 *  - une cible calculée puis un glissement doux : on arrive 158 px trop haut,
 *    dans le bloc d'avant. La cible est mesurée à l'instant du clic, et la
 *    mise en page bouge pendant le voyage ;
 *  - « scrollIntoView » avec « scroll-margin-top » : régulier, mais 76 px trop
 *    bas, toujours dans le bloc d'avant ;
 *  - un défilement MESURÉ ET INSTANTANÉ : le bloc se pose exactement sous la
 *    bande, et il y reste.
 *
 * Le glissement doux n'était d'ailleurs pas un cadeau : d'un bout à l'autre
 * d'une liste il y a sept mille pixels, et les regarder défiler ne renseigne
 * personne.
 *
 * LA CONVENTION DU BLOC : il porte « aria-labelledby="sec-<clef>" ». C'est
 * déjà ce qu'un bloc doit écrire pour qu'un lecteur d'écran le nomme ; la
 * bande s'en sert comme d'une ancre, sans rien demander de plus.
 */
export const blocDe = (clef: string): HTMLElement | null => document.querySelector<HTMLElement>(`[aria-labelledby="sec-${CSS.escape(clef)}"]`);

export function useSommaire(clefs: string[], bar: RefObject<HTMLElement | null>, actif = true): { enVue: string | undefined; conduire: (clef: string) => void } {
  const [vu, setEnVue] = useState<string | undefined>(undefined);
  /* RIEN N'EST « EN VUE » QUAND LA BANDE NE CONDUIT PAS, et cela se DÉDUIT :
     l'effet remettait l'état à vide, ce qui est un rendu de plus pour une
     valeur qu'on savait déjà. */
  const enVue = actif ? vu : undefined;
  const repere = clefs.join("\u0000");

  useEffect(() => {
    if (!actif) return;
    const liste = repere ? repere.split("\u0000") : [];
    let prevu = false;
    const juger = () => {
      prevu = false;
      const bas = bar.current?.getBoundingClientRect().bottom ?? 0;
      let courante: string | undefined = undefined;
      for (const c of liste) {
        const bloc = blocDe(c);
        if (!bloc) continue;
        const r = bloc.getBoundingClientRect();
        /* HUIT, ET NON QUATRE : le saut pose le bloc à quatre pixels sous la
           bande, exactement la limite. Un dixième de pixel d'arrondi suffisait
           alors à ce que le bloc visé ne s'allume pas. */
        if (r.top <= bas + 8 && r.bottom > bas) courante = c;
      }
      setEnVue(courante);
    };
    const onScroll = () => {
      if (prevu) return;
      prevu = true;
      requestAnimationFrame(juger);
    };
    juger();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [repere, actif, bar]);

  /* LA PASTILLE ÉCLAIRÉE RESTE VISIBLE, et la barre seule bouge.
     « scrollIntoView » a été essayé et retiré : avec « block: nearest » il
     déplace aussi la PAGE quand il juge la barre mal cadrée, et il le fait
     pendant que le doigt défile. C'était le tremblement signalé. On écrit donc
     « scrollTo({ left })  », qui ne touche qu'à l'axe horizontal de la barre. */
  useEffect(() => {
    const b = bar.current;
    if (!enVue || !b) return;
    const el = b.querySelector<HTMLElement>(`[data-section="${CSS.escape(enVue)}"]`);
    if (!el) return;
    const marge = 12;
    const gauche = el.offsetLeft - marge;
    const droite = el.offsetLeft + el.offsetWidth + marge - b.clientWidth;
    if (gauche < b.scrollLeft) b.scrollTo({ left: gauche, behavior: "smooth" });
    else if (droite > b.scrollLeft) b.scrollTo({ left: droite, behavior: "smooth" });
  }, [enVue, bar]);

  const conduire = (clef: string) => {
    const bloc = blocDe(clef);
    const bande = bar.current;
    if (!bloc || !bande) return;
    /* « instant » EXPLICITE, ET NON « auto ». La page déclare
       « scroll-behavior: smooth » : « auto » veut dire « ce que dit le CSS »,
       donc un glissement, pendant lequel toute mesure est fausse. C'est ce qui
       faisait varier l'atterrissage de −3743 à +624 selon le moment où l'on
       regardait. */
    window.scrollBy({ top: bloc.getBoundingClientRect().top - bande.getBoundingClientRect().bottom - 4, behavior: "instant" });
  };

  return { enVue, conduire };
}
