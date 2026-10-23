"use client";

import { Fragment, useEffect, useState } from "react";
import { SectionLine, type SectionItem } from "./SectionLine";
import styles from "./PageOutline.module.css";

/**
 * « SUR CETTE PAGE » : LE SEUL SOMMAIRE DE SECTIONS DE LA MAISON.
 *
 * Il y en avait trois, et sept mises en page pour les poser. Inventaire du
 * 24 octobre 2026, mesuré page par page à 1440 px :
 *
 *   `RailSections`  Analyse du client, Analyses du desk   196 px · 212 px
 *   `InfoNav`       le Guide                              240 px
 *   `PageOutline`   indice, note, carnet, Marché du desk  196 px · 210 px
 *
 * Cinq largeurs, quatre seuils d'effacement (900, 1040, 1100, jamais), deux
 * côtés, et TROIS suivis de lecture écrits séparément — déjà divergents : l'un
 * désignait la section dont le haut avait passé le quart de l'écran, l'autre
 * le tiers. Aucune de ces différences n'était une décision.
 *
 * Ils n'en font plus qu'un. Ce qui a été gardé de chacun : la ligne « Sur
 * cette page » du téléphone (la seule réponse qu'un des trois avait pour un
 * écran étroit), et les deux ajouts du rail des Analyses — les familles, et le
 * compte de ce qui reste ouvert dans chacune.
 *
 * CE QUI A ÉTÉ PERDU, ET ASSUMÉ : les numéros de section du rail des Analyses.
 * Un numéro n'est pas le nom d'une section, et la feuille du téléphone les
 * numérote déjà là où la position compte — on y suit « 3 / 12 » parce qu'on
 * avance, alors qu'un rail se lit d'un coup d'œil.
 *
 * IL NE PORTE QUE LES SECTIONS DE LA PAGE. Les liens vers d'autres pages
 * restent dans le texte, où la phrase dit pourquoi on les suivrait, ou dans le
 * rail de la maison, qui est fait pour ça. Le Guide en avait six sous ses
 * sections, dont quatre que la colonne de gauche montrait au même moment.
 *
 * `foot` : une rangée que la page ajoute au bas de sa feuille, sous « Haut de
 * page » et « Section suivante ». Sur un téléphone, cette feuille est la
 * seule chose de la page qu'on atteigne d'un geste depuis n'importe quelle
 * hauteur ; ce qui doit rester à portée y a sa place, et nulle part ailleurs.
 */
export function PageOutline({ sections, label, meta, foot }: { sections: SectionItem[]; label: string; meta?: React.ReactNode; foot?: React.ReactNode }) {
  const active = useActiveSection(sections.map((s) => s.id));
  if (sections.length < 2) return null;
  /* Le groupe se décide avant le rendu : muter une variable pendant qu'on rend
     marche une fois et se détraque à la deuxième passe, et React le dit. */
  const ouvre = sections.map((s, i) => Boolean(s.groupe) && s.groupe !== sections[i - 1]?.groupe);
  return (
    <>
      <nav className={`${styles.rail} rail-y`} aria-label={label}>
        <span className={styles.label}>{label}</span>
        {sections.map((s, i) => (
          <Fragment key={s.id}>
            {ouvre[i] && <span className={styles.groupe}>{s.groupe}</span>}
            <a href={`#${s.id}`} aria-current={s.id === active ? "true" : undefined}>
              <span>{s.title}</span>
              {s.alerte ? <em className={styles.compte}>{s.alerte}</em> : null}
            </a>
          </Fragment>
        ))}
        {meta && <div className={styles.meta}>{meta}</div>}
      </nav>
      <div className={styles.phone}>
        <SectionLine chapters={sections} active={active} label={label} foot={foot} />
      </div>
    </>
  );
}

/** La section dont le titre a passé le tiers supérieur est celle qu'on lit. */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => Boolean(e));
    if (els.length === 0) return;
    const pick = () => {
      const line = Math.max(120, window.innerHeight * 0.3);
      let cur = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
      // Une dernière section trop courte pour hisser son titre jusqu'à la ligne
      // ne s'allumait jamais, quelque effort de défilement qu'on y mît. Arrivé
      // au bas de la page, c'est elle qu'on lit : il n'y a rien après.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) cur = els[els.length - 1].id;
      setActive(cur);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [ids.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  return active;
}
