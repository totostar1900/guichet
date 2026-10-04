"use client";

import { useRef } from "react";
import { useT } from "@/i18n/client";
import { useSommaire } from "@/lib/ui/sommaire";
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
 * LE COMPORTEMENT EST DANS « useSommaire » : la pastille qui s'éclaire toute
 * seule au défilement, et le saut qui pose le bloc juste sous la bande. Les
 * fonds ont la même bande pour leurs groupes, et ce qui a coûté cher à régler
 * ne doit exister qu'une fois. Ce fichier ne garde que ce qui est propre aux
 * sections.
 *
 * LE COMPTE EST SUR LA PASTILLE parce qu'il répond avant le saut :
 * « Institutions régionales 6 » dit s'il vaut la peine d'y aller.
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
  const { enVue, conduire } = useSommaire(sections, bar, !selected);

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
