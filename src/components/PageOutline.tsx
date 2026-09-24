"use client";

import { useEffect, useState } from "react";
import { SectionLine, type SectionItem } from "./SectionLine";
import styles from "./PageOutline.module.css";

/**
 * « Sur cette page » : les sections de la page ouverte, celle qu'on lit
 * marquée au défilement.
 *
 * Le même outil existait au desk, sur la documentation ; les pages publiques
 * n'en avaient pas, et les longues (l'indice, le Guide) se parcourent mal sans
 * lui. Sur ordinateur c'est un rail à droite ; sur téléphone, la ligne
 * « Sur cette page » qui ouvre la liste en feuille, parce qu'une liste
 * déroulante cacherait la structure derrière une touche au lieu de la montrer.
 *
 * Ce rail ne porte que les sections de la page. Les liens que la page cite
 * restent dans le texte, où la phrase dit pourquoi on les suivrait.
 *
 * `foot` : une rangée que la page ajoute au bas de sa feuille, sous « Haut de
 * page » et « Section suivante ». Sur un téléphone, cette feuille est la
 * seule chose de la page qu'on atteigne d'un geste depuis n'importe quelle
 * hauteur ; ce qui doit rester à portée y a sa place, et nulle part ailleurs.
 */
export function PageOutline({ sections, label, meta, foot }: { sections: SectionItem[]; label: string; meta?: React.ReactNode; foot?: React.ReactNode }) {
  const active = useActiveSection(sections.map((s) => s.id));
  if (sections.length < 2) return null;
  return (
    <>
      <nav className={`${styles.rail} rail-y`} aria-label={label}>
        <span className={styles.label}>{label}</span>
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={s.id === active ? "true" : undefined}>
            {s.title}
          </a>
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
