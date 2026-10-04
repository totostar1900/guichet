"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { SECTION_LABEL, type Section } from "@/lib/domain/sections";
import styles from "./SectionChips.module.css";

/**
 * LA BARRE DE SECTIONS EST LE FILTRE, ET NON UNE COMMANDE DE PLUS.
 *
 * La page portait déjà un filtre d'instrument, un tri, un groupement par
 * émetteur et une bascule primaire / secondaire. Ajouter une barre de
 * navigation à côté aurait fait une cinquième façon de réduire la même liste,
 * et c'est exactement le doublon corrigé ailleurs ce jour-là. Une pastille
 * touchée FILTRE donc, elle ne fait pas sauter : un saut d'ancre laisse les
 * autres sections sous le doigt et on les retraverse sans le vouloir, un
 * filtre les retire et le pouce arrive au bout.
 *
 * UNE SECTION VIDE RESTE VISIBLE, ÉTEINTE, AVEC SON ZÉRO. « En souscription 0 »
 * dit qu'aucune émission n'est ouverte ; une pastille cachée ne dit rien, et
 * la règle de la maison est que l'absence se voie.
 *
 * Ce sont de vraies cases à cocher dans un groupe nommé : un lecteur d'écran
 * les annonce avec leur compte et leur état, et le clavier les atteint sans
 * que nous ayons à écrire un seul raccourci.
 *
 * ---------------------------------------------------------------------------
 * CE QUE LE 4 OCTOBRE 2026 A AJOUTÉ, ET CE QU'IL N'A PAS TOUCHÉ.
 *
 * La barre colle désormais sous celle des lieux, et elle dit OÙ L'ON EST : en
 * parcourant la liste groupée, la section dont le titre vient de passer sous
 * les bandes s'éclaire, et la barre se décale pour la garder visible. C'est ce
 * qui manquait : les sections n'étaient que des titres dans le fil, qu'on
 * découvrait en tombant dessus.
 *
 * LA PASTILLE CONTINUE DE FILTRER. Le saut a été demandé et écarté : le motif
 * ci-dessus tient toujours, et il est mesurable — sauter laisse six sections
 * entre le pouce et le bas de la liste, filtrer n'en laisse aucune. Les deux
 * états se distinguent donc à l'œil : « vous êtes ici » est un filet sous le
 * nom, « c'est filtré » est la pastille entière en or.
 */
export function SectionChips({ sections, counts, selected, total, onChange }: { sections: Section[]; counts: Record<string, number>; selected?: Section; total: number; onChange: (s: Section | undefined) => void }) {
  const t = useT();
  const bar = useRef<HTMLDivElement>(null);
  const [enVue, setEnVue] = useState<Section | undefined>(undefined);

  /* CE QUI EST « EN VUE » : la dernière section dont le titre est passé sous
     les bandes collantes. Mesuré à chaque image plutôt que confié à un
     observateur d'intersection, parce que la hauteur collante CHANGE quand la
     bande des lieux se retire, et qu'un observateur règle sa marge une fois
     pour toutes. */
  useEffect(() => {
    if (selected) return setEnVue(undefined);
    let prevu = false;
    const juger = () => {
      prevu = false;
      const bas = bar.current?.getBoundingClientRect().bottom ?? 0;
      let courante: Section | undefined = undefined;
      for (const s of sections) {
        /* ON MESURE LA SECTION, PAS SON TITRE. Le titre est lui-meme collant :
           il reste epingle a quatre-vingt-six pixels tant que sa section est
           a l ecran, et ne remonte qu une fois passee. Le prendre pour repere
           donnait donc toujours la section PRECEDENTE, ce qui s est vu a
           trois hauteurs de defilement d affilee. Le bloc, lui, ne colle pas :
           il commence ou il commence et finit ou il finit. */
        const bloc = document.querySelector<HTMLElement>(`[aria-labelledby="sec-${s}"]`);
        if (!bloc) continue;
        const r = bloc.getBoundingClientRect();
        if (r.top <= bas + 4 && r.bottom > bas) courante = s;
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

  /* La pastille éclairée reste visible : la barre déborde sur un téléphone, et
     une section qu'on lit sans voir sa pastille ne dit rien. */
  useEffect(() => {
    if (!enVue) return;
    bar.current?.querySelector<HTMLElement>(`[data-section="${enVue}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [enVue]);

  return (
    <div ref={bar} className={styles.bar} role="group" aria-label={t("Sections")} data-coach="titres-sections">
      <button type="button" aria-pressed={!selected} className={!selected ? styles.on : undefined} onClick={() => onChange(undefined)}>
        {t("Tout")} <b>{total}</b>
      </button>
      {sections.map((s) => {
        const n = counts[s] ?? 0;
        const ici = !selected && enVue === s;
        return (
          <button
            key={s}
            type="button"
            data-section={s}
            aria-pressed={selected === s}
            aria-current={ici ? "true" : undefined}
            className={`${selected === s ? styles.on : ""} ${ici ? styles.ici : ""} ${n === 0 ? styles.empty : ""}`.trim() || undefined}
            onClick={() => onChange(selected === s ? undefined : s)}
            disabled={n === 0}
          >
            {t(SECTION_LABEL[s])} <b>{n}</b>
          </button>
        );
      })}
    </div>
  );
}
