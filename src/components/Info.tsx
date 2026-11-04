"use client";

import { useT } from "@/i18n/client";
import { useState } from "react";
import { Sheet } from "@/components/mobile/Sheet";
import type { TermKey } from "@/lib/glossary";
import { getRegistry, lessonForTerm } from "@/lib/registry";
import styles from "./Info.module.css";

/**
 * UN PETIT « i » QUI OUVRE SA BULLE AU MILIEU DE L'ÉCRAN (8 novembre 2026).
 *
 * LA RÈGLE DE LA MAISON : chaque bulle d'information s'ouvre AU MILIEU de l'écran, sur un voile, et se ferme d'un geste du doigt (tirer vers le bas), par la
 * croix ou en touchant à côté. Ce n'est plus une infobulle flèche posée près du « i » : elle se coupait sous un en-tête collant, sortait de l'écran sur un
 * téléphone et ne se fermait que d'un toucher précis. On réutilise la fenêtre centrée de la maison (« Sheet » « centre ») : même voile, même geste, même croix.
 * Exceptions voulues : le « i » de la barre du haut (sa feuille d'onglets) ; le reste est à discuter (voir le skill guichet-espace-tuiles, « Les bulles »).
 */
export function Info({ term, text, label, subtle }: { term?: TermKey; text?: string; label?: string; subtle?: boolean }) {
  const tr = useT();
  const t = term ? getRegistry().glossary[term] : undefined;
  const body = tr(text ?? t?.text ?? "");
  const title = label ? tr(label) : t ? ("long" in t && t.long ? `${tr(t.short)} : ${tr(t.long)}` : tr(t.short)) : "";
  const lesson = term ? lessonForTerm(term) : undefined;
  const [open, setOpen] = useState(false);
  /* Un clic dans la fenêtre remonte, en React, jusqu'au parent du « i » (une rangée-lien, un en-tête de colonne) : il s'arrête ici. */
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <span className={styles.wrap} onClick={stop} onTouchStart={stop}>
      <button
        type="button"
        className={`${styles.btn} ${subtle ? styles.subtle : ""} ${open ? styles.on : ""}`}
        aria-label={`${tr("Explication")} : ${title || tr("ce terme")}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        i
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title || tr("Explication")} centre>
        <p className={styles.texte}>{body}</p>
        {lesson && (
          <a className={styles.more} href={`/info/${lesson.key}`}>
            {tr("En savoir plus")} : {tr(lesson.title)} →
          </a>
        )}
      </Sheet>
    </span>
  );
}

/** Label followed by its bubble : for table headers, KPI titles, chart titles. */
export function Term({ term, children }: { term: TermKey; children?: React.ReactNode }) {
  return (
    <span className={styles.term}>
      {children ?? getRegistry().glossary[term]?.short}
      <Info term={term} />
    </span>
  );
}
