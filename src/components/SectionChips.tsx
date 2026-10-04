"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { SECTION_LABEL, type Section } from "@/lib/domain/sections";
import styles from "./SectionChips.module.css";

/**
 * LA BANDE DES SECTIONS CONDUIT, ELLE NE FILTRE PAS.
 *
 * Elle a d'abord filtré, et le fichier portait l'argument : un saut laisse les
 * autres sections sous le pouce et on les retraverse, un filtre les retire.
 * L'argument valait pour une barre posée en haut de page, qu'on touche une
 * fois avant de lire. Il ne vaut plus pour une barre COLLANTE, qui reste sous
 * les yeux pendant toute la lecture : elle devient alors un sommaire, et un
 * sommaire conduit. Le filtrage, lui, reste là où sont les autres filtres, en
 * haut, dans leur feuille. Décidé le 4 octobre 2026.
 *
 * TROIS COMPORTEMENTS, PAS UN DE PLUS.
 *
 *  - LA PASTILLE SUIT LE DÉFILEMENT : celle de la section qu'on lit s'éclaire
 *    d'un filet, sans qu'on touche rien.
 *  - LA TOUCHER Y CONDUIT, en posant le titre juste SOUS la bande collante,
 *    ce qu'une ancre ordinaire ne fait pas : elle le glisse dessous.
 *  - LE COMPTE EST SUR LA PASTILLE parce qu'il répond avant le saut :
 *    « Institutions régionales 6 » dit s'il vaut la peine d'y aller.
 *
 * UNE SECTION VIDE RESTE VISIBLE, ÉTEINTE, AVEC SON ZÉRO : « En souscription 0 »
 * dit qu'aucune émission n'est ouverte, et la règle de la maison est que
 * l'absence se voie.
 *
 * « TOUT » N'APPARAÎT QUE SI L'ON EST FILTRÉ, c'est-à-dire arrivé par un lien
 * qui ne retient qu'une section : il n'y a alors plus rien où naviguer, et il
 * faut un moyen d'en sortir.
 */
export function SectionChips({ sections, counts, selected, total, onChange }: { sections: Section[]; counts: Record<string, number>; selected?: Section; total: number; onChange: (s: Section | undefined) => void }) {
  const t = useT();
  const bar = useRef<HTMLDivElement>(null);
  const [enVue, setEnVue] = useState<Section | undefined>(undefined);

  /* CE QUI EST « EN VUE » : la section dont le BLOC passe sous la bande. Pas
     son titre : le titre est lui-même collant et reste épinglé tant que sa
     section est à l'écran, ce qui donnait toujours la section PRÉCÉDENTE. */
  useEffect(() => {
    if (selected) return setEnVue(undefined);
    let prevu = false;
    const juger = () => {
      prevu = false;
      const bas = bar.current?.getBoundingClientRect().bottom ?? 0;
      let courante: Section | undefined = undefined;
      for (const s of sections) {
        const bloc = document.querySelector<HTMLElement>(`[aria-labelledby="sec-${s}"]`);
        if (!bloc) continue;
        const r = bloc.getBoundingClientRect();
        /* HUIT, ET NON QUATRE : le saut pose le bloc a quatre pixels sous la
           bande, exactement la limite. Un dixieme de pixel d arrondi suffisait
           alors a ce que la section visee ne s allume pas. */
        if (r.top <= bas + 8 && r.bottom > bas) courante = s;
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
  }, [sections, selected]);

  /* LA PASTILLE ÉCLAIRÉE RESTE VISIBLE, et la barre seule bouge.
     « scrollIntoView » a été essayé et retiré : avec « block: nearest » il
     déplace aussi la PAGE quand il juge la barre mal cadrée, et il le fait
     pendant que le doigt défile. C'était le tremblement signalé. On écrit
     donc « scrollLeft », qui ne touche qu'à l'axe horizontal de cette barre. */
  useEffect(() => {
    const b = bar.current;
    if (!enVue || !b) return;
    const el = b.querySelector<HTMLElement>(`[data-section="${enVue}"]`);
    if (!el) return;
    const marge = 12;
    const gauche = el.offsetLeft - marge;
    const droite = el.offsetLeft + el.offsetWidth + marge - b.clientWidth;
    if (gauche < b.scrollLeft) b.scrollTo({ left: gauche, behavior: "smooth" });
    else if (droite > b.scrollLeft) b.scrollTo({ left: droite, behavior: "smooth" });
  }, [enVue]);

  /**
   * LE SAUT EST INSTANTANÉ, ET C'EST CE QUI LE REND JUSTE.
   *
   * Trois chemins ont été mesurés le 4 octobre 2026, sur un saut vers
   * « Entreprises » :
   *
   *  - une cible calculée puis un glissement doux : on arrive 158 px trop
   *    haut, dans la section d'avant. La cible est mesurée à l'instant du
   *    clic, et la mise en page bouge pendant le voyage ;
   *  - « scrollIntoView » avec « scroll-margin-top » : régulier, mais 76 px
   *    trop bas, toujours dans la section d'avant ;
   *  - un défilement MESURÉ ET INSTANTANÉ : le bloc se pose exactement sous
   *    la bande, et il y reste.
   *
   * Le glissement doux n'était d'ailleurs pas un cadeau : d'un bout à l'autre
   * de la liste il y a sept mille pixels, et les regarder défiler ne renseigne
   * personne.
   */
  const conduire = (s: Section) => {
    const bloc = document.querySelector<HTMLElement>(`[aria-labelledby="sec-${s}"]`);
    const bande = bar.current;
    if (!bloc || !bande) return;
    /* « instant » EXPLICITE, ET NON « auto ». La page declare
       « scroll-behavior: smooth » : « auto » veut dire « ce que dit le CSS »,
       donc un glissement, pendant lequel toute mesure est fausse. C est ce
       qui faisait varier l atterrissage de -3743 a +624 selon le moment ou on
       regardait. */
    window.scrollBy({ top: bloc.getBoundingClientRect().top - bande.getBoundingClientRect().bottom - 4, behavior: "instant" });
  };

  return (
    <div ref={bar} className={styles.bar} role="group" aria-label={t("Sections")} data-coach="titres-sections">
      {selected && (
        <button type="button" className={styles.on} onClick={() => onChange(undefined)}>
          {t("Tout")} <b>{total}</b>
        </button>
      )}
      {sections.map((s) => {
        const n = counts[s] ?? 0;
        const ici = !selected && enVue === s;
        return (
          <button
            key={s}
            type="button"
            data-section={s}
            aria-current={ici || selected === s ? "true" : undefined}
            className={`${selected === s ? styles.on : ""} ${ici ? styles.ici : ""} ${n === 0 ? styles.empty : ""}`.trim() || undefined}
            onClick={() => (selected ? onChange(undefined) : conduire(s))}
            disabled={n === 0}
          >
            {t(SECTION_LABEL[s])} <b>{n}</b>
          </button>
        );
      })}
    </div>
  );
}
