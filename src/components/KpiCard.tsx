"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { useState } from "react";
import { Sheet } from "./mobile/Sheet";
import type { KpiExplanation } from "@/lib/domain/explain";
import { getRegistry, lessonForTerm } from "@/lib/registry";
import styles from "./KpiCard.module.css";

/**
 * A rate card that opens on tap: the number decomposed with this line's figures, what it leaves out, the definition, and the lesson.
 *
 * LA BULLE S'OUVRE AU MILIEU DE L'ÉCRAN, FERMÉE D'UN GESTE DU DOIGT (8 novembre 2026) : c'était une feuille du bas sur téléphone et un panneau flottant sur
 * ordinateur, écrits ici sans le « Sheet » partagé. C'est maintenant la fenêtre centrée de la maison (voile, croix, tiré vers le bas), comme toute bulle
 * d'information (skill guichet-espace-tuiles, « Les bulles d'information »).
 */
export function KpiCard({ label, value, gold, explain, compareHref, coach }: { label: string; value: string; gold?: boolean; explain?: KpiExplanation; compareHref?: string; coach?: string }) {
  const [open, setOpen] = useState(false);

  const t = useT();
  const term = explain?.term ? getRegistry().glossary[explain.term] : undefined;
  const lesson = explain?.term ? lessonForTerm(explain.term) : undefined;

  return (
    <>
      <button type="button" className={`${styles.card} ${gold ? styles.gold : ""}`} onClick={() => explain && setOpen(true)} aria-haspopup={explain ? "dialog" : undefined} data-coach={coach} disabled={!explain}>
        <span className={styles.label}>
          {t(label)}
          {explain && <i aria-hidden="true">?</i>}
        </span>
        {/* La valeur est presque toujours un nombre, que t() rend tel quel.
            Mais « 178 jours » ou « 2 ans et 11 mois » en est une aussi, et la
            carte traduisait son étiquette en laissant sa valeur en français. */}
        <b className="num">{typeof value === "string" ? t(value) : value}</b>
      </button>
      {explain && (
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          title={t(explain.title)}
          centre
          foot={
            (lesson || compareHref) && (
              <div className={styles.foot}>
                {lesson && (
                  <Link className="btn sm primary" href={`/info/${lesson.key}`}>
                    {t("Éclairage :")} {t(lesson.title)}
                  </Link>
                )}
                {compareHref && (
                  <Link className="btn sm ghost" href={compareHref}>
                    {t("Comparer")}
                  </Link>
                )}
              </div>
            )
          }
        >
          <div className={styles.big}>{value}</div>
          <dl className={styles.lines}>
            {explain.lines.map(([k, v], i) => (
              <div key={i} className={i === explain.lines.length - 1 ? styles.last : undefined}>
                <dt>{t(k)}</dt>
                <dd>{t(v)}</dd>
              </div>
            ))}
          </dl>
          {term && (
            <p className={styles.def}>
              <b>{term.long ? `${t(term.short)} : ${t(term.long)}` : t(term.short)}.</b> {t(term.text)}
            </p>
          )}
          <ul className={styles.caveats}>
            {explain.caveats.map((c, i) => (
              <li key={i}>{t(c)}</li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  );
}
