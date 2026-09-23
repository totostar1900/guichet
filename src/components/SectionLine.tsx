"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { loadGuideIndex, readDoneLessons } from "@/lib/guide-index-client";
import { Sheet } from "./mobile/Sheet";
import styles from "./SectionLine.module.css";

/**
 * On the phone, the row of chapter chips that used to slide under the header
 * is one line instead: « Sur cette page · Huit leçons courtes · 2 / 6 » and a
 * chevron, a thin rail of one segment per chapter underneath. Nothing is
 * hidden off-screen, the place is said in words, one wide target. A tap opens
 * the numbered list in a sheet: passed chapters ticked, the current one
 * marked « ici », « Section suivante » at the foot. The parcours passes each
 * section's letter and colour, and its key so the line can say how many of
 * its lessons are read.
 */
export interface SectionItem {
  id: string;
  title: string;
  letter?: string; // "A" … "F" on the parcours
  color?: string;
  section?: string; // the section's key in the guide index: shows « n / m lues »
}

export function SectionLine({ chapters, active, label, pageTitle, foot }: { chapters: SectionItem[]; active: string | null; label?: string; pageTitle?: string; /** une rangée que la page ajoute sous « Haut de page » et « Section suivante » */ foot?: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  // La feuille tombe sous cette ligne, et la ligne n'est gelée en haut de l'écran
  // qu'une fois la page défilée : son bas se mesure à l'ouverture, pas en CSS.
  const wrap = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<number | undefined>(undefined);
  const raise = () => {
    if (open) return setOpen(false);
    // Une ligne qu’une page cache (le Guide a sa propre pastille) ne mesure rien :
    // sans point d’accroche la feuille remonte du bas, comme avant.
    const b = wrap.current?.getBoundingClientRect();
    setAnchor(b && b.bottom > 0 ? Math.round(b.bottom) : undefined);
    setOpen(true);
  };
  const [done, setDone] = useState<Record<string, [number, number]>>({});
  const withProgress = chapters.some((c) => c.section);
  useEffect(() => {
    if (!withProgress) return;
    let live = true;
    loadGuideIndex().then((i) => {
      if (!live) return;
      const read = readDoneLessons(i.lessons.map((l) => l.key));
      const out: Record<string, [number, number]> = {};
      for (const s of i.sections) {
        const ls = i.lessons.filter((l) => l.section === s.key);
        out[s.key] = [ls.filter((l) => read.includes(l.key)).length, ls.length];
      }
      setDone(out);
    });
    return () => {
      live = false;
    };
  }, [withProgress]);
  if (chapters.length === 0) return null;
  const idx = Math.max(0, chapters.findIndex((c) => c.id === active));
  const cur = chapters[idx];
  const next = chapters[idx + 1];
  const progress = (c: SectionItem) => (c.section && done[c.section] ? done[c.section] : undefined);
  const curProgress = progress(cur);
  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const top = () => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className={styles.wrap} ref={wrap}>
      <button type="button" className={styles.line} onClick={raise} aria-haspopup="dialog" aria-expanded={open} aria-label={`${label ?? t("Sur cette page")} : ${cur.title}, ${idx + 1} ${t("sur {n}", { n: chapters.length })}`}>
        {cur.letter ? (
          <span className={styles.letter} style={{ background: cur.color }}>
            {cur.letter}
          </span>
        ) : (
          <span className={styles.eyebrow}>{label ?? t("Sur cette page")}</span>
        )}
        <b>{cur.title.replace(/^[A-F] · /, "")}</b>
        <small>{curProgress ? t("{n} / {total} lues", { n: curProgress[0], total: curProgress[1] }) : `${idx + 1} / ${chapters.length}`}</small>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={styles.rail} aria-hidden="true">
        {chapters.map((c, i) => (
          <i key={c.id} className={i < idx ? styles.past : i === idx ? styles.here : undefined} style={i <= idx && c.color ? { background: c.color } : undefined} />
        ))}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} navy dock={anchor ? "under" : undefined} anchorTop={anchor} title={label ?? t("Sur cette page")} sub={pageTitle}>
        <ol className={styles.list}>
          {chapters.map((c, i) => {
            const p = progress(c);
            return (
              <li key={c.id}>
                <button type="button" className={`${styles.row} ${i === idx ? styles.rowHere : i < idx ? styles.rowPast : ""}`} onClick={() => go(c.id)} aria-current={i === idx ? "true" : undefined}>
                  <i style={c.color ? (i <= idx ? { background: c.color, borderColor: c.color, color: '#fff' } : { borderColor: c.color, color: c.color }) : undefined}>{c.letter ?? (i < idx ? "✓" : i + 1)}</i>
                  <span>{c.title.replace(/^[A-F] · /, "")}</span>
                  <small>{i === idx ? t("ici") : p ? `${p[0]} / ${p[1]}` : i < idx ? t("passée") : ""}</small>
                </button>
              </li>
            );
          })}
        </ol>
        <div className={styles.foot}>
          <button type="button" className={styles.top} onClick={top}>
            ↑ {t("Haut de page")}
          </button>
          {next ? (
            <button type="button" className={styles.next} onClick={() => go(next.id)}>
              {t("Section suivante")} ↓
            </button>
          ) : (
            <span className={`${styles.next} ${styles.off}`}>{t("Dernière section")}</span>
          )}
        </div>
        {foot && <div className={styles.extra}>{foot}</div>}
      </Sheet>
    </div>
  );
}
