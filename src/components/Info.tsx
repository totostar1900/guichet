"use client";

import { useT } from "@/i18n/client";
import { useState } from "react";
import { Sheet } from "@/components/mobile/Sheet";
import { BoutonBrief } from "@/components/EnBref";
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
export function Info({ term, termes, text, label, subtle, titre }: { term?: TermKey; /** UN SEUL « i » POUR UN GRAPHE OU UN TABLEAU (6 novembre 2026) : tous les termes qu'il emploie, chacun avec sa définition, dans une seule fenêtre. */ termes?: TermKey[]; text?: string; label?: string; subtle?: boolean; /** Le « i » d'un titre de page : le même rond que celui des « En bref », à l'extrême droite de la ligne du titre (10 novembre 2026). */ titre?: boolean }) {
  const tr = useT();
  const t = term ? getRegistry().glossary[term] : undefined;
  const liste = (termes ?? []).flatMap((k) => {
    const g = getRegistry().glossary[k];
    return g ? [{ k, nom: "long" in g && g.long ? `${tr(g.short)} : ${tr(g.long)}` : tr(g.short), texte: tr(g.text), lecon: lessonForTerm(k) }] : [];
  });
  const body = tr(text ?? t?.text ?? "");
  const title = label ? tr(label) : t ? ("long" in t && t.long ? `${tr(t.short)} : ${tr(t.long)}` : tr(t.short)) : "";
  const lesson = term ? lessonForTerm(term) : undefined;
  const [open, setOpen] = useState(false);
  /* Un clic dans la fenêtre remonte, en React, jusqu'au parent du « i » (une rangée-lien, un en-tête de colonne) : il s'arrête ici. */
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <span className={styles.wrap} onClick={stop} onTouchStart={stop}>
      {titre ? (
        <BoutonBrief titre={`${tr("Explication")} : ${title || tr("ce terme")}`} coach="info-de-page" onClick={() => setOpen(true)} />
      ) : (
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
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={title || tr("Explication")} centre>
        {liste.length > 0 ? (
          <dl className={styles.termes}>
            {liste.map((e) => (
              <div key={e.k}>
                <dt>{e.nom}</dt>
                <dd>
                  {e.texte}
                  {e.lecon && (
                    <>
                      {" "}
                      <a className={styles.lien} href={`/info/${e.lecon.key}`}>
                        {tr("En savoir plus")} →
                      </a>
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={styles.texte}>{body}</p>
        )}
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
