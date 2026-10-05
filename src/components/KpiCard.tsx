"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useVerrouDeDefilement } from "./mobile/verrou-defilement";
import type { KpiExplanation } from "@/lib/domain/explain";
import { getRegistry, lessonForTerm } from "@/lib/registry";
import styles from "./KpiCard.module.css";

/**
 * A rate card that opens on tap: the number decomposed with this line's
 * figures, what it leaves out, the definition, and the lesson. A bottom sheet
 * on a phone, a popover next to the card on a desktop.
 */
export function KpiCard({ label, value, gold, explain, compareHref, coach }: { label: string; value: string; gold?: boolean; explain?: KpiExplanation; compareHref?: string; coach?: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      if (!btn.current) return;
      const r = btn.current.getBoundingClientRect();
      const w = Math.min(380, window.innerWidth - 24);
      setPos({ top: r.bottom + 8, left: Math.max(12, Math.min(window.innerWidth - w - 12, r.left)) });
    };
    place();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  /* LA PAGE NE DÉFILE PAS DERRIÈRE CETTE CARTE. Au téléphone c'est une feuille
     du bas comme les autres, mais écrite ici plutôt qu'avec le Sheet
     partagé : elle n'avait donc reçu aucun des deux correctifs du 4 octobre
     2026. Et sur un écran large le panneau est placé une fois pour toutes
     d'après la position du bouton : la page qui défile derrière le laissait
     flotter là où la carte n'était plus. */
  useVerrouDeDefilement(open);

  const t = useT();
  const term = explain?.term ? getRegistry().glossary[explain.term] : undefined;
  const lesson = explain?.term ? lessonForTerm(explain.term) : undefined;

  return (
    <>
      <button ref={btn} type="button" className={`${styles.card} ${gold ? styles.gold : ""}`} onClick={() => explain && setOpen(true)} aria-haspopup={explain ? "dialog" : undefined} data-coach={coach} disabled={!explain}>
        <span className={styles.label}>
          {t(label)}
          {explain && <i aria-hidden="true">?</i>}
        </span>
        {/* La valeur est presque toujours un nombre, que t() rend tel quel.
            Mais « 178 jours » ou « 2 ans et 11 mois » en est une aussi, et la
            carte traduisait son étiquette en laissant sa valeur en français. */}
        <b className="num">{typeof value === "string" ? t(value) : value}</b>
      </button>
      {open &&
        explain &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className={styles.scrim} onClick={() => setOpen(false)} aria-hidden="true" />
            <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={t(explain.title)} style={pos ? ({ ["--top" as string]: `${pos.top}px`, ["--left" as string]: `${pos.left}px` } as React.CSSProperties) : undefined}>
              <div className={styles.grab} aria-hidden="true" />
              <div className={styles.head}>
                <b>{t(explain.title)}</b>
                <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label={t("Fermer")}>
                  ✕
                </button>
              </div>
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
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
