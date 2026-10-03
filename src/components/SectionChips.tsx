"use client";

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
 */
export function SectionChips({ sections, counts, selected, total, onChange }: { sections: Section[]; counts: Record<string, number>; selected?: Section; total: number; onChange: (s: Section | undefined) => void }) {
  const t = useT();
  return (
    <div className={styles.bar} role="group" aria-label={t("Sections")} data-coach="titres-sections">
      <button type="button" aria-pressed={!selected} className={!selected ? styles.on : undefined} onClick={() => onChange(undefined)}>
        {t("Tout")} <b>{total}</b>
      </button>
      {sections.map((s) => {
        const n = counts[s] ?? 0;
        return (
          <button key={s} type="button" aria-pressed={selected === s} className={`${selected === s ? styles.on : ""} ${n === 0 ? styles.empty : ""}`.trim() || undefined} onClick={() => onChange(selected === s ? undefined : s)} disabled={n === 0}>
            {t(SECTION_LABEL[s])} <b>{n}</b>
          </button>
        );
      })}
    </div>
  );
}
